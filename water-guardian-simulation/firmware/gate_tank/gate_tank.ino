/*
 * Tank Guardian — ONE-DAY FEASIBILITY GATE LOGGER (Arduino-ESP32 sketch)
 *
 * Purpose: answer two questions with RECORDED DATA, nothing else.
 *   Q1  Does cheap overflow sensing detect + quantify gravity-fed overflow, incl. dribbles?
 *   Q2  Does tank level give a slope stable enough to resolve ~1 L/min over 5–15 min windows?
 *
 * Wiring (ESP32 DevKit, 3.3 V logic):
 *   YF-S201 / YF-B5 turbine on the OVERFLOW pipe : red 5V, black GND, yellow -> GPIO 27 (via 10k pull-up to 3V3 — the sensor is open-collector/5 V; most modules output <= 3.3 V with a pull-up to 3V3)
 *   XKC-Y25-V (non-contact liquid) clamped on the overflow pipe : brown 5V, blue GND, yellow -> GPIO 26 (NPN output; add 10k pull-up to 3V3)
 *   Tipping-bucket rain gauge (reed switch) — dribble reference : one lead GND, other -> GPIO 25 (internal pull-up)
 *   JSN-SR04T (waterproof ultrasonic, level) : VCC 5V, GND, TRIG -> GPIO 32, ECHO -> GPIO 33 THROUGH a 1k/2k divider (ECHO is 5 V)
 *   Optional 2nd level sensor (e.g. HC-SR04 on a stilling tube, or a submersible pressure sensor on ADC 34) : see LEVEL2 section
 *   DS18B20 (water temp, optional) : GPIO 4 with 4.7k pull-up
 *
 * Output: CSV on Serial @115200 once per second:
 *   t_ms,overflow_pulses_1s,overflow_total_pulses,xkc_wet,tip_count_1s,tip_total,level_mm_raw,level_mm_med5,level2_raw,temp_c,marker
 * Type a single character in the serial monitor to insert a MARKER column value (e.g. 'a' = start trial, 'b' = end trial,
 * 'r' = refill/pump on, 's' = pump off, 'z' = reset counters). Save the serial log to a .csv and run tests/gate/analyze_gate.py.
 *
 * Nothing here decides anything. The analysis script decides PASS/PARTIAL/FAIL from the recorded numbers.
 */
#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_TURBINE 27
#define PIN_XKC     26
#define PIN_TIP     25
#define PIN_TRIG    32
#define PIN_ECHO    33
#define PIN_TEMP    4
#define PIN_LEVEL2_ADC 34   // optional analog pressure sensor; leave unconnected if unused

volatile uint32_t turbinePulses = 0, tipPulses = 0;
uint32_t turbineTotal = 0, tipTotal = 0;
uint32_t lastTipIsr = 0;
void IRAM_ATTR isrTurbine() { turbinePulses++; }
void IRAM_ATTR isrTip() { uint32_t now = millis(); if (now - lastTipIsr > 50) { tipPulses++; lastTipIsr = now; } } // debounce reed

OneWire ow(PIN_TEMP);
DallasTemperature temp(&ow);

float medianOf5(float* v) { float a[5]; memcpy(a, v, sizeof(a)); for (int i = 0; i < 5; i++) for (int j = i + 1; j < 5; j++) if (a[j] < a[i]) { float t = a[i]; a[i] = a[j]; a[j] = t; } return a[2]; }

// One ultrasonic ping → distance in mm (−1 on timeout). JSN-SR04T needs ≥ 60 ms between pings.
float pingMm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(4);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(20);
  digitalWrite(PIN_TRIG, LOW);
  uint32_t us = pulseIn(PIN_ECHO, HIGH, 40000);
  if (us == 0) return -1;
  return us * 0.1715f;  // 343 m/s /2 → 0.1715 mm per µs (temperature-uncorrected; the analysis script corrects using temp_c)
}

float ring[5]; int ringN = 0;
char marker = '-';

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TURBINE, INPUT_PULLUP); pinMode(PIN_XKC, INPUT_PULLUP); pinMode(PIN_TIP, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT);
  attachInterrupt(digitalPinToInterrupt(PIN_TURBINE), isrTurbine, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_TIP), isrTip, FALLING);
  temp.begin();
  analogReadResolution(12);
  Serial.println("t_ms,overflow_pulses_1s,overflow_total_pulses,xkc_wet,tip_count_1s,tip_total,level_mm_raw,level_mm_med5,level2_raw,temp_c,marker");
}

void loop() {
  static uint32_t next = 0;
  if (Serial.available()) { marker = Serial.read(); if (marker == 'z') { turbineTotal = tipTotal = 0; } }
  // take 5 pings spread over the second for the median
  float raw = -1;
  for (int i = 0; i < 5; i++) { raw = pingMm(); if (raw > 0) { ring[ringN % 5] = raw; ringN++; } delay(70); }
  float med = ringN >= 5 ? medianOf5(ring) : raw;
  temp.requestTemperatures(); float tc = temp.getTempCByIndex(0);
  int lvl2 = analogRead(PIN_LEVEL2_ADC);
  noInterrupts(); uint32_t tp = turbinePulses; turbinePulses = 0; uint32_t tt = tipPulses; tipPulses = 0; interrupts();
  turbineTotal += tp; tipTotal += tt;
  int wet = digitalRead(PIN_XKC) == LOW ? 1 : 0;  // XKC-Y25 NPN: LOW when liquid detected (check your module's variant)
  Serial.printf("%lu,%lu,%lu,%d,%lu,%lu,%.1f,%.1f,%d,%.2f,%c\n", millis(), tp, turbineTotal, wet, tt, tipTotal, raw, med, lvl2, tc, marker);
  marker = '-';
  while (millis() < next) delay(1);
  next = millis() + 1000;
}
