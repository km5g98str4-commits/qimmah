// Water Guardian — ESP32 firmware prototype (Arduino framework).
//
// Pipeline: TUF-2000M ─RS485/Modbus RTU─▶ UART2 ─▶ tuf_poll() ─▶ validity policy ─▶ RuleEngine ─▶
//           NVS persistence ─▶ (Wi-Fi) ─▶ Telegram / backend, with a local event buffer while offline.
//
// STATUS: compiles against the Arduino-ESP32 core (PlatformIO) but has NOT been run against a real
// TUF-2000M — that is exactly what Phase 7 (physical validation) is for. The Modbus layer can be
// exercised today against tools/virtual_tuf2000m.py over a USB-RS485 adapter or a socat pty pair.
#ifndef NATIVE_TEST
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <time.h>
#include "modbus_rtu.h"
#include "tuf2000m.h"
#include "rule_engine.h"
#if __has_include("config.h")
#include "config.h"
#else
#include "config.example.h"
#warning "Using include/config.example.h — copy it to include/config.h and set your credentials."
#endif

using namespace wg;

// ---------------- RS485 transport ----------------
static HardwareSerial& bus = Serial2;
static size_t bus_write(const uint8_t* d, size_t n, void*) {
  if (WG_RS485_DE_PIN >= 0) digitalWrite(WG_RS485_DE_PIN, HIGH);
  size_t w = bus.write(d, n); bus.flush();  // wait for TX to finish before releasing the driver
  if (WG_RS485_DE_PIN >= 0) digitalWrite(WG_RS485_DE_PIN, LOW);
  return w;
}
static size_t bus_read(uint8_t* b, size_t n, uint32_t timeoutMs, void*) {
  size_t got = 0; uint32_t t0 = millis();
  while (got < n && millis() - t0 < timeoutMs) { while (bus.available() && got < n) b[got++] = bus.read(); if (got < n) delay(1); }
  return got;
}
static void bus_flush(void*) { while (bus.available()) bus.read(); }
static MbTransport transport{bus_write, bus_read, bus_flush, nullptr};

// ---------------- state ----------------
static Rules rules;
static RuleEngine engine(rules);
static Preferences prefs;
static TufQualityPolicy qpol;
static uint32_t lastPoll = 0, lastPersist = 0, lastWifiAttempt = 0;
static bool wordOrderLowFirst = WG_WORD_ORDER_LOW_FIRST;
static Mode manualOverride = Mode::QUIET; static bool manualOverrideActive = false;
static uint32_t lastNotifiedIncident = 0;

// ---------------- persistence (NVS) ----------------
static void persist() { Persisted p; engine.save(p); prefs.putBytes("state", &p, sizeof(p)); }
static void restoreFromNvs() {
  Persisted p; size_t n = prefs.getBytesLength("state");
  if (n == sizeof(p) && prefs.getBytes("state", &p, sizeof(p)) == sizeof(p)) engine.restore(p);
}

// ---------------- schedule ----------------
static bool clockValid() { time_t now = time(nullptr); return now > 1700000000; }  // NTP synced (after Nov 2023)
static Mode scheduleMode() {
  if (!clockValid()) return Mode::QUIET;  // engine applies the conservative policy when clockValid=false
  time_t now = time(nullptr); struct tm lt; localtime_r(&now, &lt);
  int m = lt.tm_hour * 60 + lt.tm_min;
  static const int win[][2] = WG_OCCUPIED_WINDOWS;
  for (auto& w : win) if (m >= w[0] && m < w[1]) return Mode::PRAYER;
  return Mode::QUIET;
}

// ---------------- notifications ----------------
static bool httpPost(const String& url, const String& body, const char* contentType) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http; http.setTimeout(5000); http.begin(url); http.addHeader("Content-Type", contentType);
  int code = http.POST(body); http.end();
  return code >= 200 && code < 300;
}
static bool telegram(const String& text) {
  if (String(WG_TG_BOT_TOKEN).isEmpty()) return true;  // disabled → treat as delivered to the emulator (Serial)
  String url = String("https://api.telegram.org/bot") + WG_TG_BOT_TOKEN + "/sendMessage";
  String body = String("{\"chat_id\":\"") + WG_TG_CHAT_ID + "\",\"text\":" + "\"" + text + "\"}";
  return httpPost(url, body, "application/json");
}
static String jsonEscape(String s) { s.replace("\\", "\\\\"); s.replace("\"", "\\\""); s.replace("\n", "\\n"); return s; }

static void syncEvents() {
  Event evs[32]; uint16_t n = engine.pendingEvents(evs, 32);
  if (!n) return;
  bool online = WiFi.status() == WL_CONNECTED;
  if (!online) return;
  uint32_t lastOk = 0;
  for (uint16_t i = 0; i < n; i++) {
    const Event& e = evs[i];
    String text;
    switch (e.type) {
      case EventType::UNEXPECTED_FLOW:
        text = String("⚠️ Unexpected Water Consumption\n\nLocation: ") + WG_SITE_NAME + "\nMonitored Zone: " + WG_ZONE_NAME +
               "\n\nFlow: " + String(e.f0, 1) + " L/min\nDuration: " + String(e.f1, 0) + " min\nMode: " + RuleEngine::modeName((Mode)e.u0) +
               "\nSensor: Healthy\n\nReason:\nPersistent flow above configured threshold.\n\nPlease inspect the facility.";
        break;
      case EventType::REVIEW:
        text = String("🟣 Review: long continuous water use during an occupied period (") + String(e.f0, 1) + " L/min for " + String(e.f1, 0) + " min).";
        break;
      case EventType::INCIDENT_RESOLVED:
        text = String("✅ Incident resolved.\nFlow returned below the configured detection threshold.\nEstimated ") + String(e.f0, 0) + " L over " + String(e.f1, 0) + " min.";
        break;
      case EventType::SENSOR_UNKNOWN:
        text = "🟠 Sensor status UNKNOWN — water use cannot be confirmed as zero.";
        break;
      default: break;  // other events go to the backend only
    }
    bool ok = true;
    if (text.length()) ok = telegram(jsonEscape(text));
    if (ok && String(WG_BACKEND_URL).length()) {
      String body = String("{\"site\":\"") + WG_SITE_NAME + "\",\"id\":" + e.id + ",\"t\":" + e.tSec + ",\"type\":" + (int)e.type + ",\"f0\":" + e.f0 + ",\"f1\":" + e.f1 + ",\"u0\":" + e.u0 + "}";
      ok = httpPost(WG_BACKEND_URL, body, "application/json");
    }
    if (!ok) break;  // keep order; retry later
    lastOk = e.id;
  }
  if (lastOk) { engine.markSynced(lastOk); persist(); }
}

