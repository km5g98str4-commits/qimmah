// Host-side tests for the firmware logic (no hardware). Plain asserts so it also builds with:
//   g++ -std=c++17 -DNATIVE_TEST -Isrc src/rule_engine.cpp src/modbus_rtu.cpp src/tuf2000m.cpp test/test_native/test_main.cpp -o /tmp/wg_test && /tmp/wg_test
#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>
#include "modbus_rtu.h"
#include "tuf2000m.h"
#include "rule_engine.h"
using namespace wg;

static int passed = 0, failed = 0;
#define CHECK(c) do { if (c) passed++; else { failed++; printf("FAIL %s:%d %s\n", __FILE__, __LINE__, #c); } } while (0)

// ---- fake transport: scripted response bytes ----
struct Fake { std::vector<uint8_t> tx; std::vector<uint8_t> rx; size_t pos = 0; };
static size_t f_write(const uint8_t* d, size_t n, void* u) { auto* f = (Fake*)u; f->tx.assign(d, d + n); return n; }
static size_t f_read(uint8_t* b, size_t n, uint32_t, void* u) { auto* f = (Fake*)u; size_t g = 0; while (g < n && f->pos < f->rx.size()) b[g++] = f->rx[f->pos++]; return g; }
static void f_flush(void*) {}
static std::vector<uint8_t> frame(std::vector<uint8_t> body) { uint16_t c = crc16_modbus(body.data(), body.size()); body.push_back(c & 0xFF); body.push_back(c >> 8); return body; }

