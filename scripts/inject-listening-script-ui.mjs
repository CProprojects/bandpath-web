// Injects the "View Script" (audioscript) feature into a listening-test-N.html
// file. Unlike a separate overlay, this reuses the REAL test page: clicking
// "View Script" enters review mode (same as "Review Answers") and adds a
// script panel alongside the existing questions panel, splitting the main
// content area in half — mirroring the reading tests' passage/questions
// split. Audio replay is unlocked in this mode so students can re-listen
// while reading the script and reviewing their answers.
//
// Usage:
//   node scripts/inject-listening-script-ui.mjs 2
//   node scripts/inject-listening-script-ui.mjs all   # tests 2-7

import { readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const CSS_BLOCK = `
#script-panel{display:none;width:0;flex-shrink:0;overflow-y:auto;padding:20px 24px;background:var(--bg2);border-left:2px solid var(--border)}
body.dark #script-panel{background:rgba(10,29,51,.4)}
#main.script-mode #questions-panel{flex:1 1 50%}
#main.script-mode #script-panel{display:block;flex:1 1 50%}
.script-panel-title{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px;display:flex;align-items:center;gap:7px}
.script-note{font-size:11.5px;color:var(--text3);font-style:italic;margin-bottom:14px;line-height:1.5}
.script-line{font-size:13.5px;color:var(--text2);line-height:1.75;margin-bottom:10px}
.script-speaker{color:var(--accent);font-weight:800;margin-right:5px}
`;

const CSS_MOBILE_LINE = "  #script-panel{width:100%}\n";

function buildHtmlBlock() {
  return `
    <!-- SCRIPT PANEL -->
    <div id="script-panel">
      <div class="script-panel-title"><svg class="ic" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Audioscript — This Part</div>
      <div class="script-note">Audio is unlocked for replay while reviewing.</div>
      <div id="script-panel-content"></div>
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
let scriptModeOn=false;
function openScript(){
  reviewModeOn=true;
  scriptModeOn=true;
  document.getElementById('results-screen').style.display='none';
  document.getElementById('back-to-results').style.display='block';
  document.getElementById('main').classList.add('script-mode');
  enableAudioForReview();
  switchSection(0);
}
function enableAudioForReview(){
  audioElements.forEach((a,i)=>{
    if(!a)return;
    const pb=document.getElementById('playbtn-'+i),sb=document.getElementById('stopbtn-'+i),st=document.getElementById('status-'+i);
    if(pb)pb.disabled=false;
    if(sb)sb.disabled=true;
    if(st){st.className='ap-status ready';st.textContent='Ready to replay';}
  });
}
function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function renderScriptPanel(idx){
  const raw=SCRIPT_DATA[idx]||'';
  const lines=raw.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
  document.getElementById('script-panel-content').innerHTML=lines.map(line=>{
    const m=line.match(/^([^:]{1,28}):\\s*(.+)$/);
    if(m)return \`<div class="script-line"><span class="script-speaker">\${escapeHtml(m[1])}:</span>\${escapeHtml(m[2])}</div>\`;
    return \`<div class="script-line">\${escapeHtml(line)}</div>\`;
  }).join('');
  document.getElementById('script-panel').scrollTop=0;
}
`;
}

function injectOne(testNum) {
  const filePath = path.join(ROOT, "public", "tests", `listening-test-${testNum}.html`);
  let html = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

  if (html.includes("script-panel")) {
    console.error(`Test ${testNum}: already has the script UI — skipping.`);
    return;
  }

  const parts = [1, 2, 3, 4].map((p) =>
    readFileSync(path.join(ROOT, "Listening scripts", `listening-test-${testNum}`, `part-${p}.txt`), "utf8"),
  );

  // 1. CSS — right after the #questions-panel rules.
  const cssAnchor = "#questions-panel{flex:1;overflow-y:auto;padding:20px 24px;background:var(--bg)}\nbody.dark #questions-panel{background:transparent}";
  if (!html.includes(cssAnchor)) throw new Error(`Test ${testNum}: CSS anchor not found`);
  html = html.replace(cssAnchor, cssAnchor + "\n" + CSS_BLOCK);

  // 2. Mobile: full-width script panel when stacked.
  const mobileAnchor = "  #splitter{display:none}\n";
  if (!html.includes(mobileAnchor)) throw new Error(`Test ${testNum}: mobile CSS anchor not found`);
  html = html.replace(mobileAnchor, mobileAnchor + CSS_MOBILE_LINE);

  // 3. Results-screen button.
  const buttonAnchor = `<button class="res-btn res-btn-secondary" onclick="goHome()">\u{1F3E0} Back to Home</button>`;
  if (!html.includes(buttonAnchor)) throw new Error(`Test ${testNum}: button anchor not found`);
  html = html.replace(
    buttonAnchor,
    buttonAnchor + `\n    <button class="res-btn res-btn-secondary" onclick="openScript()">\u{1F4DC} View Script</button>`,
  );

  // 4. HTML markup — script panel as a sibling of #questions-panel, inside #main.
  const panelAnchor = '  <div id="questions-panel">\n    <div id="questions-content"></div>\n  </div>\n</div>';
  if (!html.includes(panelAnchor)) throw new Error(`Test ${testNum}: questions-panel anchor not found`);
  html = html.replace(
    panelAnchor,
    '  <div id="questions-panel">\n    <div id="questions-content"></div>\n  </div>\n' + buildHtmlBlock() + "</div>",
  );

  // 5. renderSection() — hook in script panel rendering.
  const renderSectionAnchor =
    "  if(reviewModeOn)applyReviewMarkup();\n  updatePalette();\n  document.getElementById('questions-panel').scrollTop=0;";
  if (!html.includes(renderSectionAnchor)) throw new Error(`Test ${testNum}: renderSection anchor not found`);
  html = html.replace(
    renderSectionAnchor,
    "  if(reviewModeOn)applyReviewMarkup();\n  if(scriptModeOn)renderScriptPanel(idx);\n  updatePalette();\n  document.getElementById('questions-panel').scrollTop=0;",
  );

  // 6. playSection() — allow replay in script mode even though this section already played.
  const playGuardAnchor =
    "  if(testMode==='exam'&&sectionPlayed[idx]){\n    alert('This section has already been played. Each section plays once only.');return;\n  }";
  if (!html.includes(playGuardAnchor)) throw new Error(`Test ${testNum}: playSection guard anchor not found`);
  html = html.replace(
    playGuardAnchor,
    "  if(testMode==='exam'&&sectionPlayed[idx]&&!scriptModeOn){\n    alert('This section has already been played. Each section plays once only.');return;\n  }",
  );

  // 7. audio.onended — don't re-lock the Play button while in script mode.
  const onendedAnchor =
    "  audio.onended=()=>{\n    sectionDone[idx]=true;\n    if(testMode==='exam'){\n      st.className='ap-status done';st.textContent='Completed ✓';\n      pb.disabled=true;sb.disabled=true;\n      document.getElementById('replay-warn-'+idx).style.display='none';\n    }else{";
  if (!html.includes(onendedAnchor)) throw new Error(`Test ${testNum}: onended anchor not found`);
  html = html.replace(
    onendedAnchor,
    "  audio.onended=()=>{\n    sectionDone[idx]=true;\n    if(testMode==='exam'&&!scriptModeOn){\n      st.className='ap-status done';st.textContent='Completed ✓';\n      pb.disabled=true;sb.disabled=true;\n      document.getElementById('replay-warn-'+idx).style.display='none';\n    }else{",
  );

  // 8. backToResults() — exit script mode when leaving.
  const backToResultsAnchor =
    "function backToResults(){\n  document.getElementById('back-to-results').style.display='none';\n  document.getElementById('results-screen').style.display='block';\n}";
  if (!html.includes(backToResultsAnchor)) throw new Error(`Test ${testNum}: backToResults anchor not found`);
  html = html.replace(
    backToResultsAnchor,
    "function backToResults(){\n  document.getElementById('back-to-results').style.display='none';\n  document.getElementById('results-screen').style.display='block';\n  scriptModeOn=false;\n  document.getElementById('main').classList.remove('script-mode');\n  audioElements.forEach(a=>{if(a&&!a.paused){try{a.pause();}catch(e){}}});\n}",
  );

  // 9. SCRIPT_DATA + functions — right after backToResults (now extended).
  const insertAfter = html.indexOf(backToResultsAnchor.split("\n")[0]);
  const closeIdx = html.indexOf("\n}\n", insertAfter) + 3;
  html = html.slice(0, closeIdx) + buildJsBlock(parts) + html.slice(closeIdx);

  writeFileSync(filePath, html, "utf8");
  console.error(`Test ${testNum}: injected.`);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/inject-listening-script-ui.mjs <testNumber|all>");
    process.exit(1);
  }
  const tests = arg === "all" ? [1, 2, 3, 4, 5, 6, 7] : [Number(arg)];
  for (const t of tests) injectOne(t);
}

main();