// ---------------- Wi-Fi ----------------
static void wifiMaintain() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttempt < 15000) return;
  lastWifiAttempt = millis();
  WiFi.disconnect(); WiFi.begin(WG_WIFI_SSID, WG_WIFI_PASS);  // non-blocking; detection continues regardless
}

// ---------------- word-order self-check ----------------
static void selfCheckWordOrder() {
  uint16_t r[2];
  if (read_holding(transport, WG_MODBUS_SLAVE, tufreg::INNER_DIAMETER - 1, 2, r, WG_MODBUS_TIMEOUT_MS) != MbResult::OK) return;
  float a = decode_real4(r[0], r[1], true), b = decode_real4(r[0], r[1], false);
  bool aOk = a > 5 && a < 2000, bOk = b > 5 && b < 2000;  // inner diameter in mm must be sane
  if (aOk && !bOk) wordOrderLowFirst = true; else if (bOk && !aOk) wordOrderLowFirst = false;
  Serial.printf("[selfcheck] reg221 lowFirst=%.2f highFirst=%.2f → lowFirst=%d\n", a, b, wordOrderLowFirst);
}

// ---------------- serial console (manual mode override for the demo) ----------------
static void console() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'c') { manualOverride = Mode::CLEANING; manualOverrideActive = true; Serial.println("override: CLEANING"); }
    else if (c == 'p') { manualOverride = Mode::PRAYER; manualOverrideActive = true; Serial.println("override: PRAYER"); }
    else if (c == 'q') { manualOverride = Mode::QUIET; manualOverrideActive = true; Serial.println("override: QUIET"); }
    else if (c == 's') { manualOverrideActive = false; Serial.println("override: OFF (schedule)"); }
    else if (c == 'a') { engine.action(Action::ACKNOWLEDGE); persist(); }
    else if (c == 'e') { engine.action(Action::EXPECTED_ACTIVITY); persist(); }
    else if (c == 'k') { engine.action(Action::INCIDENT_CHECKED); persist(); }
    else if (c == 'w') { wordOrderLowFirst = !wordOrderLowFirst; Serial.printf("wordOrderLowFirst=%d\n", wordOrderLowFirst); }
  }
}

void setup() {
  Serial.begin(115200);
  if (WG_RS485_DE_PIN >= 0) { pinMode(WG_RS485_DE_PIN, OUTPUT); digitalWrite(WG_RS485_DE_PIN, LOW); }
  bus.begin(WG_MODBUS_BAUD, SERIAL_8N1, WG_RS485_RX_PIN, WG_RS485_TX_PIN);
  prefs.begin("wg", false);
  restoreFromNvs();
  WiFi.mode(WIFI_STA); WiFi.setAutoReconnect(true); wifiMaintain();
  configTzTime(WG_TZ, "pool.ntp.org", "time.google.com");
  selfCheckWordOrder();
  Serial.println("[boot] Water Guardian prototype. Console: c/p/q/s mode, a/e/k actions, w word-order.");
}

void loop() {
  console(); wifiMaintain();
  if (millis() - lastPoll >= WG_POLL_INTERVAL_MS) {
    lastPoll = millis();
    TufReading r = tuf_poll(transport, WG_MODBUS_SLAVE, wordOrderLowFirst, qpol, WG_MODBUS_TIMEOUT_MS);
    Sample s{millis() / 1000, r.commOk, r.valid, r.flowLpm(), r.quality};
    Context c; c.underlyingMode = scheduleMode(); c.mode = manualOverrideActive ? manualOverride : c.underlyingMode; c.clockValid = clockValid();
    State st = engine.step(s, c);
    Serial.printf("[%lu] mb=%s step=%c Q=%u S=%u/%u ratio=%.1f flow=%.3f L/min valid=%d(%s) | mode=%s state=%s above=%.1fmin wifi=%d unsynced=%u\n",
                  (unsigned long)s.tSec, mb_result_str(r.mb), r.step ? r.step : '?', r.quality, r.strengthUp, r.strengthDown, r.transitRatio, r.flowLpm(), r.valid,
                  r.invalidReason ? r.invalidReason : "-", RuleEngine::modeName(engine.effectiveMode()), RuleEngine::stateName(st), engine.aboveMin(),
                  WiFi.status() == WL_CONNECTED, engine.unsyncedCount());
    if (engine.incident().active && engine.incident().id != lastNotifiedIncident) { lastNotifiedIncident = engine.incident().id; persist(); }
    syncEvents();
  }
  if (millis() - lastPersist > 60000) { lastPersist = millis(); persist(); }  // periodic litres/duration checkpoint
  delay(5);
}
#endif  // NATIVE_TEST
