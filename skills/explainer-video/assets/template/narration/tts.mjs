// ElevenLabs narration for the Faultline explainer: one request per scene, with character timestamps.
// The key comes from .env.local (run through `npm run tts -- ...`, which passes --env-file).
//
//   npm run tts -- quota                          credits used / left this period
//   npm run tts -- voices                         list the voices on the account
//   npm run tts -- samples <voiceId> [...]        short sample per voice -> narration/samples/
//   npm run tts -- scenes <voiceId> [n ... | all] [--force]   -> narration/audio/sNN.mp3 + sNN.json
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, scenes, say } from "./script.mjs";

const MODEL = "eleven_v4";
const SETTINGS = { stability: 0.7, similarityBoost: 0.5 };   // the TTS skill's narration preset
const FORMAT = "mp3_44100_128";
// voice samples read the script's first two sentences, so the pick is made on real material
const SAMPLE = say(scenes()[0].text.split(/(?<=[.?!])\s+/).slice(0, 2).join(" "));

const client = new ElevenLabsClient();

function words(al) {
  // character timings -> [{ word, start, end }] in seconds
  const out = [];
  let w = null;
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) { w = null; return; }
    if (!w) { w = { word: "", start: al.characterStartTimesSeconds[i] }; out.push(w); }
    w.word += c;
    w.end = al.characterEndTimesSeconds[i];
  });
  return out;
}

async function speak(voiceId, text, file, context = {}) {
  const { data, rawResponse } = await client.textToSpeech
    .convertWithTimestamps(voiceId, { text, modelId: MODEL, voiceSettings: SETTINGS, outputFormat: FORMAT, ...context })
    .withRawResponse();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.mp3`, Buffer.from(data.audioBase64, "base64"));
  const al = data.alignment;
  const end = al.characterEndTimesSeconds.at(-1);
  writeFileSync(`${file}.json`, JSON.stringify({ voiceId, model: MODEL, text, duration: end, words: words(al), alignment: al }, null, 1));
  console.log(`${file}.mp3  ${end.toFixed(2)} s  ${rawResponse.headers.get("x-character-count") ?? text.length} chars`);
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "quota") {
  const s = await client.user.subscription.get();
  console.log(`${s.tier}: ${s.characterCount} of ${s.characterLimit} credits used, resets ${new Date(s.nextCharacterCountResetUnix * 1000).toDateString()}`);
} else if (cmd === "voices") {
  const { voices } = await client.voices.getAll();
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log([v.voiceId, v.name, v.category, l.gender, l.age, l.accent, l.use_case ?? l.useCase, l.description].filter(Boolean).join(" | "));
  }
} else if (cmd === "samples") {
  for (const id of args) await speak(id, SAMPLE, join(ROOT, "narration/samples", id));
} else if (cmd === "scenes") {
  const [voiceId, ...rest] = args;
  const force = rest.includes("--force");
  const all = scenes();
  const want = rest.includes("all") || !rest.some(a => /^\d+$/.test(a)) ? all.map(s => s.n) : rest.filter(a => /^\d+$/.test(a)).map(Number);
  for (const s of all.filter(s => want.includes(s.n))) {
    const file = join(ROOT, "narration/audio", `s${String(s.n).padStart(2, "0")}`);
    if (existsSync(`${file}.mp3`) && !force) { console.log(`${file}.mp3 exists, skipping (--force to redo)`); continue; }
    // neighbours' text keeps tone and pacing continuous across the per-scene requests
    const i = all.indexOf(s);
    await speak(voiceId, say(s.text), file, { previousText: all[i - 1] && say(all[i - 1].text), nextText: all[i + 1] && say(all[i + 1].text) });
  }
} else {
  console.log("usage: npm run tts -- quota | voices | samples <voiceId...> | scenes <voiceId> [n ... | all] [--force]");
}
