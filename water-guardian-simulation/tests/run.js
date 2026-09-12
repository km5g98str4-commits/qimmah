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

const PROFILES = ['TUF2000M_PUBLISHED', 'CONSERVATIVE', 'IDEAL'];
const LADDER = new Set(['3', '4', '5', '6', '7', '3z', '4z', '5z', '13']);
const outDir = path.join(__dirname, 'results');
fs.mkdirSync(outDir, { recursive: true });

let md = `# Virtual Test Campaign — Results\n\nGenerated ${new Date().toISOString()} by \`tests/run.js\` (deterministic seed 42, 1 s step).\n\n` +
  `**Tag: SIMULATED.** These results prove the *logic* (rule engine, state machine, buffering, recovery) and show what each *sensor model profile* implies for low-flow detection. They do **not** prove that a real TUF-2000M on a real PPR pipe behaves like any profile — that is Phase 7.\n\n` +
  `Flow-ladder rungs (3–7, 13) and zero-controls are **findings**: a FAIL means "this profile cannot resolve that flow on that pipe", which is exactly the information we want before buying.\n\n`;

let logicFailures = 0;
const summary = {};
for (const prof of PROFILES) {
  const results = SC.SCENARIOS.map((sc) => SC.run(Object.assign({}, sc, { profile: prof }), { stepS: 1, seed: 42 }));
  fs.writeFileSync(path.join(outDir, `campaign-${prof}.json`), JSON.stringify(results.map((r) => ({ id: r.id, name: r.name, expected: r.expected, pass: r.pass, detail: r.detail, note: r.verdictNote, states: r.trace.states, events: r.trace.events.map((e) => ({ t: e.tSec, type: e.type, p: e.payload })) })), null, 1));
  const pass = results.filter((r) => r.pass).length;
  summary[prof] = { pass, total: results.length };
  md += `## Profile: ${S.PROFILES[prof].name}\n\n_${S.PROFILES[prof].source}_\n\n**${pass}/${results.length} PASS**\n\n| # | Scenario | Expected | Result | Detail |\n|---|---|---|---|---|\n`;
  for (const r of results) {
    const isLadder = LADDER.has(String(r.id));
    if (!r.pass && !isLadder) logicFailures++;
    md += `| ${r.id} | ${r.name} | ${r.expected} | ${r.pass ? '✅ PASS' : isLadder ? '⚠️ FAIL (finding)' : '❌ FAIL'}${r.verdictNote ? ' `' + r.verdictNote + '`' : ''} | ${r.detail.replace(/\|/g, '\\|')} |\n`;
    console.log(`${prof.padEnd(20)} ${(r.pass ? 'PASS' : 'FAIL').padEnd(5)} ${String(r.id).padEnd(3)} ${r.name.slice(0, 70)}`);
  }
  md += '\n';
}
md += `## Summary\n\n| Profile | PASS | Total |\n|---|---|---|\n` + Object.entries(summary).map(([k, v]) => `| ${k} | ${v.pass} | ${v.total} |`).join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'CAMPAIGN_RESULTS.md'), md);
console.log('\nSummary:', JSON.stringify(summary), '\nLogic failures:', logicFailures, '\nWritten to tests/results/');
process.exit(logicFailures ? 1 : 0);