static void test_crc() {
  // Known vector: request 01 03 00 00 00 02 → CRC C4 0B
  uint8_t req[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x02};
  CHECK(crc16_modbus(req, 6) == 0x0BC4);
}
static void test_real4_word_order() {
  // 36.625f = 0x42128000 → high word 0x4212, low word 0x8000 (arivin29's worked temperature example)
  CHECK(decode_real4(0x8000, 0x4212, true) == 36.625f);
  CHECK(decode_real4(0x4212, 0x8000, false) == 36.625f);
  // 1.0 m³/h = 0x3F800000 → low-first registers [0x0000, 0x3F80]
  CHECK(decode_real4(0x0000, 0x3F80, true) == 1.0f);
}
static void test_modbus_read_ok_timeout_crc() {
  Fake f; MbTransport t{f_write, f_read, f_flush, &f};
  uint16_t out[2];
  f.rx = frame({0x01, 0x03, 0x04, 0x50, 0x00, 0x42, 0x12}); f.pos = 0;
  CHECK(read_holding(t, 1, 0, 2, out, 100) == MbResult::OK);
  CHECK(out[0] == 0x5000 && out[1] == 0x4212);
  CHECK(f.tx.size() == 8 && f.tx[0] == 1 && f.tx[1] == 3);
  f.rx.clear(); f.pos = 0;
  CHECK(read_holding(t, 1, 0, 2, out, 100) == MbResult::TIMEOUT);
  f.rx = frame({0x01, 0x03, 0x04, 0x50, 0x00, 0x42, 0x12}); f.rx.back() ^= 0xFF; f.pos = 0;
  CHECK(read_holding(t, 1, 0, 2, out, 100) == MbResult::CRC_ERROR);
  f.rx = frame({0x01, 0x83, 0x02}); f.pos = 0;
  CHECK(read_holding(t, 1, 0, 2, out, 100) == MbResult::EXCEPTION);
}
static void test_validate_never_zero() {
  TufQualityPolicy pol; TufReading r;
  r.commOk = false; tuf_validate(r, pol); CHECK(!r.valid && strcmp(r.invalidReason, "NO_COMM") == 0);
  r.commOk = true; r.step = 'I'; r.flowM3h = 0; tuf_validate(r, pol); CHECK(!r.valid);  // "no signal" with flow 0 must NOT be valid zero
  r.step = 'R'; r.quality = 80; r.strengthUp = r.strengthDown = 1500; r.transitRatio = 100; tuf_validate(r, pol); CHECK(r.valid);
  r.quality = 40; tuf_validate(r, pol); CHECK(!r.valid && strcmp(r.invalidReason, "QUALITY_LOW") == 0);
  r.quality = 80; r.transitRatio = 90; tuf_validate(r, pol); CHECK(!r.valid);
  r.transitRatio = 100; r.errorBits = 0x0008; tuf_validate(r, pol); CHECK(!r.valid);  // pipe empty bit
}
static RuleEngine run(RuleEngine& e, uint32_t from, uint32_t to, float lpm, bool valid, Mode m, bool clock = true, bool comm = true) {
  Context c; c.mode = m; c.underlyingMode = m == Mode::CLEANING ? Mode::QUIET : m; c.clockValid = clock;
  for (uint32_t t = from; t <= to; t++) e.step(Sample{t, comm, valid, lpm, (uint8_t)(valid ? 80 : 0)}, c);
  return e;
}
static void test_engine_quiet_persistent() {
  Rules R; RuleEngine e(R);
  run(e, 0, 599, 3.0f, true, Mode::QUIET); CHECK(e.state() == State::PERSISTENT_FLOW);
  run(e, 600, 700, 3.0f, true, Mode::QUIET); CHECK(e.state() == State::UNEXPECTED_FLOW && e.incident().active);
  run(e, 701, 701 + 4 * 60, 0.0f, true, Mode::QUIET); CHECK(e.state() == State::RESOLVED && !e.incident().active);
  Event ev[8]; uint16_t n = e.pendingEvents(ev, 8); CHECK(n == 2);  // UNEXPECTED_FLOW + INCIDENT_RESOLVED
}
static void test_engine_sensor_unknown_keeps_incident() {
  Rules R; RuleEngine e(R);
  run(e, 0, 700, 3.0f, true, Mode::QUIET); CHECK(e.incident().active);
  run(e, 701, 800, 0.0f, false, Mode::QUIET, true, false);  // comm lost, meter would say 0
  CHECK(e.state() == State::SENSOR_UNKNOWN && e.incident().active);
  run(e, 801, 900, 3.0f, true, Mode::QUIET); CHECK(e.state() == State::UNEXPECTED_FLOW);
}
static void test_engine_short_burst_no_alert() {
  Rules R; RuleEngine e(R);
  run(e, 0, 90, 5.0f, true, Mode::QUIET); run(e, 91, 1500, 0.0f, true, Mode::QUIET);
  CHECK(e.state() == State::NORMAL); Event ev[8]; CHECK(e.pendingEvents(ev, 8) == 0);
}
static void test_engine_occupied_review_only() {
  Rules R; RuleEngine e(R);
  run(e, 0, 40 * 60, 2.0f, true, Mode::PRAYER); CHECK(e.state() == State::EXPECTED_FLOW);
  run(e, 40 * 60 + 1, 50 * 60, 2.0f, true, Mode::PRAYER); CHECK(e.state() == State::REVIEW);
}
static void test_engine_cleaning_override_expiry() {
  Rules R; R.cleaningOverrideMin = 5; RuleEngine e(R);
  run(e, 0, 4 * 60, 3.0f, true, Mode::CLEANING); CHECK(e.state() == State::EXPECTED_FLOW);
  run(e, 4 * 60 + 1, 20 * 60, 3.0f, true, Mode::CLEANING); CHECK(e.state() == State::UNEXPECTED_FLOW);
}
static void test_engine_clock_invalid_conservative() {
  Rules R; RuleEngine e(R);
  run(e, 0, 30 * 60, 3.0f, true, Mode::QUIET, false); CHECK(e.state() == State::EXPECTED_FLOW);
}
static void test_engine_persist_restore() {
  Rules R; RuleEngine e(R);
  run(e, 0, 700, 3.0f, true, Mode::QUIET); CHECK(e.incident().active);
  Persisted p; e.save(p); CHECK(p.incident.active && p.nUnsynced == 1);
  RuleEngine e2(R); e2.restore(p);
  CHECK(e2.incident().active && e2.state() == State::UNEXPECTED_FLOW);
  run(e2, 1, 100, 3.0f, true, Mode::QUIET);
  Event ev[8]; uint16_t n = e2.pendingEvents(ev, 8); int alerts = 0; for (int i = 0; i < n; i++) if (ev[i].type == EventType::UNEXPECTED_FLOW) alerts++;
  CHECK(alerts == 1);  // no duplicate alert after reboot
  run(e2, 101, 101 + 4 * 60, 0.0f, true, Mode::QUIET); CHECK(e2.state() == State::RESOLVED);
}
static void test_engine_gap_tolerance() {
  Rules R; RuleEngine e(R);
  // 3 L/min with a 10 s dip every 2 min → still persistent (dip < gapToleranceS)
  Context c; c.mode = Mode::QUIET;
  for (uint32_t t = 0; t <= 720; t++) { float q = (t % 120) < 10 ? 0.f : 3.f; e.step(Sample{t, true, true, q, 80}, c); }
  CHECK(e.state() == State::UNEXPECTED_FLOW);
  RuleEngine e2(R);
  // 3 L/min with a 60 s dip every 3 min → NOT persistent (dip > gapToleranceS)
  for (uint32_t t = 0; t <= 720; t++) { float q = (t % 180) < 60 ? 0.f : 3.f; e2.step(Sample{t, true, true, q, 80}, c); }
  CHECK(e2.state() != State::UNEXPECTED_FLOW);
}

int main() {
  test_crc(); test_real4_word_order(); test_modbus_read_ok_timeout_crc(); test_validate_never_zero();
  test_engine_quiet_persistent(); test_engine_sensor_unknown_keeps_incident(); test_engine_short_burst_no_alert();
  test_engine_occupied_review_only(); test_engine_cleaning_override_expiry(); test_engine_clock_invalid_conservative();
  test_engine_persist_restore(); test_engine_gap_tolerance();
  printf("firmware native tests: %d passed, %d failed\n", passed, failed);
  return failed ? 1 : 0;
}
