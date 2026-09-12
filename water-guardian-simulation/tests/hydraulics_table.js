#!/usr/bin/env node
/* Prints the velocity table (Q = v·A) for the flow ladder on common pipe IDs and writes
 * tests/results/HYDRAULICS_TABLE.md. Tag: CALCULATED. */
const fs = require('fs');
const path = require('path');
const H = require('../simulator/engine/hydraulics.js');
const flows = [0.25, 0.5, 1, 2, 5, 10, 20];
const pipes = H.PIPE_PRESETS.filter((p) => p.id !== 'custom');
const cutoffs = { 'TUF-2000M M41 default cutoff': 0.03, 'published min velocity (0.01 m/s claim)': 0.01, 'conservative assumption': 0.05 };
let md = '# Hydraulic velocity table (CALCULATED)\n\nQ = v·A, A = πD²/4. Internal diameters are typical values for the stated standard; measure the real pipe.\n\n';
md += '| Flow (L/min) | ' + pipes.map((p) => p.label.replace(/\s*\(.*\)/, '') + ` ID ${p.idMm}`).join(' | ') + ' |\n|---|' + pipes.map(() => '---').join('|') + '|\n';
for (const q of flows) md += `| ${q} | ` + pipes.map((p) => H.velocityFromLpm(q, p.idMm).toFixed(4)).join(' | ') + ' |\n';
md += '\nVelocities in m/s.\n\n## Minimum detectable flow implied by each velocity floor\n\n| Pipe | ID mm | ' + Object.keys(cutoffs).map((k) => `Q at ${cutoffs[k]} m/s (${k})`).join(' | ') + ' |\n|---|---|' + Object.keys(cutoffs).map(() => '---').join('|') + '|\n';
for (const p of pipes) md += `| ${p.label.replace(/\s*\(.*\)/, '')} | ${p.idMm} | ` + Object.values(cutoffs).map((v) => H.lpmFromVelocity(v, p.idMm).toFixed(3) + ' L/min').join(' | ') + ' |\n';
md += '\n**Reading:** on a DN25 PPR PN20 pipe (ID ≈ 16.6 mm) the manufacturer default low-flow cutoff of 0.03 m/s corresponds to ≈ 0.39 L/min; on a 2" galvanized riser (ID ≈ 52.5 mm) the same cutoff is ≈ 3.9 L/min. A meter on the main riser is blind to a dripping ablution tap; a meter on a DN20–DN32 branch is not (if the meter itself performs as published — NOT YET PHYSICALLY VERIFIED).\n';
fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'results', 'HYDRAULICS_TABLE.md'), md);
console.log(md);
