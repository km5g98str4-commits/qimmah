// Water Guardian — rule engine (C++ port of simulator/engine/ruleEngine.js).
// Pure logic, no Arduino dependencies → unit-testable on the host (pio test -e native).
// Principle 1: invalid sensor data is NEVER zero flow → SENSOR_UNKNOWN.
// Principle 2: detection never depends on connectivity; events are buffered.
#pragma once
#include <stdint.h>

namespace wg {

enum class State : uint8_t { NORMAL, EXPECTED_FLOW, PERSISTENT_FLOW, UNEXPECTED_FLOW, REVIEW, SENSOR_UNKNOWN, RESOLVED };
enum class Mode : uint8_t { QUIET, PRAYER, CLEANING, SPECIAL_EVENT };
enum class Priority : uint8_t { NONE, HIGH, LOW, EXPECTED };
enum class Action : uint8_t { ACKNOWLEDGE, EXPECTED_ACTIVITY, INCIDENT_CHECKED };

struct Rules {
  float flowThresholdLpm = 0.5f;
  float hysteresisPct = 20.f;
  float persistenceMinQuiet = 10.f;
  float persistenceMinOccupied = 45.f;
  float cleaningOverrideMin = 60.f;
  float resolveMin = 3.f;
  uint16_t gapToleranceS = 30;
  uint16_t averagingWindowS = 30;
  uint8_t qualityThreshold = 60;
  uint16_t sensorUnknownGraceS = 15;
  float resolvedDisplayMin = 5.f;
  bool clockInvalidTreatAsQuiet = false;  // false → conservative (OCCUPIED)
};

struct Sample {
  uint32_t tSec;      // monotonic seconds (millis()/1000) — NOT wall clock
  bool commOk;
  bool valid;
  float flowLpm;
  uint8_t quality;
};

struct Context {
  Mode mode = Mode::QUIET;
  Mode underlyingMode = Mode::QUIET;  // schedule mode beneath a manual CLEANING override
  bool clockValid = true;
};

struct Incident {
  uint32_t id = 0;
  uint32_t openedAtS = 0;
  Mode mode = Mode::QUIET;
  Priority priority = Priority::NONE;
  float peakLpm = 0, lastFlowLpm = 0, litres = 0, durationMin = 0;
  uint8_t quality = 0;
  bool acked = false;
  Action ackType = Action::ACKNOWLEDGE;
  bool active = false;
};

enum class EventType : uint8_t { BOOT, LINK, UNEXPECTED_FLOW, REVIEW, INCIDENT_RESOLVED, SENSOR_UNKNOWN, SENSOR_RECOVERED, CLEANING_START, CLEANING_OVERRIDE_EXPIRED, ACTION };

struct Event {
  uint32_t id; uint32_t tSec; EventType type; float f0; float f1; uint8_t u0; bool synced;
};

// What survives a reboot (written to NVS by main.cpp).
struct Persisted {
  uint32_t magic = 0x57475631;  // "WGV1"
  Incident incident;
  uint32_t nextId = 1;
  int32_t aboveSinceS = -1;     // relative to boot; restored as "unknown start" → we keep incident open
  uint16_t nUnsynced = 0;
  Event unsynced[32];
};

class RuleEngine {
 public:
  explicit RuleEngine(const Rules& r);
  State step(const Sample& s, const Context& c);
  bool action(Action a);
  State state() const { return state_; }
  const Incident& incident() const { return inc_; }
  float aboveMin() const { return aboveSince_ < 0 ? 0.f : (t_ - aboveSince_) / 60.f; }
  float lastValidFlow() const { return lastFlow_; }
  Mode effectiveMode() const { return effMode_; }
  // Event ring buffer
  uint16_t pendingEvents(Event* out, uint16_t max) const;  // copies unsynced events
  void markSynced(uint32_t uptoId);
  uint16_t unsyncedCount() const;
  // Persistence
  void save(Persisted& p) const;
  void restore(const Persisted& p);
  const Rules& rules() const { return R_; }
  Rules& rules() { return R_; }
  static const char* stateName(State s);
  static const char* modeName(Mode m);

 private:
  void emit(EventType t, float f0 = 0, float f1 = 0, uint8_t u0 = 0);
  void openIncident(Priority p, float q, float aboveMin);
  Rules R_;
  State state_ = State::NORMAL;
  Mode effMode_ = Mode::QUIET;
  uint32_t t_ = 0;
  int32_t aboveSince_ = -1, belowSince_ = -1, invalidSince_ = -1, cleaningStarted_ = -1, resolvedAt_ = -1;
  bool cleaningExpiredLogged_ = false;
  float lastFlow_ = 0;
  uint8_t lastQuality_ = 0;
  Incident inc_;
  uint32_t nextId_ = 1;
  // moving average ring
  static constexpr uint16_t WIN = 64;
  float winQ_[WIN]; uint32_t winT_[WIN]; uint16_t winHead_ = 0, winLen_ = 0;
  // events ring
  static constexpr uint16_t EV = 64;
  Event ev_[EV]; uint16_t evHead_ = 0, evLen_ = 0;
};

}  // namespace wg
