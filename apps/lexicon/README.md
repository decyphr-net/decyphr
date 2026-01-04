# Lexicon (apps/lexicon)

A NestJS application in the decyphr monorepo that implements the **lexicon domain**.

The lexicon service is responsible for tracking the words a user encounters, maintaining familiarity scores over time, and deriving higher-level signals (such as CEFR level estimates) from those interactions.

This README documents how the lexicon works internally, with a particular focus on **ingestion**, **scoring**, and **assessment logic**.

---

## What this app is

- A NestJS application (TypeScript).
- Uses `@nestjs/config` for environment configuration.
- Uses TypeORM with MariaDB.
- Persists lexicon-related domain entities:
  - `User`
  - `Word`
  - `UserWordStatistics`
  - `Interaction`
  - `Statement`
- Consumes NLP output events produced by other services.

---

## Core responsibilities

The lexicon service is responsible for:

1. Ingesting NLP tokens from completed translation / analysis events.
2. Normalizing and persisting lexical items.
3. Tracking per-user exposure and familiarity.
4. Applying weighted scoring based on interaction type and part-of-speech.
5. Producing lexicon snapshots for UI consumption.
6. Computing aggregate signals such as CEFR level estimates.

---

## Lexicon ingestion flow

### 1. NLP event consumption

The service consumes `nlp.complete` events containing:

- Sentences
- Tokens per sentence
- Each token includes:
  - `surface` – the observed form
  - `lemma` – canonical form
  - `normalised` – language-aware normalised form
  - `pos` – part of speech
  - `language`

### 2. Token preparation

During ingestion:

- Tokens are deduplicated by lemma within an event.
- Only one token per lemma is processed per ingestion pass.
- This prevents artificially inflating familiarity from repeated tokens in a single sentence or document.

### 3. Filtering non-lexical items

Certain token types are **explicitly excluded** from the lexicon:

- Punctuation
- Numerals
- Symbols

These are filtered at ingestion time based on POS tags (e.g. `punctuation`, `numeral`, `symbol`) to ensure that only meaningful lexical items are scored.

This prevents entries such as full stops, commas, or numbers from appearing in the user’s lexicon.

---

## Word persistence model

Words are stored canonically using:

- `lemma` (max 50 chars)
- `language`

Each `Word` entity represents a unique lexical item independent of any user.

The same word can be associated with many users via `UserWordStatistics`.

---

## User word statistics

For each `(user, word, language)` combination, the service maintains statistics including:

- Total exposure count
- Weighted exposure
- Time-windowed counts (e.g. last 7 days, last 30 days)
- A derived **score** representing familiarity

These statistics evolve over time as new interactions occur.

---

## Scoring model

### Base interaction weight

Each interaction type contributes a base weight, defined in `INTERACTION_WEIGHTS`.

Examples:
- Passive exposure (reading)
- Active usage
- Explicit lookup

More intentional interactions carry higher weight.

### POS multiplier

Each word’s part-of-speech applies a multiplier:

- Content words (nouns, verbs, adjectives) weigh more.
- Function words weigh less.
- Unknown or unsupported tags fall back to a default multiplier.

Final weight formula:
```javascript
finalWeight = interactionWeight × posMultiplier
```

This weight is applied to the user’s statistics for the word.

---

## Lexicon snapshot

The snapshot API returns:

- A list of words known to the user
- Per-word statistics (counts, score)
- Stable ordering and pagination support

The snapshot intentionally excludes:
- Punctuation
- Numerals
- Symbols

Snapshots are designed for **UI rendering**, not raw analytics.

---

## CEFR assessment

### What CEFR means here

The CEFR level is an **estimate**, not a certification.

It is derived from:
- Known vocabulary coverage
- CEFR-tagged words in the lexicon
- User familiarity scores

### How CEFR is computed

1. Only words with a defined CEFR level are considered.
2. Coverage is computed per CEFR band (A1 → C2).
3. The highest level where coverage passes a threshold is selected.
4. Confidence is derived from coverage density at that level.

The CEFR result is **global per user per language**, not per word.

---

## Why CEFR is not stored per word row

- CEFR is an aggregate signal, not a lexical attribute.
- Assigning a global CEFR to each row adds noise and confusion.
- The UI surfaces CEFR at the **summary level**, alongside other lexicon statistics.

---

## Configuration (environment variables)

Database connectivity (from `app.module.ts`):

- `MARIA_DB_HOST`
- `MARIA_DB_PORT`
- `MARIA_DB_USERNAME`
- `MARIA_DB_PASSWORD`
- `MARIA_DB_DATABASE`

Other configuration may exist in individual modules.

---

## Project layout

apps/lexicon/
├── Dockerfile
├── package.json
├── src/
│ ├── app.module.ts
│ ├── main.ts
│ ├── bank/
│ ├── interaction/
│ ├── statement/
│ ├── translation/
│ └── lexicon/
└── test/

---

## Notes for future maintainers

- Scoring logic lives in the lexicon ingest service.
- CEFR assessment is intentionally conservative.
- Filtering non-lexical tokens early avoids downstream complexity.
- The lexicon is designed to evolve slowly and reflect long-term knowledge, not short-term activity.