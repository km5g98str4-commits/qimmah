#include "rule_engine.h"
#include <string.h>

namespace wg {

RuleEngine::RuleEngine(const Rules& r) : R_(r) { memset(ev_, 0, sizeof(ev_)); }

const char* RuleEngine::stateName(State s) {
  static const char* n[] = {"NORMAL", "EXPECTED_FLOW", "PERSISTENT_FLOW", "UNEXPECTED_FLOW", "REVIEW", "SENSOR_UNKNOWN", "RESOLVED"};
  return n[(int)s];
}
const char* RuleEngine::modeName(Mode m) {
  static const char* n[] = {"QUIET", "PRAYER", "CLEANING", "SPECIAL_EVENT"};
  return n[(int)m];
}

void RuleEngine::emit(EventType t, float f0, float f1, uint8_t u0) {
  Event e{nextId_++, t_, t, f0, f1, u0, false};
  uint16_t idx = (evHead_ + evLen_) % EV;
  if (evLen_ == EV) { evHead_ = (evHead_ + 1) % EV; idx = (evHead_ + EV - 1) % EV; } else evLen_++;
  ev_[idx] = e;
}

uint16_t RuleEngine::pendingEvents(Event* out, uint16_t max) const {
  uint16_t n = 0;
  for (uint16_t i = 0; i < evLen_ && n < max; i++) { const Event& e = ev_[(evHead_ + i) % EV]; if (!e.synced) out[n++] = e; }
  return n;
}
void RuleEngine::markSynced(uint32_t uptoId) {
  for (uint16_t i = 0; i < evLen_; i++) { Event& e = ev_[(evHead_ + i) % EV]; if (e.id <= uptoId) e.synced = true; }
}
uint16_t RuleEngine::unsyncedCount() const { uint16_t n = 0; for (uint16_t i = 0; i < evLen_; i++) if (!ev_[(evHead_ + i) % EV].synced) n++; return n; }

void RuleEngine::save(Persisted& p) const {
  p.magic = 0x57475631; p.incident = inc_; p.nextId = nextId_; p.aboveSinceS = aboveSince_;
  p.nUnsynced = pendingEvents(p.unsynced, 32);
}
void RuleEngine::restore(const Persisted& p) {
  if (p.magic != 0x57475631) return;
  inc_ = p.incident; nextId_ = p.nextId;
  evHead_ = 0; evLen_ = 0;
  for (uint16_t i = 0; i < p.nUnsynced && i < 32; i++) { ev_[evLen_++] = p.unsynced[i]; }
  // After a reboot the monotonic clock restarts: we cannot know how long the flow was above
  // threshold before the reset, so we keep the incident open (conservative) and restart timers.
  aboveSince_ = inc_.active ? 0 : -1;
  if (inc_.active) state_ = inc_.priority == Priority::HIGH ? State::UNEXPECTED_FLOW : State::REVIEW;
  emit(EventType::BOOT, inc_.active ? 1.f : 0.f, (float)p.nUnsynced);
}

bool RuleEngine::action(Action a) {
  if (!inc_.active) return false;
  inc_.acked = true; inc_.ackType = a;
  emit(EventType::ACTION, (float)inc_.id, 0, (uint8_t)a);
  if (a == Action::EXPECTED_ACTIVITY) { inc_.priority = Priority::EXPECTED; state_ = State::EXPECTED_FLOW; }
  return true;
}

void RuleEngine::openIncident(Priority p, float q, float aboveMin) {
  inc_ = Incident{};
  inc_.active = true; inc_.id = nextId_; inc_.openedAtS = t_; inc_.mode = effMode_; inc_.priority = p;
  inc_.peakLpm = q; inc_.lastFlowLpm = q; inc_.litres = q * aboveMin; inc_.durationMin = aboveMin; inc_.quality = lastQuality_;
  state_ = p == Priority::HIGH ? State::UNEXPECTED_FLOW : State::REVIEW;
  emit(p == Priority::HIGH ? EventType::UNEXPECTED_FLOW : EventType::REVIEW, q, aboveMin, (uint8_t)effMode_);
}

State RuleEngine::step(const Sample& s, const Context& c) {
  const uint32_t t = s.tSec;
  const float dt = t > t_ ? (float)(t - t_) : 0.f;
  t_ = t;

  // ---- effective facility mode ----
  if (c.mode == Mode::CLEANING) {
    if (cleaningStarted_ < 0) { cleaningStarted_ = (int32_t)t; cleaningExpiredLogged_ = false; emit(EventType::CLEANING_START); }
    bool expired = (t - cleaningStarted_) / 60.f >= R_.cleaningOverrideMin;
    effMode_ = expired ? c.underlyingMode : Mode::CLEANING;
    if (expired && !cleaningExpiredLogged_) { cleaningExpiredLogged_ = true; emit(EventType::CLEANING_OVERRIDE_EXPIRED); }
  } else { cleaningStarted_ = -1; effMode_ = c.mode; }
  if (!c.clockValid) effMode_ = R_.clockInvalidTreatAsQuiet ? Mode::QUIET : Mode::PRAYER;
  const bool quiet = effMode_ == Mode::QUIET, cleaning = effMode_ == Mode::CLEANING;

  // ---- validity (Principle 1) ----
  const bool valid = s.commOk && s.valid && s.quality >= R_.qualityThreshold;
  if (!valid) {
    if (invalidSince_ < 0) invalidSince_ = (int32_t)t;
    if (t - invalidSince_ >= R_.sensorUnknownGraceS && state_ != State::SENSOR_UNKNOWN) {
      state_ = State::SENSOR_UNKNOWN; emit(EventType::SENSOR_UNKNOWN, 0, 0, inc_.active ? 1 : 0);
    }
    return state_;  // timers and incident untouched: we do not know.
  }
  if (invalidSince_ >= 0) {
    invalidSince_ = -1;
    if (state_ == State::SENSOR_UNKNOWN) { emit(EventType::SENSOR_RECOVERED); state_ = inc_.active ? (inc_.priority == Priority::HIGH ? State::UNEXPECTED_FLOW : State::REVIEW) : State::NORMAL; }
  }

  // ---- moving average ----
  uint16_t idx = (winHead_ + winLen_) % WIN;
  if (winLen_ == WIN) { winHead_ = (winHead_ + 1) % WIN; idx = (winHead_ + WIN - 1) % WIN; } else winLen_++;
  winQ_[idx] = s.flowLpm; winT_[idx] = t;
  while (winLen_ > 1 && t - winT_[winHead_] > R_.averagingWindowS) { winHead_ = (winHead_ + 1) % WIN; winLen_--; }
  float sum = 0; for (uint16_t i = 0; i < winLen_; i++) sum += winQ_[(winHead_ + i) % WIN];
  const float q = sum / winLen_;
  lastFlow_ = q; lastQuality_ = s.quality;

  const bool above = q > R_.flowThresholdLpm;
  const bool belowResolve = q < R_.flowThresholdLpm * (1.f - R_.hysteresisPct / 100.f);

  if (inc_.active && above) { inc_.litres += q / 60.f * dt; if (q > inc_.peakLpm) inc_.peakLpm = q; inc_.lastFlowLpm = q; inc_.durationMin = (t - (aboveSince_ >= 0 ? (uint32_t)aboveSince_ : inc_.openedAtS)) / 60.f; }

  if (above) { if (aboveSince_ < 0) aboveSince_ = (int32_t)t; belowSince_ = -1; }
  else if (belowResolve) { if (belowSince_ < 0) belowSince_ = (int32_t)t; }
  if (!above && belowSince_ >= 0 && !inc_.active && t - belowSince_ >= R_.gapToleranceS) aboveSince_ = -1;
  const float aboveMin = this->aboveMin();

  // ---- resolution ----
  if (inc_.active && belowSince_ >= 0 && (t - belowSince_) / 60.f >= R_.resolveMin) {
    emit(EventType::INCIDENT_RESOLVED, inc_.litres, inc_.durationMin, (uint8_t)inc_.ackType);
    inc_.active = false; state_ = State::RESOLVED; resolvedAt_ = (int32_t)t; aboveSince_ = -1;
    return state_;
  }
  if (state_ == State::RESOLVED) {
    if (above) state_ = State::NORMAL;
    else if ((t - resolvedAt_) / 60.f >= R_.resolvedDisplayMin) state_ = State::NORMAL;
    else return state_;
  }

  // ---- decision table ----
  if (inc_.active) { state_ = inc_.priority == Priority::HIGH ? State::UNEXPECTED_FLOW : inc_.priority == Priority::EXPECTED ? State::EXPECTED_FLOW : State::REVIEW; return state_; }
  if (!above) { state_ = State::NORMAL; return state_; }
  if (cleaning) { state_ = State::EXPECTED_FLOW; return state_; }
  if (quiet) { if (aboveMin >= R_.persistenceMinQuiet) openIncident(Priority::HIGH, q, aboveMin); else state_ = State::PERSISTENT_FLOW; return state_; }
  if (aboveMin >= R_.persistenceMinOccupied) openIncident(Priority::LOW, q, aboveMin); else state_ = State::EXPECTED_FLOW;
  return state_;
}

}  // namespace wg
