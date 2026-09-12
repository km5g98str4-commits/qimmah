/* Water Guardian Digital Test Bench — UI glue. Everything computed by engine/*.js */
(function () {
  const $ = (id) => document.getElementById(id);
  const H = WG, S = WG, RE = WG, SC = WG;

  /* ---------------- state ---------------- */
  const plant = Object.assign({}, SC.BASE_PLANT);
  const ctx = Object.assign({}, SC.BASE_CTX, { underlyingMode: 'QUIET' });
  let profileKey = 'TUF2000M_PUBLISHED';
  let profile = Object.assign({}, S.PROFILES[profileKey]);
  let sensor = S.createSensor(profile, Date.now() & 0xffff);
  let engine = RE.createEngine({});
  let running = false, tSec = 0, lastFrame = null, trueLitres = 0, lastSample = null, lastView = engine.view();
  let phoneQueue = [], phoneDelivered = [], lastNotifiedIncidentId = null, lastResolvedId = null, burstUntil = null, burstPrev = 0;
  const nvsKey = 'wg_nvs';

  /* ---------------- controls ---------------- */
  const presetSel = $('pipePreset');
  H.PIPE_PRESETS.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.label; presetSel.appendChild(o); });
  presetSel.value = 'ppr25_pn20';
  presetSel.onchange = () => { const p = H.PIPE_PRESETS.find((x) => x.id === presetSel.value); $('material').value = p.material; $('idMm').value = p.idMm; $('wallMm').value = p.wallMm; syncPlant(); };
  ['material', 'idMm', 'wallMm', 'attach', 'coupling', 'straight', 'sensorConn'].forEach((id) => ($(id).oninput = syncPlant));
  ['flow', 'sq', 'air'].forEach((id) => ($(id).oninput = syncPlant));
  ['mode', 'clock', 'wifi', 'backend'].forEach((id) => ($(id).oninput = syncCtx));
  document.querySelectorAll('[data-flow]').forEach((b) => (b.onclick = () => { $('flow').value = b.dataset.flow; syncPlant(); }));

  const profSel = $('profile');
  Object.keys(S.PROFILES).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = S.PROFILES[k].name; profSel.appendChild(o); });
  profSel.value = profileKey;
  profSel.onchange = () => { profileKey = profSel.value; profile = Object.assign({}, S.PROFILES[profileKey]); fillProfile(); rebuildSensor(); };
  const PKEYS = ['minVelocityMs', 'lowFlowCutoffMs', 'accuracyPct', 'noiseAbsMs', 'zeroOffsetMs', 'updateIntervalS', 'commFailProb'];
  PKEYS.forEach((k) => ($('p_' + k).oninput = () => { profile[k] = parseFloat($('p_' + k).value); profile.name = 'CUSTOM (edited)'; rebuildSensor(); }));
  function fillProfile() { PKEYS.forEach((k) => ($('p_' + k).value = profile[k])); $('profileSource').textContent = profile.source; }
  function rebuildSensor() { sensor = S.createSensor(profile, Date.now() & 0xffff); renderHyd(); }

  const RKEYS = ['flowThresholdLpm', 'hysteresisPct', 'persistenceMinQuiet', 'persistenceMinOccupied', 'cleaningOverrideMin', 'resolveMin', 'qualityThreshold', 'sensorUnknownGraceS'];
  function fillRules() { const R = engine.rules(); RKEYS.forEach((k) => ($('r_' + k).value = R[k])); }
  RKEYS.forEach((k) => ($('r_' + k).oninput = () => engine.setRule(k, parseFloat($('r_' + k).value))));

  function syncPlant() {
    plant.trueLpm = parseFloat($('flow').value); plant.material = $('material').value; plant.idMm = parseFloat($('idMm').value); plant.wallMm = parseFloat($('wallMm').value);
    plant.sensorQuality = parseFloat($('sq').value); plant.airPct = parseFloat($('air').value); plant.attachment = $('attach').value; plant.coupling = $('coupling').value; plant.straight = $('straight').value;
    plant.connected = $('sensorConn').value === '1';
    $('vFlow').textContent = plant.trueLpm.toFixed(2) + ' L/min'; $('vSq').textContent = plant.sensorQuality + '%'; $('vAir').textContent = plant.airPct + '%';
    const v = H.velocityFromLpm(plant.trueLpm, plant.idMm);
    $('vVel').textContent = v.toFixed(3) + ' m/s'; $('vArea').textContent = (H.areaM2(plant.idMm) * 1e6).toFixed(1) + ' mm²';
    $('vVel').style.color = v < profile.minVelocityMs && plant.trueLpm > 0 ? 'var(--bad)' : 'var(--good)';
    renderHyd();
  }
  function syncCtx() {
    const m = $('mode').value; if (m !== 'CLEANING') ctx.underlyingMode = m; ctx.mode = m;
    ctx.clockValid = $('clock').value === '1'; ctx.wifi = $('wifi').value === '1'; ctx.backend = $('backend').value === '1';
  }

  /* ---------------- failure buttons ---------------- */
  document.querySelectorAll('[data-fail]').forEach((b) => (b.onclick = () => fail(b.dataset.fail)));
  function fail(kind) {
    const set = (id, v) => { $(id).value = v; };
    switch (kind) {
      case 'disconnect': set('sensorConn', '0'); break;
      case 'wifi': set('wifi', '0'); break;
      case 'backend': set('backend', '0'); break;
      case 'poor': set('sq', 35); break;
      case 'air': set('air', 60); break;
      case 'mount': set('attach', 'Poor'); break;
      case 'clock': set('clock', '0'); break;
      case 'burst': burstPrev = parseFloat($('flow').value); set('flow', 8); burstUntil = tSec + 30; break;
      case 'reboot': reboot(); break;
      case 'restore': set('sensorConn', '1'); set('wifi', '1'); set('backend', '1'); set('sq', 100); set('air', 0); set('attach', 'Good'); set('coupling', 'Good'); set('straight', 'Good'); set('clock', '1'); break;
    }
    syncPlant(); syncCtx();
  }
  function reboot() {
    // What the ESP32 does: persist incident + unsynced events to NVS, restart, restore.
    try { localStorage.setItem(nvsKey, engine.snapshot()); } catch (e) { /* ignore */ }
    const snap = engine.snapshot();
    engine = RE.createEngine(rulesFromForm()); engine.restore(snap); sensor.reset();
    pushPhone('🔁 Device rebooted. Restored incident from NVS: ' + (engine.view().incident ? 'YES (#' + engine.view().incident.id + ')' : 'none'), true);
  }
  function rulesFromForm() { const r = {}; RKEYS.forEach((k) => (r[k] = parseFloat($('r_' + k).value))); return r; }

  /* ---------------- run loop ---------------- */
  $('btnRun').onclick = () => { running = true; lastFrame = null; };
  $('btnPause').onclick = () => { running = false; };
  $('btnReset').onclick = () => { running = false; tSec = 0; trueLitres = 0; engine = RE.createEngine(rulesFromForm()); sensor.reset(); phoneQueue = []; phoneDelivered = []; lastNotifiedIncidentId = null; lastResolvedId = null; fail('restore'); $('flow').value = 0; syncPlant(); render(); };

  let accum = 0;
  function frame(ts) {
    if (running) {
      if (lastFrame === null) lastFrame = ts;
      const real = (ts - lastFrame) / 1000; lastFrame = ts;
      accum += real * parseFloat($('speed').value);
      let steps = 0;
      while (accum >= 1 && steps < 2000) { tick(1); accum -= 1; steps++; }
      if (steps === 2000) accum = 0; // clamp on tab-inactive catch-up
    }
    render(); requestAnimationFrame(frame);
  }
  function tick(dt) {
    tSec += dt;
    if (burstUntil !== null && tSec >= burstUntil) { burstUntil = null; $('flow').value = burstPrev; syncPlant(); }
    lastSample = sensor.read(Object.assign({ tSec }, plant));
    lastView = engine.step(lastSample, ctx);
    trueLitres += H.litresOver(plant.trueLpm, dt);
    notify();
  }

  /* ---------------- notifications (emulator) ---------------- */
  function notify() {
    const inc = lastView.incident;
    if (inc && inc.id !== lastNotifiedIncidentId && inc.priority !== 'EXPECTED') {
      lastNotifiedIncidentId = inc.id;
      const hi = inc.priority === 'HIGH';
      pushPhone(`${hi ? '⚠️ Unexpected Water Consumption' : '🟣 Review: long continuous water use'}\n\nLocation: Mosque Pilot\nMonitored Zone: Ablution Supply\n\nFlow: ${inc.lastFlowLpm.toFixed(1)} L/min\nDuration: ${inc.durationMin.toFixed(0)} min\nMode: ${inc.mode}\nSensor: ${inc.quality >= 80 ? 'Healthy' : 'Marginal (Q=' + inc.quality + ')'}\n\nReason:\n${inc.reason}\n\n${hi ? 'Please inspect the facility.' : 'No action required unless unexpected.'}`);
    }
    const ev = engine.events().slice(-1)[0];
    if (ev && ev.type === 'INCIDENT_RESOLVED' && ev.id !== lastResolvedId) {
      lastResolvedId = ev.id;
      pushPhone(`✅ Incident resolved.\nFlow returned below the configured detection threshold.\nDuration: ${ev.payload.durationMin} min · est. ${ev.payload.litres} L`);
    }
    if (ev && ev.type === 'SENSOR_UNKNOWN' && ev.id !== lastResolvedId && !ev._shown) { ev._shown = true; pushPhone(`🟠 Sensor status UNKNOWN (${ev.payload.reason}).\nWater use cannot be confirmed as zero. Incident open: ${ev.payload.incidentOpen ? 'yes' : 'no'}.`); }
    // delivery
    const online = ctx.wifi && ctx.backend;
    if (online && phoneQueue.length) { phoneQueue.forEach((m) => { m.deliveredAt = tSec; phoneDelivered.push(m); }); phoneQueue = []; }
  }
  function pushPhone(text, local) {
    const m = { text, createdAt: tSec, deliveredAt: null };
    if (local || (ctx.wifi && ctx.backend)) { m.deliveredAt = tSec; phoneDelivered.push(m); } else phoneQueue.push(m);
  }

  /* ---------------- render ---------------- */
  const canvas = $('scene'), cx = canvas.getContext('2d');
  let phase = 0;
  function render() {
    const v = lastView, smp = lastSample;
    $('kClock').textContent = fmt(tSec);
    $('kMeter').textContent = smp ? (smp.commOk ? (smp.valid ? smp.flowLpm.toFixed(2) + ' L/min' : 'INVALID') : 'NO COMM') : '—';
    $('kMeter').className = 'v ' + (smp && smp.commOk && smp.valid ? 'good' : 'bad');
    $('kSig').textContent = smp && smp.commOk ? `${smp.strengthUp}/${smp.strengthDown} · Q${smp.quality} · ${smp.workingStep}` : '—';
    $('kAbove').textContent = v.aboveMin.toFixed(1) + ' min';
    $('dLink').textContent = v.link; $('dLink').className = 'v ' + (v.link === 'ONLINE' ? 'good' : 'warn');
    $('dUnsynced').textContent = v.unsynced; $('dLitres').textContent = v.incident ? v.incident.litres.toFixed(1) + ' L' : '0'; $('dTrue').textContent = trueLitres.toFixed(1) + ' L';
    // states
    const st = $('states'); st.innerHTML = '';
    RE.STATES.concat(['OFFLINE']).forEach((s) => { const d = document.createElement('span'); const on = s === 'OFFLINE' ? v.link === 'OFFLINE' : v.state === s; d.className = 'state ' + (on ? 'on ' + s : ''); d.textContent = s; st.appendChild(d); });
    renderIncident(v); renderPhone(); renderLog();
    drawScene(v, smp);
  }
  function renderIncident(v) {
    const el = $('incident'); const inc = v.incident;
    if (!inc) { const last = engine.events().slice().reverse().find((e) => e.type === 'INCIDENT_RESOLVED'); el.innerHTML = v.state === 'RESOLVED' && last ? `<div class="incident resolved"><h3>✅ INCIDENT RESOLVED</h3><div>Flow returned below the detection threshold. Duration ${last.payload.durationMin} min · est. ${last.payload.litres} L · closed as ${last.payload.ackType || 'unacknowledged'}.</div></div>` : ''; return; }
    const hi = inc.priority === 'HIGH';
    el.innerHTML = `<div class="incident ${hi ? '' : 'low'}"><h3>${hi ? '⚠️ Unexpected Continuous Water Use' : inc.priority === 'EXPECTED' ? '🔵 Expected activity (confirmed by caretaker)' : '🟣 Review: long continuous water use (occupied period)'}</h3>
      <dl><dt>Measured flow</dt><dd>${inc.lastFlowLpm.toFixed(2)} L/min (peak ${inc.peakLpm.toFixed(2)})</dd>
      <dt>Duration</dt><dd>${inc.durationMin.toFixed(1)} min</dd><dt>Facility mode</dt><dd>${inc.mode}</dd>
      <dt>Sensor quality</dt><dd>${inc.quality}%</dd><dt>Estimated suspect consumption</dt><dd>${inc.litres.toFixed(1)} litres</dd>
      <dt>Reason</dt><dd>“${inc.reason}”</dd><dt>Status</dt><dd>${inc.acked ? 'Acknowledged (' + inc.ackType + ')' : 'Open — awaiting caretaker'}</dd></dl>
      <div class="row"><button id="ack">ACKNOWLEDGE</button><button id="exp">EXPECTED ACTIVITY</button><button id="chk">INCIDENT CHECKED</button></div>
      <div class="note">This is a persistent-unexpected-flow claim, not a leak diagnosis. A single aggregate meter cannot identify the fixture.</div></div>`;
    $('ack').onclick = () => engine.action('ACKNOWLEDGE'); $('exp').onclick = () => engine.action('EXPECTED_ACTIVITY'); $('chk').onclick = () => engine.action('INCIDENT_CHECKED');
  }
  function renderPhone() {
    const ph = $('phone'); const all = phoneDelivered.map((m) => ({ m, q: false })).concat(phoneQueue.map((m) => ({ m, q: true })));
    ph.innerHTML = all.slice(-12).map(({ m, q }) => `<div class="msg ${q ? 'queued' : ''}"><div class="ts">${q ? '⏳ queued (offline) · created ' : '📨 delivered '}${fmt(q ? m.createdAt : m.deliveredAt)}${!q && m.deliveredAt !== m.createdAt ? ' (created ' + fmt(m.createdAt) + ')' : ''}</div>${esc(m.text)}</div>`).join('') || '<div class="note">No notifications yet.</div>';
    ph.scrollTop = ph.scrollHeight;
  }
  let lastLogLen = -1;
  function renderLog() {
    const ev = engine.events(); if (ev.length === lastLogLen && !ev.some((e) => e._dirty)) return; lastLogLen = ev.length;
    $('tab-log').innerHTML = ev.slice(-60).map((e) => `<div class="${e.synced ? '' : 'unsynced'}">${fmt(e.tSec)} #${e.id} ${e.type} ${esc(JSON.stringify(e.payload))} ${e.synced ? '✓' : '⏳ unsynced'}</div>`).join('');
    $('tab-log').scrollTop = 1e9;
  }
  function renderHyd() {
    const flows = [0.25, 0.5, 1, 2, 5], ids = [13.2, 16.6, 21.2, 26.6, 33.2, 52.5, plant.idMm].filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a - b);
    const t = H.velocityTable(flows, ids); const min = profile.minVelocityMs || 0.0001;
    let html = '<tr><th>L/min ↓ / ID mm →</th>' + ids.map((i) => `<th>${i}${i === plant.idMm ? ' ★' : ''}</th>`).join('') + '</tr>';
    t.forEach((r) => { html += `<tr><td>${r.lpm}</td>` + r.byId.map((c) => { const cls = c.vMs >= 2 * min ? 'ok' : c.vMs >= min ? 'marg' : 'bad'; return `<td class="${cls}">${c.vMs.toFixed(4)} m/s</td>`; }).join('') + '</tr>'; });
    html += `<tr><td colspan="${ids.length + 1}" class="note">Profile min velocity = ${min} m/s (${profile.name}). ★ = current pipe.</td></tr>`;
    $('hydTable').innerHTML = html;
  }

  /* ---------------- scene ---------------- */
  function drawScene(v, smp) {
    const W = canvas.width, Hh = canvas.height; cx.clearRect(0, 0, W, Hh);
    cx.font = '12px system-ui'; cx.textAlign = 'center';
    // tank
    const level = Math.max(0.15, 1 - (trueLitres % 200) / 200);
    cx.strokeStyle = '#64748b'; cx.lineWidth = 2; cx.strokeRect(30, 60, 90, 150);
    cx.fillStyle = '#0ea5e9'; cx.globalAlpha = .6; cx.fillRect(32, 60 + 148 * (1 - level), 86, 148 * level); cx.globalAlpha = 1;
    cx.fillStyle = '#cbd5e1'; cx.fillText('Tank', 75, 50);
    // pipe
    const py = 180, x0 = 120, x1 = 560, ph = 28;
    cx.fillStyle = '#334155'; cx.fillRect(x0, py - ph / 2, x1 - x0, ph);
    cx.fillStyle = '#0ea5e9'; cx.globalAlpha = plant.trueLpm > 0 ? .5 : .2; cx.fillRect(x0, py - ph / 2 + 4, x1 - x0, ph - 8); cx.globalAlpha = 1;
    // moving water particles (speed ∝ true velocity)
    const vel = H.velocityFromLpm(plant.trueLpm, plant.idMm);
    phase = (phase + vel * 400 * (running ? 1 : 0)) % 40;
    if (plant.trueLpm > 0) { cx.fillStyle = '#e0f2fe'; for (let x = x0 + phase; x < x1; x += 40) { cx.beginPath(); cx.arc(x, py + Math.sin(x / 15) * 6, 3, 0, 7); cx.fill(); } }
    // bubbles
    if (plant.airPct > 0) { cx.fillStyle = '#fff'; cx.globalAlpha = .7; for (let i = 0; i < plant.airPct / 5; i++) { const x = x0 + ((i * 97 + phase * 3) % (x1 - x0)); cx.beginPath(); cx.arc(x, py - 6 + (i % 3) * 5, 2, 0, 7); cx.fill(); } cx.globalAlpha = 1; }
    cx.fillStyle = '#cbd5e1'; cx.fillText(`${plant.material} · ID ${plant.idMm} mm · wall ${plant.wallMm} mm · v=${vel.toFixed(3)} m/s`, (x0 + x1) / 2, py + 40);
    // sensor clamp
    const sx = 330; const det = plant.attachment === 'Detached';
    cx.fillStyle = det ? '#7f1d1d' : plant.attachment === 'Poor' ? '#92400e' : '#1d4ed8';
    cx.fillRect(sx - 45, py - ph / 2 - (det ? 40 : 14), 30, 14); cx.fillRect(sx + 15, py - ph / 2 - (det ? 40 : 14), 30, 14);
    cx.fillStyle = '#cbd5e1'; cx.fillText('Clamp-on transducers (MODEL)', sx, py - 46 - (det ? 26 : 0));
    if (plant.coupling !== 'Good') { cx.fillStyle = '#fbbf24'; cx.fillText('couplant: ' + plant.coupling, sx, py - 30 - (det ? 26 : 0)); }
    // meter box
    box(620, 40, 130, 70, 'Flow meter', smp && smp.commOk ? (smp.valid ? smp.flowLpm.toFixed(2) + ' L/min' : 'step ' + smp.workingStep) : 'no reply', smp && smp.commOk ? (smp.valid ? '#34d399' : '#fb923c') : '#f87171');
    link(sx, py - ph / 2 - 14, 620, 75, '#94a3b8');
    // RS485
    cx.fillStyle = plant.connected ? '#34d399' : '#f87171'; cx.fillText(plant.connected ? 'RS485 A/B' : 'RS485 ✕', 705, 130);
    // ESP32
    box(640, 150, 90, 60, 'ESP32', v.state, stateColor(v.state)); link(685, 110, 685, 150, plant.connected ? '#34d399' : '#f87171');
    // rule engine
    box(640, 240, 90, 60, 'Rule engine', `${v.aboveMin.toFixed(0)} min > thr`, '#38bdf8'); link(685, 210, 685, 240, '#94a3b8');
    // wifi/cloud
    const online = v.link === 'ONLINE';
    box(790, 150, 90, 60, 'Wi-Fi/Backend', online ? 'ONLINE' : 'OFFLINE', online ? '#34d399' : '#94a3b8'); link(730, 180, 790, 180, online ? '#34d399' : '#f87171');
    box(790, 240, 90, 60, 'Dashboard/Phone', v.unsynced ? v.unsynced + ' queued' : 'synced', v.unsynced ? '#fbbf24' : '#34d399'); link(835, 210, 835, 240, '#94a3b8');
    // caption
    cx.fillStyle = '#8fa3b8'; cx.textAlign = 'left'; cx.fillText('Mode: ' + v.effectiveMode + (v.clockValid ? '' : ' (CLOCK INVALID → conservative)') + ' · sim ' + fmt(tSec), 20, Hh - 12);
  }
  function box(x, y, w, h, title, val, color) { cx.fillStyle = '#1e2c3d'; cx.strokeStyle = color; cx.lineWidth = 2; cx.fillRect(x, y, w, h); cx.strokeRect(x, y, w, h); cx.fillStyle = '#8fa3b8'; cx.textAlign = 'center'; cx.fillText(title, x + w / 2, y + 18); cx.fillStyle = color; cx.font = 'bold 12px system-ui'; cx.fillText(String(val).slice(0, 18), x + w / 2, y + 42); cx.font = '12px system-ui'; }
  function link(x0, y0, x1, y1, c) { cx.strokeStyle = c; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); }
  function stateColor(s) { return { NORMAL: '#34d399', EXPECTED_FLOW: '#7dd3fc', PERSISTENT_FLOW: '#fbbf24', UNEXPECTED_FLOW: '#f87171', REVIEW: '#a78bfa', SENSOR_UNKNOWN: '#fb923c', RESOLVED: '#86efac' }[s] || '#fff'; }
  function fmt(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; }
  function esc(t) { return String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }

  /* ---------------- tabs & scenario runner ---------------- */
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); ['log', 'hyd', 'scen'].forEach((t) => $('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab)); }));
  $('runAll').onclick = () => {
    $('scenStatus').textContent = 'running…'; setTimeout(() => {
      const res = SC.runAll({ stepS: 1 }); const n = res.filter((r) => r.pass).length;
      $('scenStatus').textContent = `${n}/${res.length} PASS (profile: ${res[0].profile})`;
      $('scenarioOut').innerHTML = '<table><tr><th>#</th><th>Scenario</th><th>Expected</th><th>Result</th><th>Detail</th></tr>' + res.map((r) => `<tr><td>${r.id}</td><td style="text-align:left">${esc(r.name)}</td><td style="text-align:left">${esc(r.expected)}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}${r.verdictNote ? '<br><span class="badge">' + r.verdictNote + '</span>' : ''}</td><td style="text-align:left">${esc(r.detail)}</td></tr>`).join('') + '</table>';
    }, 30);
  };

  /* ---------------- boot ---------------- */
  fillProfile(); fillRules(); syncPlant(); syncCtx(); renderHyd(); render(); requestAnimationFrame(frame);
})();
