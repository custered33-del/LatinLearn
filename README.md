# LatinLearn

An interactive web app that teaches Latin to teenagers through eleven self-contained courses, plus a searchable reference database, the **Lexicon**.

| # | Course | Latin | What you learn |
| --- | --- | --- | --- |
| I | Colours | Colōrēs | colour words, adjective agreement |
| II | Numbers | Numerī | 1 to 1000, Roman numerals |
| III | Greetings | Salūtātiōnēs | hello, goodbye, names, politeness |
| IV | Questions | Interrogātiōnēs | question words, -ne / nōnne / num |
| V | Family | Familia | relatives, describing people, habeō + accusative |
| VI | Actions | Āctiōnēs | everyday verbs, present-tense endings, *sum* |
| VII | Time | Tempus | days (planets and gods), months, time words |
| VIII | Places | Loca | a Roman town, *ad* + acc. vs *in* + abl., *domī* |
| IX | Arguments | Disputātiō | opinions, agreeing and disagreeing, reasons, linking words |
| X | Food & Drink | Cibus et Pōtus | food, hungry/thirsty, ordering, the object ending |
| XI | Body & Feelings | Corpus et Animus | body parts, what hurts, feelings that agree |

## GermanLearn, SpanishLearn and FrenchLearn

Don't like Latin? Pick another language:

- **On a PC:** triple-click the logo in the top corner.
- **On a phone:** hold the logo for 3 seconds.
- **Anywhere:** Settings → **Bored of Latin? Pick another!** at the bottom.

Each language has the same eleven courses written in that language, its own Piper voices (German: Kerstin and Thorsten; Spanish: Sharvard F and M; French: Jessica and Pierre), flag colours, app name and home-screen icon, and its own Lexicon. Progress is kept separately for each language, and one login code saves all of them. Record new clips with `npm run audio` (or `npm run audio -- --lang de`).

## On your phone (online and offline)

LatinLearn is hosted free on **GitHub Pages**: every push to `main` runs the tests, builds the site and publishes it (see `.github/workflows/deploy.yml`).

- **Open it on your phone** at the site address, then *Share → Add to Home Screen* (iPhone) or *⋮ → Install app* (Android). It runs full-screen like an app.
- **Offline:** a service worker (`public/sw.js`) keeps the app on the phone. In **Settings → Download for offline**, save the voice clips too before going somewhere with no signal.
- **Update the phone from your PC:** double-click **`Publish to phone.cmd`**. It builds, commits and pushes; the phone gets the new version about 2 minutes later.
- Progress is stored per device. Use a save file (Settings) to move it between PC and phone.

## Auxilium, your practice buddy

The chat button (bottom right) opens **Auxilium**. It works offline on any device:

- "quiz me": questions on your weakest words that update your word strength and XP
- "what does *amīcus* mean?", "how do you say happy?", "conjugate *videō*", "say 2026 in Latin"

