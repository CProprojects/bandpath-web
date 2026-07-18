// Transcribes a listening-test audio file into a speaker-labeled script,
// using the same Gemini API key already configured for Writing grading.
//
// Usage:
//   node scripts/transcribe-audio.mjs path/to/audio.mp3
//
// Writes the transcript next to the audio file as <name>.transcript.txt,
// and also prints it to the terminal.

import { GoogleGenAI } from "@google/genai";
import { readFileSync, writeFileSync, statSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const env = Object.fromEntries(
    readFileSync(path.join(ROOT, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing or empty in .env.local — add your key first.");
  }
  return env;
}

const MIME_TYPES = {
  ".mp3": "audio/mp3",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
};

const INLINE_LIMIT_BYTES = 18 * 1024 * 1024; // stay safely under Gemini's 20MB inline request cap

const PROMPT = `Transcribe this ENTIRE audio recording from start to finish, verbatim — do not summarize, paraphrase, or skip any part of it.

Label each turn by speaker as "Speaker 1", "Speaker 2", "Speaker 3", etc. (use a new speaker number for each distinct voice you hear; reuse the same number when a speaker talks again later). Do not use real names even if one is mentioned — always use "Speaker N".

Format the output as plain text, one turn per line, exactly like this:
Speaker 1: <what they said>
Speaker 2: <what they said>

No timestamps, no headers, no JSON, no extra commentary before or after — just the speaker-labeled lines, covering the full recording.`;

async function main() {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.error("Usage: node scripts/transcribe-audio.mjs path/to/audio.mp3");
    process.exit(1);
  }

  const ext = path.extname(audioPath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    console.error(`Unsupported file type "${ext}". Supported: ${Object.keys(MIME_TYPES).join(", ")}`);
    process.exit(1);
  }

  const env = loadEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const { size } = statSync(audioPath);
  console.error(`Audio file: ${audioPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);

  let audioPart;
  if (size <= INLINE_LIMIT_BYTES) {
    console.error("Uploading inline...");
    const data = readFileSync(audioPath, { encoding: "base64" });
    audioPart = { type: "audio", data, mime_type: mimeType };
  } else {
    console.error("File is large — uploading via the Files API first...");
    const uploaded = await ai.files.upload({ file: audioPath, config: { mimeType } });
    audioPart = { type: "audio", uri: uploaded.uri, mime_type: uploaded.mimeType };
  }

  console.error("Transcribing (this can take a minute for a full test recording)...");
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: [{ type: "text", text: PROMPT }, audioPart],
  });

  const transcript = interaction.output_text;
  if (!transcript) {
    throw new Error("Gemini returned no transcript output.");
  }

  const outPath = audioPath.replace(new RegExp(`\\${ext}$`, "i"), ".transcript.txt");
  writeFileSync(outPath, transcript, "utf8");

  console.error(`\nSaved to: ${outPath}\n`);
  console.log(transcript);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
