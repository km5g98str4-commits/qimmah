#!/usr/bin/env node
/* Builds docs/*.html from docs/*.md (report + professor summary + test plan) with a small embedded stylesheet.
 * Requires `marked` (npm i -g marked, or run with NODE_PATH pointing at an install). */
const fs = require('fs');
const path = require('path');
let marked;
try { marked = require('marked'); } catch (e) { console.error('marked not found — npm install marked (any location) and set NODE_PATH'); process.exit(1); }
const docs = path.join(__dirname, '..', 'docs');
const CSS = `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:1000px;margin:32px auto;padding:0 20px;color:#1f2937;line-height:1.5}
h1{border-bottom:3px solid #0ea5e9;padding-bottom:6px}h2{margin-top:2em;border-bottom:1px solid #e5e7eb;padding-bottom:4px;color:#0c4a6e}h3{color:#075985}
table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}th,td{border:1px solid #d1d5db;padding:5px 8px;vertical-align:top;text-align:left}th{background:#f1f5f9}
code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:90%}pre{background:#0b1219;color:#e6edf3;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px}
blockquote{border-left:4px solid #0ea5e9;margin:0;padding:4px 12px;color:#374151;background:#f0f9ff}
img{max-width:100%;border:1px solid #d1d5db;border-radius:6px;margin:8px 0}
.tag{display:inline-block;padding:0 6px;border-radius:4px;font-size:11px;font-weight:700}
@media print{body{max-width:none;margin:0;font-size:12px}pre{white-space:pre-wrap}}`;
const files = [
  { md: 'FINAL_TECHNICAL_REPORT.md', html: 'FINAL_TECHNICAL_REPORT.html', title: 'Water Guardian — Pre-Purchase Technical Feasibility & Simulation Report', shots: true },
  { md: 'PROFESSOR_SUMMARY.md', html: 'PROFESSOR_SUMMARY.html', title: 'Water Guardian — Professor Summary' },
  { md: 'PHYSICAL_TEST_PLAN.md', html: 'PHYSICAL_TEST_PLAN.html', title: 'Water Guardian — Physical Validation Plan' },
];
for (const f of files) {
  let md = fs.readFileSync(path.join(docs, f.md), 'utf8');
  if (f.shots) {
    // inline the screenshot gallery after §15 heading
    const gallery = ['01_idle', '02_incident', '03_sensor_unknown', '04_offline', '05_hydraulics', '06_scenarios']
      .map((n) => `![${n}](screenshots/${n}.png)`).join('\n\n');
    md = md.replace(/(## 15\. Simulator Screenshots\n\n[^\n]+\n)/, `$1\n${gallery}\n\n`);
    md = md.replace(/(## 3\. Final MVP Architecture\n)/, `$1\n![architecture](../diagrams/architecture.svg)\n\n`);
    md = md.replace(/(## 11\. Electrical Architecture\n)/, `$1\n![wiring](../diagrams/wiring.svg)\n\n`);
    md = md.replace(/(## 18\. Physical Validation Plan\n)/, `$1\n![rig](../diagrams/hydraulic_layout.svg)\n\n`);
  }
  const body = marked.parse(md);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${f.title}</title><style>${CSS}</style></head><body>${body}</body></html>`;
  fs.writeFileSync(path.join(docs, f.html), html);
  console.log('wrote', f.html, (html.length / 1024).toFixed(0), 'KB');
}