**Optional local AI:** on a PC with [Ollama](https://ollama.com) (for example `ollama pull qwen2.5:7b`), open questions go to the model running on that computer, which is free and private. For the online version, double-click **`Allow Auxilium AI.cmd`** once so Ollama accepts requests from the LatinLearn site.

## Play it

Double-click **`Play LatinLearn.html`** in this folder, or the **Play LatinLearn** shortcut on the Desktop. No server, internet or install is needed. The page itself is one file (about 330 KB); the voice recordings live in `public/audio/`, so keep the play file in this folder. Progress saves automatically in your browser.

For development:

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + content tests (vitest)
npm run audio      # record voice clips for any new or changed Latin (see "The Latin voice")
npm run build      # record audio, typecheck, build dist/, and regenerate "Play LatinLearn.html"
```

Rebuild with `npm run build` after editing anything, so the play file and the voice pick up your changes. `npm run icons` regenerates the app icons in `public/`.

## Inside each course

Each course has six steps, and every step can be opened on its own.

| Step | What it does |
| --- | --- |
| **Learn** | Vocabulary cards with audio and a pronunciation guide (the purple **SAY** tag, stress in CAPITALS), sound tips, and "key ideas" grammar cards |
| **Flashcards** | 3D flip cards in a new order each time (weaker words tend to come first); "Again" requeues a card. Space / 1 / 2 or swipe |
| **Match** | Timed pairing game; best time and flawless runs are saved |
| **Speak** | Speech recognition checks your pronunciation; falls back to record-yourself + self-rating |
| **Challenges** | 2 hand-made games + a speed round per course, each worth up to 3 stars (see below), plus a task list |
| **Quiz** | 10 mixed questions (translation, listening, typing, grammar/culture). 80% passes |

### Challenge types

- **Paint by Latin:** read "Caelum caeruleum est." and paint the sky the right colour (Colours)
- **Conversation:** chat with a Roman and pick the right reply (Greetings: meeting Julia; Arguments: a dogs-vs-cats debate)
- **Sentence builder:** tap word tiles into order; flexible Latin word order is accepted, with decoy tiles
- **Picture puzzle:** Marcus's family tree (Family) and a Roman town map (Places), answering Latin clues
- **Fill the gap:** agreement, verb endings, cases, calendar logic, counting objects and Roman-numeral sums
- **Speed round:** 60 seconds of "does this word match this meaning?", generated from any course's vocabulary

Stars: every answer right first time = 3 ★, 70%+ = 2 ★, otherwise 1 ★ (speed round: 10 points = 2 ★, 18 = 3 ★).

Everything practice-based is shuffled each time you play: flashcards, match pairs, speak words, quiz questions and their types, answer options, challenge questions, paint prompts and palette. Conversations keep their order (so they make sense) but shuffle the replies. The Learn page and the Lexicon stay in order because they're for reading.

### Tasks

Each course page lists tasks that help the course stick. **Game goals** tick themselves (a star in every challenge, 3 stars somewhere, a flawless Match, 5 mastered words, 100% on the quiz). **Real-life tasks** (label your room in Latin, greet your family, hold a debate…) are ticked by the learner for +15 XP.

## Progress and saving

Progress saves automatically in the browser (`localStorage`) after every answer: word strength 0–5, steps, best scores, challenge stars, tasks, XP and a daily streak. Two open tabs stay in sync instead of overwriting each other. Course **mastery** = 60% word strength + 40% best quiz score, shown as Tīrō → Discipulus → Perītus → Magister.

**Settings** (the sliders button, top right) has:

- **Download save file / Load save file**: a `.json` backup to move progress to another browser or computer, or to restore it if the browser's data is cleared.
- **Reset all progress**, with a confirmation step.

## The Latin voice

Every word and sentence in the app has a recording made with **[Piper](https://github.com/rhasspy/piper)**, a free, open-source neural text-to-speech engine that runs on your own computer. There's no Latin Piper voice, so LatinLearn takes an Italian one (`it_IT-paola-medium`) and feeds it **phonemes** instead of spelling: `toPhonemes()` in `src/lib/latin.ts` turns Latin into restored classical pronunciation (hard c and g, v as w, trilled r, ae as "ai", gn as "ngn", double consonants held, stress by the classical rule, long vowels marked), using only sounds the Italian voice was trained on. The only sound it can't make is h, which is left out.

- `npm run audio` records the clips into `public/audio/` (MP3, about 4 MB for 880 clips) and writes `src/data/audio-index.json`. The first run downloads the voice (63 MB, from Hugging Face) into `tts/`. After that it only records new or changed text, so it takes about a second.
- `src/data/speakable.ts` lists everything the app can say; a content test fails if anything is missing a recording.
- Phrases nobody recorded (the number converter, the pronunciation lab) are pieced together from word clips. If a word has no clip at all, the browser's own voice reads that phrase instead.
- In **Settings** you can switch to the browser voice, or turn on **slow speech** (¾ speed, same pitch).

## Speech checking

The Speak step's automatic checking uses the browser's speech recognition, which Chrome, Edge and Safari have. In Firefox the Speak step switches to recording yourself and rating your attempt.

## How it's built

- **Preact + TypeScript + Vite.** The runtime is about 4 KB; there are no other runtime dependencies.
- **Code splitting:** the Lexicon and the Challenges games are separate chunks, loaded on demand.
- **Play file:** `vite build --mode play` uses `vite-plugin-singlefile` to inline JS, CSS and fonts; `scripts/make-play-file.mjs` finishes it.
- **Self-hosted font:** Fraunces 600, latin + latin-ext subsets (see `src/fonts.css` for why declaration order matters for macrons).
- **Pronunciation engine** (`src/lib/latin.ts`): syllabifies Latin and applies the classical stress rule to generate every pronunciation guide and the voice's phonemes; compares speech phonetically.
- **Voice clips** are plain MP3s played with an `<audio>` element, so they work from a double-clicked file in any browser. The clip list is a separate 4.5 KB chunk.
- **Content tests** check every course: unique ids, unambiguous answers, builder answers buildable from their tiles, valid challenge targets, and more.

## Project layout

```
src/
  data/courses/*.ts   one file per course: vocab, sounds, key ideas, quiz, challenges, tasks
  data/reference.ts   Lexicon database (lazy-loaded)
  data/speakable.ts   every piece of Latin the app can say
  data/audio-index.json  which voice clips exist (generated)
  lib/                latin utilities, speech + voice player, progress store, mastery, tasks, quiz builder, numerals
  pages/              Home, Course (+ step shell), Learn, Flashcards, Match, Speak, Challenges, Quiz, Reference, Settings
  components/         icons, task list and shared UI
public/audio/         voice clips (generated by npm run audio)
scripts/              voice recorder, play-file and icon generators
tts/                  downloaded voice model + recording cache (not committed)
```

To add a word or challenge, edit the course's file; `npm test` will catch most mistakes.
