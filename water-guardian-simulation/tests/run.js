#!/usr/bin/env node
/* Water Guardian — Phase 6 virtual test campaign runner.
 * Runs every scenario against the three sensor profiles, writes
 *   tests/results/campaign-<profile>.json  and  tests/results/CAMPAIGN_RESULTS.md
 * Exit code 1 only if a LOGIC scenario fails (flow-ladder rungs are findings, not failures).
 */
const fs = require('fs');
const path = require('path');
const SC = require('../simulator/engine/scenarios.js');
const S = require('../simulator/engine/sensorModel.js');

/* Run matrix. `stress: true` runs are FINDINGS-ONLY: their failures are the information we
 * want (what a noisy meter does to the rules), never counted as logic failures. */
const RUNS = [
  { key: 'TUF2000M_PUBLISHED', profile: 'TUF2000M_PUBLISHED' },
  { key: 'CONSERVATIVE', profile: 'CONSERVATIVE' },
  { key: 'IDEAL', profile: 'IDEAL' },
  { key: 'FIELD_REPORTS_RAW', profile: 'TUF2000M_FIELD_REPORTS', stress: true,
    label: 'Field-report noise, NO zero calibration, default 0.5 L/min threshold' },
  { key: 'FIELD_REPORTS_ZEROCAL', profile: 'TUF2000M_FIELD_REPORTS', stress: true, profileOverrides: { zeroOffsetMs: 0 },
    label: 'Field-report noise, AFTER M42 zero calibration (offset 0), default 0.5 L/min threshold' },
  { key: 'FIELD_REPORTS_THR1', profile: 'TUF2000M_FIELD_REPORTS', stress: true, rulesOverrides: { flowThresholdLpm: 1.0 },
    label: 'Field-report noise, NO zero calibration, threshold raised to 1.0 L/min' },
];
const LADDER = new Set(['3', '4', '5', '6', '7', '3z', '4z', '5z', '13']);
const outDir = path.join(__dirname, 'results');
fs.mkdirSync(outDir, { recursive: true });

let md = `# Virtual Test Campaign — Results\n\nGenerated ${new Date().toISOString()} by \`tests/run.js\` (deterministic seed 42, 1 s step).\n\n` +
  `**Tag: SIMULATED.** These results prove the *logic* (rule engine, state machine, buffering, recovery) and show what each *sensor model profile* implies for low-flow detection. They do **not** prove that a real TUF-2000M on a real PPR pipe behaves like any profile — that is Phase 7.\n\n` +
  `Flow-ladder rungs (3–7, 13) and zero-controls are **findings**: a FAIL means "this profile cannot resolve that flow on that pipe", which is exactly the information we want before buying.\n\n`;

let logicFailures = 0;
const summary = {};
for (const run of RUNS) {
  const prof = run.profile;
  const results = SC.SCENARIOS.map((sc) => SC.run(Object.assign({}, sc, {
    profile: prof,
    profileOverrides: Object.assign({}, sc.profileOverrides || {}, run.profileOverrides || {}),
    rules: Object.assign({}, run.rulesOverrides || {}, sc.rules || {}),  // scenario-specific thresholds (ladder) win
  }), { stepS: 1, seed: 42 }));
  fs.writeFileSync(path.join(outDir, `campaign-${run.key}.json`), JSON.stringify(results.map((r) => ({ id: r.id, name: r.name, expected: r.expected, pass: r.pass, detail: r.detail, note: r.verdictNote, states: r.trace.states, events: r.trace.events.map((e) => ({ t: e.tSec, type: e.type, p: e.payload })) })), null, 1));
  const pass = results.filter((r) => r.pass).length;
  summary[run.key] = { pass, total: results.length, stress: !!run.stress };
  md += `## Run: ${run.key} — ${S.PROFILES[prof].name}${run.label ? ' — ' + run.label : ''}\n\n_${S.PROFILES[prof].source}_\n\n${run.stress ? '**STRESS RUN (findings only — failures here are the information we want, not logic defects).**\n\n' : ''}**${pass}/${results.length} PASS**\n\n| # | Scenario | Expected | Result | Detail |\n|---|---|---|---|---|\n`;
  for (const r of results) {
    const isLadder = LADDER.has(String(r.id));
    if (!r.pass && !isLadder && !run.stress) logicFailures++;
    md += `| ${r.id} | ${r.name} | ${r.expected} | ${r.pass ? '✅ PASS' : isLadder || run.stress ? '⚠️ FAIL (finding)' : '❌ FAIL'}${r.verdictNote ? ' `' + r.verdictNote + '`' : ''} | ${r.detail.replace(/\|/g, '\\|')} |\n`;
    console.log(`${run.key.padEnd(24)} ${(r.pass ? 'PASS' : 'FAIL').padEnd(5)} ${String(r.id).padEnd(3)} ${r.name.slice(0, 70)}`);
  }
  md += '\n';
}
md += `## Summary\n\n| Run | PASS | Total | Kind |\n|---|---|---|---|\n` + Object.entries(summary).map(([k, v]) => `| ${k} | ${v.pass} | ${v.total} | ${v.stress ? 'stress (findings)' : 'logic + profile'} |`).join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'CAMPAIGN_RESULTS.md'), md);
console.log('\nSummary:', JSON.stringify(summary), '\nLogic failures:', logicFailures, '\nWritten to tests/results/');
process.exit(logicFailures ? 1 : 0);
