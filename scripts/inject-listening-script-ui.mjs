// Injects the "View Script" (audioscript) feature into a listening-test-N.html
// file: CSS, the results-screen button, the script-screen markup, and the JS
// functions + embedded SCRIPT_DATA (read from "Listening scripts/listening-test-N/part-P.txt").
//
// Usage:
//   node scripts/inject-listening-script-ui.mjs 2
//   node scripts/inject-listening-script-ui.mjs all   # tests 2-7 (test 1 already done by hand)

import { readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CSS_BLOCK = `
/* AUDIOSCRIPT */
#script-screen{display:none;position:fixed;inset:0;background:var(--bg);z-index:5100;overflow-y:auto;padding:20px 20px 40px}
body.dark #script-screen{background:radial-gradient(120% 60% at 50% 0%,#123558 0%,#0c2038 55%,#0a1a30 100%)}
.script-header{max-width:980px;margin:0 auto 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.script-title{font-size:18px;font-weight:800;color:var(--text)}
.script-back{display:inline-flex;align-items:center;gap:7px;background:var(--bg3);color:var(--text);border:1.5px solid var(--border);padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s}
.script-back:hover{opacity:.85}
.script-tabs{display:flex;gap:3px;background:var(--bg3);border-radius:9px;padding:3px;max-width:980px;margin:0 auto 16px}
.script-tab{flex:1;background:transparent;color:var(--text2);border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;transition:all .15s}
.script-tab:hover{color:var(--text)}
.script-tab.active{background:var(--accent);color:#06243c;box-shadow:0 0 16px -4px rgba(0,196,255,.5)}
.script-layout{max-width:980px;margin:0 auto;display:grid;grid-template-columns:3fr 2fr;gap:16px;align-items:start}
.script-panel,.script-answers{background:var(--bg2);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)}
body.dark .script-panel,body.dark .script-answers{background:var(--card-grad)}
.script-panel-title,.script-answers-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px;display:flex;align-items:center;gap:7px}
.script-line{font-size:13.5px;color:var(--text2);line-height:1.75;margin-bottom:10px}
.script-speaker{color:var(--accent);font-weight:800;margin-right:5px}
.script-ans-item{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px}
.script-ans-item:last-child{border-bottom:none}
.script-ans-q{font-weight:800;color:var(--accent);min-width:34px;flex-shrink:0}
.script-ans-val{color:var(--text);font-weight:600}
@media(max-width:768px){
  .script-layout{grid-template-columns:1fr}
}
`;

function buildHtmlBlock(testNum) {
  return `
<!-- SCRIPT / AUDIOSCRIPT -->
<div id="script-screen">
  <div class="script-header">
    <div class="script-title">\u{1F4DC} Audioscript — Listening Test ${testNum}</div>
    <button class="script-back" onclick="closeScript()">← Back to Results</button>
  </div>
  <div class="script-tabs" id="script-tabs">
    <button class="script-tab active" onclick="switchScriptPart(0)">Part 1</button>
    <button class="script-tab" onclick="switchScriptPart(1)">Part 2</button>
    <button class="script-tab" onclick="switchScriptPart(2)">Part 3</button>
    <button class="script-tab" onclick="switchScriptPart(3)">Part 4</button>
  </div>
  <div class="script-layout">
    <div class="script-panel">
      <div class="script-panel-title"><svg class="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Transcript</div>
      <div id="script-text-content"></div>
    </div>
    <div class="script-answers">
      <div class="script-answers-title"><svg class="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Answer Key</div>
      <div id="script-answers-content"></div>
    </div>
  </div>
</div>
`;
}

function jsStringEscape(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function buildJsBlock(parts) {
  const dataEntries = parts.map((p) => `\`${jsStringEscape(p.trim())}\``).join(",\n");
  return `
// ─────────────────────────────────────────────
// AUDIOSCRIPT
// ─────────────────────────────────────────────
const SCRIPT_DATA=[
${dataEntries}
];
let scriptPart=0;
function openScript(){
  document.getElementById('results-screen').style.display='none';
  document.getElementById('script-screen').style.display='block';
  renderScriptPart(0);
}
function closeScript(){
  document.getElementById('script-screen').style.display='none';
  document.getElementById('results-screen').style.display='block';
}
function switchScriptPart(idx){
  scriptPart=idx;
  document.querySelectorAll('#script-tabs .script-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  renderScriptPart(idx);
}
function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderScriptPart(idx){
  const raw=SCRIPT_DATA[idx]||'';
  const lines=raw.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
  document.getElementById('script-text-content').innerHTML=lines.map(line=>{
    const m=line.match(/^([^:]{1,28}):\\s*(.+)$/);
    if(m)return \`<div class="script-line"><span class="script-speaker">\${escapeHtml(m[1])}:</span>\${escapeHtml(m[2])}</div>\`;
    return \`<div class="script-line">\${escapeHtml(line)}</div>\`;
  }).join('');
  const [start,end]=SECTION_RANGES[idx];
  let ansHtml='';
  for(let i=start;i<=end;i++){
    ansHtml+=\`<div class="script-ans-item"><span class="script-ans-q">Q\${i}</span><span class="script-ans-val">\${escapeHtml(ANSWERS[i].answer)}</span></div>\`;
  }
  document.getElementById('script-answers-content').innerHTML=ansHtml;
}
`;
}

function injectOne(testNum) {
  const filePath = path.join(ROOT, "public", "tests", `listening-test-${testNum}.html`);
  let html = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

  if (html.includes("script-screen")) {
    console.error(`Test ${testNum}: already has the script UI — skipping.`);
    return;
  }

  const parts = [1, 2, 3, 4].map((p) =>
    readFileSync(path.join(ROOT, "Listening scripts", `listening-test-${testNum}`, `part-${p}.txt`), "utf8"),
  );

  const scrollbarAnchor = "::-webkit-scrollbar{width:5px}";
  if (!html.includes(scrollbarAnchor)) throw new Error(`Test ${testNum}: CSS anchor not found`);
  html = html.replace(scrollbarAnchor, CSS_BLOCK + "\n" + scrollbarAnchor);

  const buttonAnchor = `<button class="res-btn res-btn-secondary" onclick="goHome()">\u{1F3E0} Back to Home</button>`;
  if (!html.includes(buttonAnchor)) throw new Error(`Test ${testNum}: button anchor not found`);
  html = html.replace(
    buttonAnchor,
    buttonAnchor + `\n    <button class="res-btn res-btn-secondary" onclick="openScript()">\u{1F4DC} View Script</button>`,
  );

  const backToResultsAnchor =
    "function backToResults(){\n  document.getElementById('back-to-results').style.display='none';\n  document.getElementById('results-screen').style.display='block';\n}";
  if (!html.includes(backToResultsAnchor)) throw new Error(`Test ${testNum}: backToResults anchor not found`);
  html = html.replace(backToResultsAnchor, backToResultsAnchor + "\n" + buildJsBlock(parts));

  const scriptTagAnchor = "<script>";
  const idx = html.indexOf(scriptTagAnchor);
  if (idx === -1) throw new Error(`Test ${testNum}: <script> tag not found`);
  html = html.slice(0, idx) + buildHtmlBlock(testNum) + "\n" + html.slice(idx);

  writeFileSync(filePath, html, "utf8");
  console.error(`Test ${testNum}: injected.`);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/inject-listening-script-ui.mjs <testNumber|all>");
    process.exit(1);
  }
  const tests = arg === "all" ? [2, 3, 4, 5, 6, 7] : [Number(arg)];
  for (const t of tests) injectOne(t);
}

main();
