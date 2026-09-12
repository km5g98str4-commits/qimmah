/* Water Guardian — configurable clamp-on ultrasonic sensor MODEL.
 *
 * ⚠️ This is NOT a physics simulation of transit-time ultrasound through a
 * pipe wall. It is an INTERFACE + BEHAVIOUR model: given the true flow and a
 * set of installation conditions, it produces what a meter would REPORT
 * (flow value, signal strength, quality Q, working-step/error code, comm ok).
 * Every numeric parameter is a user-editable ASSUMPTION unless the profile
 * says "published spec" — and even published specs (min velocity, accuracy)
 * only tell us what the manufacturer CLAIMS, not what a DN25 PPR pipe at
 * 0.25 L/min will really do. That remains NOT YET PHYSICALLY VERIFIED.
 *
 * Works in browser (window.WG) and Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./hydraulics.js'));
  } else {
    root.WG = Object.assign(root.WG || {}, factory(root.WG));
  }
})(typeof self !== 'undefined' ? self : this, function (H) {
  /* ---------- Deterministic PRNG (mulberry32) so tests are repeatable ---------- */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /* ---------- Profiles ----------
   * minVelocityMs      : below this the meter output is treated as unusable
   * lowFlowCutoffMs    : velocity below which the meter REPORTS 0 (M41-style cutoff)
   * accuracyPct        : proportional error (1σ) of the reported value
   * noiseAbsMs         : additive velocity noise (1σ) — dominates at low flow
   * zeroOffsetMs       : systematic zero drift (can be ±)
   * qualityThreshold   : Q below which the reading is flagged INVALID by our firmware
   * updateIntervalS    : meter measurement/refresh period
   * commFailProb       : probability that a Modbus poll fails (timeout/CRC)
   * source             : provenance tag for the UI
   */
  const PROFILES = {
    IDEAL: {
      name: 'IDEAL (assumption)',
      source: 'ASSUMED — best case, used only to check the logic',
      minVelocityMs: 0.0,
      lowFlowCutoffMs: 0.0,
      accuracyPct: 0.5,
      noiseAbsMs: 0.0005,
      zeroOffsetMs: 0.0,
      qualityThreshold: 50,
      updateIntervalS: 1,
      commFailProb: 0.0,
    },
    CONSERVATIVE: {
      name: 'CONSERVATIVE (assumption)',
      source: 'ASSUMED — pessimistic: 0.05 m/s cutoff, 3% error, 0.01 m/s noise, ±0.01 m/s zero drift',
      minVelocityMs: 0.05,
      lowFlowCutoffMs: 0.05,
      accuracyPct: 3.0,
      noiseAbsMs: 0.01,
      zeroOffsetMs: 0.01,
      qualityThreshold: 60,
      updateIntervalS: 1,
      commFailProb: 0.01,
    },
    /* Values below are ONLY those published by the manufacturer for the
     * TUF-2000M family (see docs/SENSOR_COMPARISON.md and research/notes/
     * tuf2000m.md for the sources). Everything not published is copied from
     * CONSERVATIVE and marked as an assumption. */
    TUF2000M_PUBLISHED: {
      name: 'TUF-2000M (published spec + assumptions)',
      source:
        'PUBLISHED (manual v13.44, research/notes/tuf2000m.md): accuracy "better than 1 %", repeatability "better than 0.2 %", ' +
        'measurement period 500 ms, M41 low-flow cutoff default 0.03 m/s, M40 damping default 10 s. Velocity range ±0.01–12 m/s is a VENDOR claim (not in the manual). ' +
        'ASSUMED: noiseAbsMs 0.005, zeroOffsetMs 0.005, commFailProb 0.5 %.',
      minVelocityMs: 0.03,
      lowFlowCutoffMs: 0.03,
      accuracyPct: 1.0,
      noiseAbsMs: 0.005,
      zeroOffsetMs: 0.005,
      qualityThreshold: 60,
      updateIntervalS: 0.5,
      commFailProb: 0.005,
    },
    /* Pessimistic profile built from SECONDARY field reports of the TUF-2000M on small
     * (22–28 mm copper) pipes: "huge oscillations around zero when there is no flow",
     * "steadily drifting", "too noisy to detect really low flows". No numbers were
     * published, so the magnitudes below are our ASSUMED reading of "huge" — they are the
     * case the physical test must confirm or refute. */
    TUF2000M_FIELD_REPORTS: {
      name: 'TUF-2000M small-pipe FIELD REPORTS (pessimistic, assumed magnitudes)',
      source:
        'SECONDARY reports (partofthething.com ESP8266 on ~28 mm copper; HA community 22 mm): zero-flow oscillation and drift. ' +
        'ASSUMED magnitudes: noise 0.05 m/s (1σ), zero offset +0.03 m/s, cutoff left at 0.03 m/s, 3 % accuracy.',
      minVelocityMs: 0.03,
      lowFlowCutoffMs: 0.03,
      accuracyPct: 3.0,
      noiseAbsMs: 0.05,
      zeroOffsetMs: 0.03,
      qualityThreshold: 60,
      updateIntervalS: 0.5,
      commFailProb: 0.005,
    },
    CUSTOM: {
      name: 'CUSTOM',
      source: 'User-defined',
      minVelocityMs: 0.03,
      lowFlowCutoffMs: 0.03,
      accuracyPct: 2.0,
      noiseAbsMs: 0.005,
      zeroOffsetMs: 0.0,
      qualityThreshold: 60,
      updateIntervalS: 1,
      commFailProb: 0.0,
    },
  };

  /* Material acoustic "difficulty" — ASSUMED ordinal ranking, NOT manufacturer data.
   * Rationale: homogeneous metals and rigid plastics couple well; PPR/PP is
   * softer and more attenuating; galvanized steel has a zinc layer / scale;
   * unknown = pessimistic. Used only to scale the simulated signal strength. */
  const MATERIAL_FACTOR = {
    PPR: 0.75,
    PVC: 0.9,
    CPVC: 0.9,
    Copper: 1.0,
    Steel: 0.95,
    'Galvanized Steel': 0.8,
    'Custom/Unknown': 0.6,
  };
  const ATTACH_FACTOR = { Good: 1.0, Poor: 0.55, Detached: 0.0 };
  const COUPLING_FACTOR = { Good: 1.0, Poor: 0.5, Missing: 0.1 };
  const STRAIGHT_FACTOR = { Good: 1.0, Marginal: 0.85, Poor: 0.65 }; // affects accuracy more than strength

  /**
   * Create a sensor instance.
   * @param {object} profile   one of PROFILES (may be edited copy)
   * @param {number} seed      RNG seed for repeatability
   */
  function createSensor(profile, seed) {
    const p = Object.assign({}, PROFILES.CONSERVATIVE, profile || {});
    const rng = makeRng(seed || 1);
    let lastUpdate = -Infinity;
    let cached = null;

    /**
     * Produce one meter report.
     * @param {object} inp  {tSec, trueLpm, idMm, material, wallMm, sensorQuality(0-100),
     *                       airPct(0-100), attachment, coupling, straight, connected(bool)}
     * @returns {object} {commOk, flowLpm, velocityMs, strengthUp, strengthDown, quality,
     *                    workingStep, valid, invalidReason, raw}
     */
    function read(inp) {
      // Respect the meter update interval: return cached value between refreshes.
      if (cached && inp.tSec - lastUpdate < p.updateIntervalS && inp.connected === cached._connected) {
        return cached;
      }
      lastUpdate = inp.tSec;

      // --- Communication layer (RS485/Modbus) ---
      if (!inp.connected) {
        cached = mk({ commOk: false, invalidReason: 'NO_RESPONSE (timeout)' }, inp);
        return cached;
      }
      if (rng() < p.commFailProb) {
        cached = mk({ commOk: false, invalidReason: 'CRC/TIMEOUT (transient)' }, inp);
        return cached;
      }

      // --- Signal strength model (0–100, ASSUMED scale mirroring TUF "0–99.9") ---
      const mat = MATERIAL_FACTOR[inp.material] ?? 0.6;
      const att = ATTACH_FACTOR[inp.attachment] ?? 1;
      const cpl = COUPLING_FACTOR[inp.coupling] ?? 1;
      const air = 1 - Math.min(1, Math.max(0, inp.airPct / 100)) * 0.9;
      const wallPenalty = Math.max(0.5, 1 - Math.max(0, (inp.wallMm - 3) * 0.05)); // thick walls attenuate
      const base = (inp.sensorQuality / 100) * mat * att * cpl * air * wallPenalty;
      const strength = clamp(base * 100 + gauss(rng) * 2, 0, 99.9);
      const quality = clamp(base * 100 + gauss(rng) * 3, 0, 99);

      // Working step / error code, modelled on the TUF-2000M letter codes
      // ("R" normal, "I" no signal, "J" hardware, "H" poor signal, "Q" freq
      // adjusting, "G" gain adjusting, "K" empty pipe — see research notes).
      let workingStep = 'R';
      if (att === 0 || strength < 5) workingStep = 'I'; // no signal
      else if (strength < 30) workingStep = 'H'; // poor signal / low quality
      else if (inp.airPct > 70) workingStep = 'K'; // empty/aerated pipe
      else if (quality < p.qualityThreshold) workingStep = 'H';

      // --- Measurement model ---
      const vTrue = H.velocityFromLpm(inp.trueLpm, inp.idMm);
      const straight = STRAIGHT_FACTOR[inp.straight] ?? 1;
      const extraErrPct = (1 - straight) * 20 + (inp.airPct / 100) * 15; // ASSUMED
      let v = vTrue;
      v += vTrue * ((p.accuracyPct + extraErrPct) / 100) * gauss(rng);
      v += p.noiseAbsMs * gauss(rng) * (1 + (100 - strength) / 50); // noise grows as signal weakens
      v += p.zeroOffsetMs;
      // Bubbles bias transit-time meters — sign is NOT known a priori; keep symmetric random walk.
      if (inp.airPct > 0) v += (inp.airPct / 100) * 0.02 * gauss(rng);

      if (workingStep === 'I' || workingStep === 'K') v = 0; // meter shows 0 with no signal — the DANGEROUS case
      if (Math.abs(v) < p.lowFlowCutoffMs) v = 0; // M41-style low-flow cutoff

      const flowLpm = H.lpmFromVelocity(v, inp.idMm);
      const valid = workingStep === 'R' && quality >= p.qualityThreshold && strength >= 30;
      let invalidReason = null;
      if (!valid) {
        invalidReason =
          workingStep !== 'R'
            ? `WORKING_STEP_${workingStep}`
            : quality < p.qualityThreshold
              ? `QUALITY_${quality.toFixed(0)}<${p.qualityThreshold}`
              : `STRENGTH_${strength.toFixed(0)}<30`;
      }
      cached = mk(
        {
          commOk: true,
          flowLpm: round(flowLpm, 3),
          velocityMs: round(v, 4),
          strengthUp: round(strength, 1),
          strengthDown: round(clamp(strength + gauss(rng), 0, 99.9), 1),
          quality: round(quality, 0),
          workingStep,
          valid,
          invalidReason,
          belowMinVelocity: vTrue < p.minVelocityMs,
          trueVelocityMs: round(vTrue, 4),
        },
        inp,
      );
      return cached;
    }

    function mk(o, inp) {
      return Object.assign(
        {
          commOk: false,
          flowLpm: null,
          velocityMs: null,
          strengthUp: null,
          strengthDown: null,
          quality: null,
          workingStep: null,
          valid: false,
          invalidReason: null,
          belowMinVelocity: null,
          trueVelocityMs: null,
          tSec: inp.tSec,
          _connected: inp.connected,
        },
        o,
      );
    }
    function reset() { cached = null; lastUpdate = -Infinity; }
    return { read, reset, profile: p };
  }

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function round(x, n) { const f = Math.pow(10, n); return Math.round(x * f) / f; }

  return { PROFILES, MATERIAL_FACTOR, createSensor, makeRng };
});
