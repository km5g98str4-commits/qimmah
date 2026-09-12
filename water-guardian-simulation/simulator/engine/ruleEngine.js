/* Water Guardian — persistent-unexpected-flow RULE ENGINE (state machine).
 *
 * Design principles (mirrors firmware/esp32_prototype/src/rule_engine.cpp):
 *  1. INVALID SENSOR DATA IS NEVER ZERO FLOW  → SENSOR_UNKNOWN.
 *  2. Detection is purely local (no network dependency). Connectivity is an
 *     ORTHOGONAL "link" state; events are buffered until they can sync.
 *  3. Every threshold is a configurable parameter, not a fact.
 *  4. The engine never claims "LEAK"; it claims "persistent unexpected flow".
 *
 * States: NORMAL · EXPECTED_FLOW · PERSISTENT_FLOW · UNEXPECTED_FLOW · REVIEW ·
 *         SENSOR_UNKNOWN · RESOLVED   (+ link: ONLINE / OFFLINE overlay)
 *
 * Works in browser (window.WG) and Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.WG = Object.assign(root.WG || {}, factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const STATES = ['NORMAL', 'EXPECTED_FLOW', 'PERSISTENT_FLOW', 'UNEXPECTED_FLOW', 'REVIEW', 'SENSOR_UNKNOWN', 'RESOLVED'];
  const MODES = ['QUIET', 'PRAYER', 'CLEANING', 'SPECIAL_EVENT'];

  const DEFAULT_RULES = {
    flowThresholdLpm: 0.5,         // valid flow above this counts as "flow present"   (ASSUMED default)
    hysteresisPct: 20,             // resolve when flow < threshold × (1 − h)           (ASSUMED)
    persistenceMinQuiet: 10,       // QUIET: minutes above threshold → UNEXPECTED_FLOW (ASSUMED)
    persistenceMinOccupied: 45,    // PRAYER/SPECIAL_EVENT: minutes → REVIEW (low priority)
    cleaningOverrideMin: 60,       // CLEANING override auto-expires after this
    resolveMin: 3,                 // minutes below (threshold − hysteresis) to resolve
    gapToleranceS: 30,             // a dip below threshold shorter than this does not reset persistence
    averagingWindowS: 30,          // moving average of VALID samples before threshold comparison
    qualityThreshold: 60,          // meter Q below this → sample INVALID
    sensorUnknownGraceS: 15,       // consecutive invalid seconds before SENSOR_UNKNOWN
    resolvedDisplayMin: 5,         // how long RESOLVED is shown before NORMAL
    clockInvalidPolicy: 'OCCUPIED',// if RTC/NTP invalid: treat as OCCUPIED (conservative) or QUIET
  };

  function createEngine(rules, opts) {
    const R = Object.assign({}, DEFAULT_RULES, rules || {});
    const O = Object.assign({ now: () => 0 }, opts || {});
    let s = freshState();

    function freshState() {
      return {
        state: 'NORMAL',
        link: 'ONLINE',
        mode: 'QUIET',
        effectiveMode: 'QUIET',
        clockValid: true,
        aboveSinceS: null,        // sim-time when valid flow first exceeded threshold (continuous)
        belowSinceS: null,        // sim-time when valid flow first fell below resolve level
        invalidSinceS: null,
        cleaningStartedS: null,
        resolvedAtS: null,
        lastValidFlowLpm: null,
        lastRawFlowLpm: null,
        lastQuality: null,
        window: [],
        lastSample: null,
        incident: null,           // {id, openedAtS, mode, peakLpm, litres, maxDurationMin, priority, acked, ackType}
        events: [],               // {id, tSec, type, payload, synced}
        nextId: 1,
        tSec: 0,
      };
    }

    /** Persist/restore — what the ESP32 keeps in NVS across a reboot. */
    function snapshot() {
      return JSON.stringify({
        incident: s.incident,
        events: s.events.filter((e) => !e.synced),
        nextId: s.nextId,
        aboveSinceS: s.aboveSinceS,
        cleaningStartedS: s.cleaningStartedS,
      });
    }
    function restore(json) {
      const d = JSON.parse(json);
      s = freshState();
      s.incident = d.incident || null;
      s.events = d.events || [];
      s.nextId = d.nextId || 1;
      s.aboveSinceS = d.aboveSinceS ?? null;
      s.cleaningStartedS = d.cleaningStartedS ?? null;
      if (s.incident) s.state = s.incident.priority === 'HIGH' ? 'UNEXPECTED_FLOW' : 'REVIEW';
      emit('BOOT', { restoredIncident: !!s.incident, unsyncedEvents: s.events.length });
    }
    function reboot() { const snap = snapshot(); restore(snap); }

    function emit(type, payload) {
      const ev = { id: s.nextId++, tSec: s.tSec, type, payload: payload || {}, synced: false };
      s.events.push(ev);
      if (s.events.length > 500) s.events.shift();
      return ev;
    }

    /** Try to sync unsynced events; returns number synced. */
    function sync(canReachBackend) {
      if (!canReachBackend) return 0;
      let n = 0;
      for (const e of s.events) if (!e.synced) { e.synced = true; n++; }
      return n;
    }

    /**
     * Advance the engine by one sample.
     * @param {object} sample  {tSec, commOk, valid, flowLpm, quality, workingStep, invalidReason}
     * @param {object} ctx     {mode, clockValid, wifi, backend}
     */
    function step(sample, ctx) {
      const t = sample.tSec;
      const dt = Math.max(0, t - s.tSec);
      s.tSec = t;
      s.lastSample = sample;
      s.mode = ctx.mode;
      s.clockValid = ctx.clockValid !== false;

      // ---- link overlay (never gates detection) ----
      const newLink = ctx.wifi && ctx.backend ? 'ONLINE' : 'OFFLINE';
      if (newLink !== s.link) { s.link = newLink; emit('LINK', { link: newLink }); }
      if (s.link === 'ONLINE') sync(true);

      // ---- effective facility mode ----
      if (ctx.mode === 'CLEANING') {
        if (s.cleaningStartedS === null) { s.cleaningStartedS = t; emit('CLEANING_START', {}); }
        const expired = (t - s.cleaningStartedS) / 60 >= R.cleaningOverrideMin;
        s.effectiveMode = expired ? (ctx.underlyingMode || 'QUIET') : 'CLEANING';
        if (expired && s._cleaningExpiredLogged !== s.cleaningStartedS) { s._cleaningExpiredLogged = s.cleaningStartedS; emit('CLEANING_OVERRIDE_EXPIRED', {}); }
      } else {
        s.cleaningStartedS = null;
        s.effectiveMode = ctx.mode;
      }
      if (!s.clockValid) s.effectiveMode = R.clockInvalidPolicy === 'QUIET' ? 'QUIET' : 'PRAYER';
      const quiet = s.effectiveMode === 'QUIET';
      const cleaning = s.effectiveMode === 'CLEANING';

      // ---- sample validity (Principle 1) ----
      const valid = !!sample.commOk && !!sample.valid && sample.flowLpm !== null && (sample.quality ?? 0) >= R.qualityThreshold;
      if (!valid) {
        if (s.invalidSinceS === null) s.invalidSinceS = t;
        const unknownFor = t - s.invalidSinceS;
        if (unknownFor >= R.sensorUnknownGraceS && s.state !== 'SENSOR_UNKNOWN') {
          s.state = 'SENSOR_UNKNOWN';
          emit('SENSOR_UNKNOWN', { reason: sample.invalidReason || (sample.commOk ? 'INVALID' : 'NO_COMM'), incidentOpen: !!s.incident });
        }
        // Do NOT touch aboveSince/belowSince or incident: we simply do not know.
        return view();
      }
      if (s.invalidSinceS !== null) {
        s.invalidSinceS = null;
        if (s.state === 'SENSOR_UNKNOWN') {
          emit('SENSOR_RECOVERED', {});
          s.state = s.incident ? (s.incident.priority === 'HIGH' ? 'UNEXPECTED_FLOW' : 'REVIEW') : 'NORMAL';
        }
      }
      // Moving average of valid samples (firmware does the same with a ring buffer).
      s.window.push({ t, q: sample.flowLpm });
      while (s.window.length && t - s.window[0].t > R.averagingWindowS) s.window.shift();
      const q = s.window.reduce((a, w) => a + w.q, 0) / s.window.length;
      s.lastValidFlowLpm = q;
      s.lastRawFlowLpm = sample.flowLpm;
      s.lastQuality = sample.quality;

      const above = q > R.flowThresholdLpm;
      const belowResolve = q < R.flowThresholdLpm * (1 - R.hysteresisPct / 100);

      // ---- incident accounting ----
      if (s.incident && above) {
        s.incident.litres += (q / 60) * dt;
        s.incident.peakLpm = Math.max(s.incident.peakLpm, q);
        s.incident.lastFlowLpm = q;
        s.incident.durationMin = (t - (s.aboveSinceS ?? s.incident.openedAtS)) / 60;
      }

      // ---- above/below timers ----
      if (above) {
        if (s.aboveSinceS === null) s.aboveSinceS = t;
        s.belowSinceS = null;
      } else if (belowResolve) {
        if (s.belowSinceS === null) s.belowSinceS = t;
      }
      // In the hysteresis band we hold both timers (no change).
      // Persistence (no incident yet) resets after a dip longer than gapToleranceS;
      // an OPEN incident only resolves after resolveMin (handled below).
      if (!above && s.belowSinceS !== null && !s.incident && t - s.belowSinceS >= R.gapToleranceS) {
        s.aboveSinceS = null;
      }

      const aboveMin = s.aboveSinceS === null ? 0 : (t - s.aboveSinceS) / 60;

      // ---- resolution ----
      if (s.incident && s.belowSinceS !== null && (t - s.belowSinceS) / 60 >= R.resolveMin) {
        const inc = s.incident;
        emit('INCIDENT_RESOLVED', { id: inc.id, litres: round(inc.litres, 1), durationMin: round(inc.durationMin, 1), ackType: inc.ackType });
        s.incident = null;
        s.state = 'RESOLVED';
        s.resolvedAtS = t;
        s.aboveSinceS = null;
        return view();
      }
      if (s.state === 'RESOLVED') {
        if (above) s.state = 'NORMAL'; // fall through to re-evaluate below
        else if ((t - s.resolvedAtS) / 60 >= R.resolvedDisplayMin) s.state = 'NORMAL';
        else return view();
      }

      // ---- main decision table ----
      if (s.incident) {
        // Incident stays open until resolved (flow below) — mode changes do not close it.
        s.state = s.incident.priority === 'HIGH' ? 'UNEXPECTED_FLOW' : 'REVIEW';
        return view();
      }
      if (!above) { s.state = 'NORMAL'; return view(); }

      if (cleaning) { s.state = 'EXPECTED_FLOW'; return view(); }

      if (quiet) {
        if (aboveMin >= R.persistenceMinQuiet) openIncident('HIGH', q, aboveMin);
        else s.state = 'PERSISTENT_FLOW';
        return view();
      }
      // PRAYER / SPECIAL_EVENT (or clock invalid, conservative)
      if (aboveMin >= R.persistenceMinOccupied) openIncident('LOW', q, aboveMin);
      else s.state = 'EXPECTED_FLOW';
      return view();
    }

    function openIncident(priority, q, aboveMin) {
      s.incident = {
        id: s.nextId, openedAtS: s.tSec, startedAtS: s.aboveSinceS, mode: s.effectiveMode, priority,
        peakLpm: q, lastFlowLpm: q, litres: (q / 60) * aboveMin * 60, durationMin: aboveMin,
        quality: s.lastQuality, acked: false, ackType: null,
        reason: priority === 'HIGH'
          ? `Flow remained above ${R.flowThresholdLpm} L/min for ${aboveMin.toFixed(0)} minutes during a QUIET period.`
          : `Flow remained above ${R.flowThresholdLpm} L/min for ${aboveMin.toFixed(0)} minutes during an OCCUPIED period (${s.effectiveMode}). Low-priority review.`,
      };
      s.state = priority === 'HIGH' ? 'UNEXPECTED_FLOW' : 'REVIEW';
      emit(priority === 'HIGH' ? 'UNEXPECTED_FLOW' : 'REVIEW', { id: s.incident.id, flowLpm: q, durationMin: round(aboveMin, 1), mode: s.effectiveMode, quality: s.lastQuality, reason: s.incident.reason });
    }

    /** Caretaker actions: ACKNOWLEDGE | EXPECTED_ACTIVITY | INCIDENT_CHECKED */
    function action(type) {
      if (!s.incident) return false;
      s.incident.acked = true;
      s.incident.ackType = type;
      emit('ACTION_' + type, { id: s.incident.id });
      if (type === 'EXPECTED_ACTIVITY') {
        // Human says this flow is legitimate: downgrade to EXPECTED_FLOW until it stops; do not re-alert.
        s.incident.priority = 'EXPECTED';
        s.state = 'EXPECTED_FLOW';
      }
      return true;
    }

    function view() {
      return {
        state: s.state, link: s.link, mode: s.mode, effectiveMode: s.effectiveMode, clockValid: s.clockValid,
        aboveMin: s.aboveSinceS === null ? 0 : (s.tSec - s.aboveSinceS) / 60,
        lastValidFlowLpm: s.lastValidFlowLpm, lastQuality: s.lastQuality,
        incident: s.incident ? Object.assign({}, s.incident) : null,
        unsynced: s.events.filter((e) => !e.synced).length,
        tSec: s.tSec,
      };
    }
    function events() { return s.events.slice(); }
    function rulesCopy() { return Object.assign({}, R); }
    function setRule(k, v) { R[k] = v; }

    return { step, action, view, events, snapshot, restore, reboot, rules: rulesCopy, setRule, STATES, MODES };
  }

  function round(x, n) { const f = Math.pow(10, n); return Math.round(x * f) / f; }
  return { STATES, MODES, DEFAULT_RULES, createEngine };
});
