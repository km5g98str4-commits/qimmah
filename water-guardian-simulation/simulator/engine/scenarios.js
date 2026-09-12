/* Water Guardian — automated scenario campaign (Phase 6).
 * Each scenario is a timeline of plant/context changes plus an oracle that
 * returns {pass, detail}. The same runner drives the browser tab and
 * tests/run.mjs. Works in browser (window.WG) and Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./hydraulics.js'), require('./sensorModel.js'), require('./ruleEngine.js'));
  } else {
    root.WG = Object.assign(root.WG || {}, factory(root.WG, root.WG, root.WG));
  }
})(typeof self !== 'undefined' ? self : this, function (H, S, RE) {
  const BASE_PLANT = {
    trueLpm: 0, idMm: 16.6, wallMm: 4.2, material: 'PPR', sensorQuality: 100, airPct: 0,
    attachment: 'Good', coupling: 'Good', straight: 'Good', connected: true,
  };
  const BASE_CTX = { mode: 'QUIET', clockValid: true, wifi: true, backend: true };

  /**
   * Run one scenario headless.
   * @param {object} sc  {name, durationS, rules?, profile?, plant?, ctx?, timeline:[{atS, plant?, ctx?, action?, reboot?}], oracle(trace, engine)}
   * @param {object} opts {stepS (sim seconds per step, default 1), seed}
   */
  function run(sc, opts) {
    const stepS = (opts && opts.stepS) || 1;
    const seed = (opts && opts.seed) || 42;
    const profile = Object.assign({}, S.PROFILES[sc.profile || 'TUF2000M_PUBLISHED'], sc.profileOverrides || {});
    let sensor = S.createSensor(profile, seed);
    let engine = RE.createEngine(Object.assign({}, sc.rules || {}));
    const plant = Object.assign({}, BASE_PLANT, sc.plant || {});
    const ctx = Object.assign({}, BASE_CTX, sc.ctx || {});
    const timeline = (sc.timeline || []).slice().sort((a, b) => a.atS - b.atS);
    let ti = 0;
    const trace = { states: [], events: [], samples: [], statesSeen: new Set(), maxAboveMin: 0, trueLitres: 0, everZeroWhileFlowing: false, invalidCount: 0, validCount: 0 };
    let nvs = null;
    for (let t = 0; t <= sc.durationS; t += stepS) {
      while (ti < timeline.length && timeline[ti].atS <= t) {
        const ev = timeline[ti++];
        if (ev.plant) Object.assign(plant, ev.plant);
        if (ev.ctx) Object.assign(ctx, ev.ctx);
        if (ev.action) engine.action(ev.action);
        if (ev.reboot) { nvs = engine.snapshot(); trace.eventsArchive = (trace.eventsArchive || []).concat(engine.events()); engine = RE.createEngine(Object.assign({}, sc.rules || {})); engine.restore(nvs); sensor.reset(); trace.rebootedAtS = t; }
      }
      const sample = sensor.read(Object.assign({ tSec: t }, plant));
      const v = engine.step(sample, ctx);
      trace.trueLitres += H.litresOver(plant.trueLpm, stepS);
      if (sample.valid) trace.validCount++; else trace.invalidCount++;
      // The dangerous case: meter "valid" and says 0 while water is really flowing above threshold.
      if (sample.valid && sample.flowLpm === 0 && plant.trueLpm > engine.rules().flowThresholdLpm) trace.everZeroWhileFlowing = true;
      trace.statesSeen.add(v.state);
      trace.maxAboveMin = Math.max(trace.maxAboveMin, v.aboveMin);
      if (trace.states.length === 0 || trace.states[trace.states.length - 1].state !== v.state) trace.states.push({ tSec: t, state: v.state, link: v.link });
      if (t % 60 === 0) trace.samples.push({ tSec: t, trueLpm: plant.trueLpm, meterLpm: sample.flowLpm, valid: sample.valid, q: sample.quality, state: v.state, link: v.link });
    }
    // Archived events = those the pre-reboot engine had already synced and therefore dropped from NVS.
    trace.events = (trace.eventsArchive || []).concat(engine.events()).filter((e, i, a) => a.findIndex((x) => x.id === e.id && x.type === e.type) === i);
    trace.final = engine.view();
    trace.statesSeen = Array.from(trace.statesSeen);
    const verdict = sc.oracle(trace, engine);
    return { name: sc.name, id: sc.id, expected: sc.expected, pass: !!verdict.pass, detail: verdict.detail, trace, profile: profile.name, verdictNote: verdict.note || '' };
  }

  const seen = (tr, s) => tr.statesSeen.includes(s);
  const hasEvent = (tr, type) => tr.events.some((e) => e.type === type);

  /* ------------------------------------------------------------------ */
  /* Flow ladder rung: the rule threshold is set to 60 % of the test flow so the
   * question becomes purely "can the SENSOR PROFILE resolve this flow on this
   * pipe?" PASS = detected. A FAIL here is a finding, not a bug: the rung is
   * below the profile's usable range (or drowned in noise/cutoff). */
  const persistent = (id, lpm, idMm = 16.6) => ({
    id, name: `${lpm} L/min persistent flow, quiet, ID ${idMm} mm (threshold ${(lpm * 0.6).toFixed(2)} L/min)`,
    expected: 'UNEXPECTED_FLOW within the persistence window if the sensor profile can resolve this flow; otherwise reported as BELOW_PROFILE_USABLE_RANGE.',
    durationS: 40 * 60, plant: { trueLpm: lpm, idMm }, rules: { flowThresholdLpm: +(lpm * 0.6).toFixed(3) },
    timeline: [],
    oracle: (tr) => {
      const v = H.velocityFromLpm(lpm, idMm);
      const detected = seen(tr, 'UNEXPECTED_FLOW');
      const meterMean = mean(tr.samples.filter((x) => x.valid && x.meterLpm !== null).map((x) => x.meterLpm));
      return { pass: detected, detail: `v_true=${v.toFixed(3)} m/s; meter mean=${meterMean === null ? 'n/a' : meterMean.toFixed(3)} L/min; detected=${detected}; valid=${tr.validCount}, invalid=${tr.invalidCount}; zero-while-flowing=${tr.everZeroWhileFlowing}`, note: detected ? '' : 'BELOW_PROFILE_USABLE_RANGE_OR_NOISE' };
    },
  });
  /* Paired control: 0 L/min for 2 h at the SAME low threshold. PASS = no incident.
   * Together with the rung above this gives detection AND false-alarm behaviour. */
  const zeroControl = (id, lpm, idMm = 16.6) => ({
    id, name: `Zero-flow control at threshold ${(lpm * 0.6).toFixed(2)} L/min (2 h, ID ${idMm} mm)`,
    expected: 'No incident from noise/zero drift alone',
    durationS: 2 * 3600, plant: { trueLpm: 0, idMm }, rules: { flowThresholdLpm: +(lpm * 0.6).toFixed(3) },
    timeline: [],
    oracle: (tr) => { const det = seen(tr, 'UNEXPECTED_FLOW'); const mm = mean(tr.samples.filter((x) => x.valid && x.meterLpm !== null).map((x) => x.meterLpm)); return { pass: !det, detail: `meter mean at true 0 = ${mm === null ? 'n/a' : mm.toFixed(3)} L/min; falseIncident=${det}; states=${tr.statesSeen.join(',')}` }; },
  });
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  const SCENARIOS = [
    { id: 1, name: 'No flow during quiet period', expected: 'No alert', durationS: 60 * 60, plant: { trueLpm: 0 }, timeline: [],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW') && !seen(tr, 'REVIEW') && !seen(tr, 'PERSISTENT_FLOW'), detail: `states=${tr.statesSeen.join(',')}` }) },
    { id: 2, name: 'Short legitimate 5 L/min burst (90 s) in quiet', expected: 'No persistent-flow alert', durationS: 30 * 60, plant: { trueLpm: 0 },
      timeline: [{ atS: 60, plant: { trueLpm: 5 } }, { atS: 150, plant: { trueLpm: 0 } }],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW') && seen(tr, 'PERSISTENT_FLOW') && tr.final.state === 'NORMAL', detail: `states=${tr.statesSeen.join(',')}, maxAbove=${tr.maxAboveMin.toFixed(1)} min` }) },
    persistent(3, 0.25), zeroControl('3z', 0.25), persistent(4, 0.5), zeroControl('4z', 0.5), persistent(5, 1), zeroControl('5z', 1), persistent(6, 2), persistent(7, 5),
    { id: 8, name: 'Long legitimate flow (2 L/min, 40 min) during PRAYER', expected: 'No high-priority quiet alert (REVIEW allowed only after occupied persistence)', durationS: 45 * 60, plant: { trueLpm: 2 }, ctx: { mode: 'PRAYER' }, timeline: [{ atS: 40 * 60, plant: { trueLpm: 0 } }],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW') && seen(tr, 'EXPECTED_FLOW'), detail: `states=${tr.statesSeen.join(',')}` }) },
    { id: 9, name: 'Cleaning override during quiet hours (3 L/min for 30 min, override 60 min)', expected: 'EXPECTED_FLOW, no high-priority alert; override expiry logged', durationS: 90 * 60, plant: { trueLpm: 3 }, ctx: { mode: 'CLEANING', underlyingMode: 'QUIET' },
      timeline: [{ atS: 30 * 60, plant: { trueLpm: 0 } }],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW') && seen(tr, 'EXPECTED_FLOW') && hasEvent(tr, 'CLEANING_OVERRIDE_EXPIRED'), detail: `states=${tr.statesSeen.join(',')}, overrideExpired=${hasEvent(tr, 'CLEANING_OVERRIDE_EXPIRED')}` }) },
    { id: '9b', name: 'Cleaning override EXPIRES while 3 L/min continues in quiet hours', expected: 'After expiry the underlying QUIET rule applies → UNEXPECTED_FLOW', durationS: 90 * 60, plant: { trueLpm: 3 }, ctx: { mode: 'CLEANING', underlyingMode: 'QUIET' }, timeline: [],
      oracle: (tr) => ({ pass: seen(tr, 'UNEXPECTED_FLOW') && hasEvent(tr, 'CLEANING_OVERRIDE_EXPIRED'), detail: `states=${tr.statesSeen.join(',')}` }) },
    { id: 10, name: 'Sensor disconnected while 3 L/min flows (incident already open)', expected: 'SENSOR_UNKNOWN, never zero; incident NOT resolved by the outage', durationS: 40 * 60, plant: { trueLpm: 3 },
      timeline: [{ atS: 20 * 60, plant: { connected: false } }, { atS: 30 * 60, plant: { connected: true } }],
      oracle: (tr) => {
        const unk = seen(tr, 'SENSOR_UNKNOWN'); const resolvedDuringOutage = tr.events.some((e) => e.type === 'INCIDENT_RESOLVED' && e.tSec >= 20 * 60 && e.tSec <= 30 * 60);
        const openAfter = tr.final.incident !== null && tr.final.state === 'UNEXPECTED_FLOW';
        return { pass: unk && !resolvedDuringOutage && openAfter && !tr.everZeroWhileFlowing, detail: `unknown=${unk}, resolvedDuringOutage=${resolvedDuringOutage}, incidentOpenAfterRecovery=${openAfter}, zeroWhileFlowing=${tr.everZeroWhileFlowing}` };
      } },
    { id: 11, name: 'Internet disconnected during 3 L/min quiet flow', expected: 'Local detection continues; event buffered; synced on reconnection', durationS: 40 * 60, plant: { trueLpm: 3 }, ctx: { wifi: false },
      timeline: [{ atS: 30 * 60, ctx: { wifi: true } }],
      oracle: (tr) => {
        const det = tr.events.find((e) => e.type === 'UNEXPECTED_FLOW');
        const detectedOffline = det && det.tSec < 30 * 60;
        return { pass: !!detectedOffline && tr.final.unsynced === 0 && seen(tr, 'UNEXPECTED_FLOW'), detail: `detectedAt=${det ? det.tSec : 'never'}s (offline until 1800 s), unsyncedAtEnd=${tr.final.unsynced}` };
      } },
    { id: 12, name: 'Poor signal quality (sensor quality 35%) with 3 L/min', expected: 'SENSOR_UNKNOWN rather than a confident number; no alert built on invalid data', durationS: 30 * 60, plant: { trueLpm: 3, sensorQuality: 35 }, timeline: [],
      oracle: (tr) => ({ pass: seen(tr, 'SENSOR_UNKNOWN') && !seen(tr, 'UNEXPECTED_FLOW'), detail: `states=${tr.statesSeen.join(',')}, valid=${tr.validCount}, invalid=${tr.invalidCount}` }) },
    { id: 13, name: 'Large pipe (DN50 steel, ID 52.5 mm) with 0.5 L/min', expected: 'Velocity 0.004 m/s is far below any published min velocity → campaign must FLAG as undetectable (pass = honest flag, not a false detection)', durationS: 40 * 60, plant: { trueLpm: 0.5, idMm: 52.5, wallMm: 3.9, material: 'Steel' }, timeline: [],
      oracle: (tr, eng) => { const v = H.velocityFromLpm(0.5, 52.5); const det = seen(tr, 'UNEXPECTED_FLOW'); return { pass: !det, detail: `v=${v.toFixed(4)} m/s (< published 0.03 m/s min); detected=${det} → correctly NOT claimed. Meter reported 0 while flowing=${tr.everZeroWhileFlowing} — THIS is the blind spot a large pipe creates.`, note: 'UNDETECTABLE_BY_GEOMETRY' }; } },
    { id: 14, name: 'ESP32 reboot during open incident (3 L/min quiet)', expected: 'Incident restored from NVS; no duplicate alert; resolves later normally', durationS: 50 * 60, plant: { trueLpm: 3 },
      timeline: [{ atS: 20 * 60, reboot: true }, { atS: 40 * 60, plant: { trueLpm: 0 } }],
      oracle: (tr) => { const n = tr.events.filter((e) => e.type === 'UNEXPECTED_FLOW').length; const boot = tr.events.find((e) => e.type === 'BOOT'); return { pass: n === 1 && !!boot && boot.payload.restoredIncident === true && seen(tr, 'RESOLVED'), detail: `alerts=${n}, bootRestored=${boot && boot.payload.restoredIncident}, resolved=${seen(tr, 'RESOLVED')}` }; } },
    { id: 15, name: 'Flow stops after caretaker action (3 L/min → ACK → 0)', expected: 'INCIDENT_RESOLVED after resolve window', durationS: 40 * 60, plant: { trueLpm: 3 },
      timeline: [{ atS: 15 * 60, action: 'ACKNOWLEDGE' }, { atS: 20 * 60, plant: { trueLpm: 0 } }],
      oracle: (tr) => { const r = tr.events.find((e) => e.type === 'INCIDENT_RESOLVED'); return { pass: !!r && r.payload.ackType === 'ACKNOWLEDGE' && tr.final.state !== 'UNEXPECTED_FLOW', detail: `resolvedAt=${r ? r.tSec : 'never'}s, litres=${r ? r.payload.litres : '-'}` }; } },
    { id: 16, name: 'Invalid clock with 3 L/min for 30 min', expected: 'Conservative policy: treated as OCCUPIED → no high-priority alert within quiet window', durationS: 30 * 60, plant: { trueLpm: 3 }, ctx: { clockValid: false }, timeline: [],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW') && seen(tr, 'EXPECTED_FLOW'), detail: `states=${tr.statesSeen.join(',')}` }) },
    { id: 17, name: 'Sudden 8 L/min burst 30 s then 0, quiet', expected: 'No alert', durationS: 20 * 60, plant: { trueLpm: 0 }, timeline: [{ atS: 120, plant: { trueLpm: 8 } }, { atS: 150, plant: { trueLpm: 0 } }],
      oracle: (tr) => ({ pass: !seen(tr, 'UNEXPECTED_FLOW'), detail: `states=${tr.statesSeen.join(',')}` }) },
    { id: 18, name: 'Air/bubbles 80% with 3 L/min', expected: 'Meter step K/H → SENSOR_UNKNOWN; must not report a confident zero', durationS: 20 * 60, plant: { trueLpm: 3, airPct: 80 }, timeline: [],
      oracle: (tr) => ({ pass: seen(tr, 'SENSOR_UNKNOWN') && !tr.everZeroWhileFlowing, detail: `states=${tr.statesSeen.join(',')}, zeroWhileFlowing=${tr.everZeroWhileFlowing}` }) },
    { id: 19, name: 'Mount becomes Poor mid-incident (3 L/min)', expected: 'Degrades to SENSOR_UNKNOWN (or stays valid if Q still ≥ threshold); incident not silently resolved', durationS: 40 * 60, plant: { trueLpm: 3 }, timeline: [{ atS: 20 * 60, plant: { attachment: 'Poor' } }],
      oracle: (tr) => { const resolved = hasEvent(tr, 'INCIDENT_RESOLVED'); return { pass: !resolved && seen(tr, 'UNEXPECTED_FLOW'), detail: `states=${tr.statesSeen.join(',')}, resolved=${resolved}` }; } },
    { id: 20, name: 'Transient Modbus CRC/timeout errors (5 %) with 3 L/min', expected: 'Grace period absorbs transient errors; detection still occurs', durationS: 40 * 60, plant: { trueLpm: 3 }, profileOverrides: { commFailProb: 0.05 }, timeline: [],
      oracle: (tr) => ({ pass: seen(tr, 'UNEXPECTED_FLOW') && !seen(tr, 'SENSOR_UNKNOWN'), detail: `states=${tr.statesSeen.join(',')}, invalid=${tr.invalidCount}` }) },
    { id: 21, name: 'ZERO-FLOW FALSE-ALARM STRESS: 0 L/min for 3 h with CONSERVATIVE profile (zero drift +0.01 m/s)', expected: 'No incident — tests whether zero drift alone can cross the 0.5 L/min threshold on DN25', durationS: 3 * 3600, plant: { trueLpm: 0 }, profile: 'CONSERVATIVE', timeline: [],
      oracle: (tr) => { const drift = H.lpmFromVelocity(0.01, 16.6); return { pass: !seen(tr, 'UNEXPECTED_FLOW'), detail: `0.01 m/s zero drift on ID 16.6 mm = ${drift.toFixed(3)} L/min vs threshold 0.5; states=${tr.statesSeen.join(',')}` }; } },
  ];

  function runAll(opts) { return SCENARIOS.map((sc) => run(sc, opts)); }
  return { SCENARIOS, run, runAll, BASE_PLANT, BASE_CTX };
});
