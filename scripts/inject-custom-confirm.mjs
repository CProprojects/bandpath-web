// Replaces the native browser confirm() dialogs (used for "submit with
// unanswered questions?" and "restart test?") with a custom modal that
// matches the platform's design, across all reading/listening test HTML
// files under public/tests/.
//
// Usage:
//   node scripts/inject-custom-confirm.mjs listening-test-1
//   node scripts/inject-custom-confirm.mjs all   # every reading/listening test file

import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TESTS_DIR = path.join(ROOT, "public", "tests");

const CSS_BLOCK = `
/* CUSTOM CONFIRM MODAL */
#bp-confirm-modal{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;background:rgba(5,15,26,.6);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
#bp-confirm-modal.show{display:flex}
.bp-confirm-box{background:var(--bg2);border:1.5px solid var(--border);border-radius:16px;padding:24px 26px;max-width:360px;width:90%;box-shadow:0 24px 60px rgba(0,0,0,.4)}
body.dark .bp-confirm-box{background:var(--card-grad);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.bp-confirm-msg{font-size:14.5px;color:var(--text);line-height:1.6;margin-bottom:20px;font-weight:600}
.bp-confirm-actions{display:flex;gap:10px;justify-content:flex-end}
.bp-confirm-btn{padding:9px 18px;border-radius:9px;border:none;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:opacity .15s}
.bp-confirm-btn:hover{opacity:.85}
.bp-confirm-btn-cancel{background:var(--bg3);color:var(--text);border:1.5px solid var(--border)}
.bp-confirm-btn-ok{background:linear-gradient(120deg,#00C4FF,#0098e0);color:#06243c}
body:not(.dark) .bp-confirm-btn-ok{background:var(--accent);color:#fff}
`;

const HTML_BLOCK = `
<!-- CUSTOM CONFIRM MODAL -->
<div id="bp-confirm-modal">
  <div class="bp-confirm-box">
    <div class="bp-confirm-msg" id="bp-confirm-msg"></div>
    <div class="bp-confirm-actions">
      <button class="bp-confirm-btn bp-confirm-btn-cancel" id="bp-confirm-cancel">Cancel</button>
      <button class="bp-confirm-btn bp-confirm-btn-ok" id="bp-confirm-ok">Confirm</button>
    </div>
  </div>
</div>
`;

const JS_BLOCK = `
function bpConfirm(message){
  return new Promise(resolve=>{
    const modal=document.getElementById('bp-confirm-modal');
    document.getElementById('bp-confirm-msg').textContent=message;
    modal.classList.add('show');
    const okBtn=document.getElementById('bp-confirm-ok');
    const cancelBtn=document.getElementById('bp-confirm-cancel');
    function cleanup(result){
      modal.classList.remove('show');
      okBtn.removeEventListener('click',onOk);
      cancelBtn.removeEventListener('click',onCancel);
      resolve(result);
    }
    function onOk(){cleanup(true);}
    function onCancel(){cleanup(false);}
    okBtn.addEventListener('click',onOk);
    cancelBtn.addEventListener('click',onCancel);
  });
}
`;

function injectOne(fileName) {
  const filePath = path.join(TESTS_DIR, `${fileName}.html`);
  let html = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

  if (html.includes("bp-confirm-modal")) {
    console.error(`${fileName}: already has the custom confirm modal — skipping.`);
    return;
  }

  const submitAnchor =
    "  if(un>0){flashUnanswered();if(!confirm(`${un} question(s) unanswered. Submit anyway?`))return;}";
  if (!html.includes(submitAnchor)) throw new Error(`${fileName}: submit-confirm anchor not found`);
  html = html.replace(
    submitAnchor,
    "  if(un>0){flashUnanswered();if(!(await bpConfirm(`${un} question(s) unanswered. Submit anyway?`)))return;}",
  );
  html = html.replace("function submitTest(){", "async function submitTest(){");

  const restartAnchor = "  if(!confirm('Restart? All answers and the timer will be reset.'))return;";
  if (!html.includes(restartAnchor)) throw new Error(`${fileName}: restart-confirm anchor not found`);
  html = html.replace(
    restartAnchor,
    "  if(!(await bpConfirm('Restart? All answers and the timer will be reset.')))return;",
  );
  html = html.replace("function restartTest(){", "async function restartTest(){");

  const cssAnchor = "::-webkit-scrollbar{width:5px}";
  if (!html.includes(cssAnchor)) throw new Error(`${fileName}: CSS anchor not found`);
  html = html.replace(cssAnchor, CSS_BLOCK + "\n" + cssAnchor);

  const scriptTagIdx = html.indexOf("<script>");
  if (scriptTagIdx === -1) throw new Error(`${fileName}: <script> tag not found`);
  html = html.slice(0, scriptTagIdx) + HTML_BLOCK + "\n" + html.slice(scriptTagIdx);

  const scriptOpenTag = "<script>";
  const insertJsAt = html.indexOf(scriptOpenTag) + scriptOpenTag.length;
  html = html.slice(0, insertJsAt) + "\n" + JS_BLOCK + html.slice(insertJsAt);

  writeFileSync(filePath, html, "utf8");
  console.error(`${fileName}: injected.`);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/inject-custom-confirm.mjs <fileNameWithoutExt|all>");
    process.exit(1);
  }
  if (arg === "all") {
    const files = readdirSync(TESTS_DIR)
      .filter((f) => /^(reading|listening)-test-\d+\.html$/.test(f))
      .map((f) => f.replace(/\.html$/, ""));
    for (const f of files) injectOne(f);
  } else {
    injectOne(arg);
  }
}

main();
