// Transcribes BandPath listening-test audio sections (hosted on Supabase
// Storage) into speaker-labeled scripts, saved locally under
// "Listening scripts/listening-test-N/part-P.txt".
//
// Usage:
//   node scripts/transcribe-listening-scripts.mjs 1     # test 1 only (4 parts)
//   node scripts/transcribe-listening-scripts.mjs all   # tests 1-7 (28 parts)

import { GoogleGenAI } from "@google/genai";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUDIO_BASE = "https://sgglqnsujxgdbwmxzgdh.supabase.co/storage/v1/object/public/audio/";
const OUT_DIR = path.join(ROOT, "Listening scripts");

function loadEnv() {
  const env = Object.fromEntries(
    readFileSync(path.join(ROOT, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing or empty in .env.local");
  return env;
}

const PROMPT = `Transcribe this ENTIRE audio recording from start to finish, verbatim — do not summarize, paraphrase, or skip any part of it. This is one section of a real IELTS Listening test.

Identify each distinct speaker and label their turns using the most natural, specific label the context supports, in this priority order:
1. If a speaker's real name is stated in the dialogue, use that name (e.g. "Sarah:").
2. Otherwise, if a speaker's role is clear from context (teacher, tutor, lecturer, presenter, receptionist, customer service agent, interviewer, student, etc.), use that role (e.g. "Tutor:", "Receptionist:", "Student:").
3. Otherwise, use "Man:" or "Woman:" based on the voice.
4. Only fall back to "Speaker 1:", "Speaker 2:" if you genuinely cannot tell who is speaking.

Use exactly as many distinct speaker labels as there are distinct voices actually present in the recording — never invent extra speakers, never merge two different voices into one label. Keep the SAME label for a speaker every time they speak again later in the recording.

Format the output as plain text, one turn per line, exactly like this:
<Label>: <what they said>
<Label>: <what they said>

No timestamps, no headers, no JSON, no extra commentary before or after — just the speaker-labeled lines, covering the full recording.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function transcribePart(ai, testNum, part, buf) {
  const data = buf.toString("base64");
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: [{ type: "text", text: PROMPT }, { type: "audio", data, mime_type: "audio/mp3" }],
  });
  const transcript = interaction.output_text;
  if (!transcript) throw new Error(`No transcript returned for test ${testNum} part ${part}`);
  return transcript;
}

async function transcribePartWithRetry(ai, testNum, part) {
  const url = `${AUDIO_BASE}listening_test${testNum}_s${part}.mp3`;
  process.stderr.write(`Test ${testNum} Part ${part}: downloading...\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      process.stderr.write(`Test ${testNum} Part ${part}: transcribing (${(buf.length / 1024 / 1024).toFixed(1)} MB, attempt ${attempt})...\n`);
      const transcript = await transcribePart(ai, testNum, part, buf);
      const testDir = path.join(OUT_DIR, `listening-test-${testNum}`);
      mkdirSync(testDir, { recursive: true });
      const outPath = path.join(testDir, `part-${part}.txt`);
      writeFileSync(outPath, transcript, "utf8");
      process.stderr.write(`  saved -> ${outPath}\n`);
      return;
    } catch (err) {
      process.stderr.write(`  attempt ${attempt} failed: ${err.message || err}\n`);
      if (attempt === MAX_ATTEMPTS) {
        process.stderr.write(`  giving up on test ${testNum} part ${part} after ${MAX_ATTEMPTS} attempts.\n`);
        return;
      }
      await sleep(2000 * attempt);
    }
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/transcribe-listening-scripts.mjs <testNumber|all>");
    process.exit(1);
  }
  const env = loadEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const tests = arg === "all" ? [1, 2, 3, 4, 5, 6, 7] : [Number(arg)];

  for (const t of tests) {
    for (let p = 1; p <= 4; p++) {
      await transcribePartWithRetry(ai, t, p);
    }
  }
  console.error("\nDone.");
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
