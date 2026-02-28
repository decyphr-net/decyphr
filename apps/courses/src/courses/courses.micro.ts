import {
  LessonBlock,
  LessonContent,
  LessonCorePhrase,
  LessonPedagogyView,
  LessonSupportNote,
  LessonTokenGloss,
} from './courses.types';

export type MicroChunk = {
  id: string;
  blockIds: string[];
  estimatedSeconds: number;
};

export type GlossEntry = {
  token: string;
  lemma: string;
  pronunciation: string | null;
  translation: string | null;
  pos: string | null;
  shortNote: string | null;
  examples: string[];
};

const TARGET_WORDS_PER_CHUNK = 115;
const MAX_WORDS_PER_CHUNK = 145;
const MIN_CHUNK_SECONDS = 50;
const MAX_CHUNK_SECONDS = 95;

const IRISH_HINT_WORDS = new Set([
  'an',
  'ar',
  'as',
  'cad',
  'cén',
  'cé',
  'conas',
  'dia',
  'dhuit',
  'go',
  'gur',
  'is',
  'le',
  'mé',
  'mo',
  'ní',
  'sé',
  'sí',
  'tá',
  'tú',
]);

export function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/(^[^a-záéíóú'-]+|[^a-záéíóú'-]+$)/gi, '')
    .trim();
}

function isLikelyIrishToken(token: string): boolean {
  const value = normalizeToken(token);
  if (!value) return false;
  if (IRISH_HINT_WORDS.has(value)) return true;
  return /[áéíóú]/i.test(value);
}

export function tokenize(value: string): string[] {
  return value
    .split(/\s+/)
    .map((item) => normalizeToken(item))
    .filter(Boolean);
}

function wordCount(block: LessonBlock): number {
  if (block.type === 'heading' || block.type === 'paragraph') {
    return tokenize(block.text || '').length;
  }
  if (block.type === 'list') {
    return (block.items || []).reduce((total, item) => total + tokenize(item).length, 0);
  }
  if (block.type === 'dialogue') {
    return (block.turns || []).reduce((total, turn) => total + tokenize(turn.text || '').length, 0);
  }
  return 0;
}

function estimateSeconds(words: number): number {
  const estimated = Math.round(words * 0.65);
  return Math.max(MIN_CHUNK_SECONDS, Math.min(MAX_CHUNK_SECONDS, estimated));
}

export function buildMicroChunks(blocks: LessonBlock[], resumeBlocks: string[] = []): MicroChunk[] {
  if (!blocks.length) return [];

  const validBlockIds = new Set(blocks.map((block) => block.id));
  const resumeBoundaries = new Set(resumeBlocks.filter((id) => validBlockIds.has(id)));
  const chunks: MicroChunk[] = [];

  let bucket: LessonBlock[] = [];
  let bucketWords = 0;

  const flush = () => {
    if (!bucket.length) return;
    const chunkId = `chunk-${chunks.length + 1}`;
    chunks.push({
      id: chunkId,
      blockIds: bucket.map((item) => item.id),
      estimatedSeconds: estimateSeconds(Math.max(bucketWords, 40)),
    });
    bucket = [];
    bucketWords = 0;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const shouldStartNewChunk =
      bucket.length > 0 &&
      (resumeBoundaries.has(block.id) ||
        block.type === 'heading' ||
        block.type === 'dialogue' ||
        bucketWords >= TARGET_WORDS_PER_CHUNK);

    if (shouldStartNewChunk) {
      flush();
    }

    bucket.push(block);
    bucketWords += wordCount(block);

    if (bucketWords >= MAX_WORDS_PER_CHUNK) {
      flush();
    }
  }

  flush();
  return chunks;
}

function createEmptyGloss(token: string): GlossEntry {
  return {
    token,
    lemma: token,
    pronunciation: null,
    translation: null,
    pos: null,
    shortNote: null,
    examples: [],
  };
}

function mergeExplicitGloss(target: GlossEntry, explicit: LessonTokenGloss) {
  if (explicit.baseWord) target.lemma = explicit.baseWord;
  if (explicit.translation) target.translation = explicit.translation;
  if (explicit.pronunciation) target.pronunciation = explicit.pronunciation;
  if (explicit.usage) target.shortNote = explicit.usage;
  for (const example of explicit.examples || []) {
    addExample(target, example);
  }
}

function addExample(entry: GlossEntry, example: string) {
  if (!example) return;
  if (entry.examples.includes(example)) return;
  if (entry.examples.length >= 3) return;
  entry.examples.push(example);
}

export function buildGlossIndex(lesson: LessonContent): Map<string, GlossEntry> {
  const gloss = new Map<string, GlossEntry>();
  const blocks = lesson.blocks || [];

  for (const explicit of lesson.tokenGlosses || []) {
    const token = normalizeToken(explicit.token || '');
    if (!token) continue;
    const existing = gloss.get(token) || createEmptyGloss(token);
    mergeExplicitGloss(existing, explicit);
    gloss.set(token, existing);
  }

  for (const block of blocks) {
    if (block.type !== 'dialogue') continue;

    for (const turn of block.turns || []) {
      const tokens = tokenize(turn.text || '');
      const translation = (turn.translation || '').trim() || null;

      const tokenCount = tokens.length;
      for (const token of tokens) {
        if (!isLikelyIrishToken(token)) continue;

        const existing = gloss.get(token) || createEmptyGloss(token);
        const hasExplicitTranslation = Boolean(existing.translation);
        const hasExplicitPronunciation = Boolean(existing.pronunciation);
        const hasExplicitUsage = Boolean(existing.shortNote);
        existing.lemma = existing.lemma || token;
        // Word-level pronunciation is usually unavailable in current content.
        // Avoid injecting phrase-level pronunciation as if it were token-level.
        if (!hasExplicitPronunciation) {
          existing.pronunciation = null;
        }
        if (translation && tokenCount === 1) {
          const existingWordCount = existing.translation ? tokenize(existing.translation).length : Number.POSITIVE_INFINITY;
          const candidateWordCount = tokenize(translation).length;
          const isAtomicTokenLine = tokenCount === 1;
          const isShortCandidate = candidateWordCount <= 3;
          const shouldReplace =
            !existing.translation ||
            (isAtomicTokenLine && isShortCandidate) ||
            candidateWordCount < existingWordCount;
          if (shouldReplace && !hasExplicitTranslation) {
            existing.translation = translation;
          }
        }
        if (!hasExplicitUsage) {
          existing.shortNote = null;
        }
        addExample(existing, turn.text || '');
        gloss.set(token, existing);
      }
    }
  }

  return gloss;
}

function normalizeFreeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findContextPhraseGloss(
  glossary: Map<string, GlossEntry>,
  normalizedToken: string,
  normalizedContext: string,
): GlossEntry | null {
  if (!normalizedContext) return null;
  const paddedContext = ` ${normalizedContext} `;

  let best: { key: string; entry: GlossEntry } | null = null;
  let bestScore = -1;

  for (const [key, entry] of glossary.entries()) {
    if (!key.includes(' ')) continue;
    const phraseTokens = tokenize(key);
    if (!phraseTokens.includes(normalizedToken)) continue;
    const needle = ` ${key} `;
    if (!paddedContext.includes(needle)) continue;
    if (!entry.translation) continue;

    const score = phraseTokens.length * 100 + key.length;
    if (score > bestScore) {
      bestScore = score;
      best = { key, entry };
    }
  }

  if (!best) return null;
  return {
    ...best.entry,
    token: best.key,
    lemma: best.entry.lemma || best.key,
  };
}

export function resolveGlossWithContext(
  blocks: LessonBlock[],
  glossary: Map<string, GlossEntry>,
  token: string,
  context?: string,
  blockId?: string,
): GlossEntry {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return resolveGloss(glossary, token, context);
  }

  const hasContextConstraint = Boolean((context && context.trim()) || (blockId && blockId.trim()));
  if (!hasContextConstraint) {
    return resolveGloss(glossary, normalizedToken, context);
  }

  const normalizedContext = context ? normalizeFreeText(context) : '';
  const phraseHit = findContextPhraseGloss(glossary, normalizedToken, normalizedContext);
  if (phraseHit) {
    return {
      ...phraseHit,
      examples: context ? [context, ...phraseHit.examples.filter((item) => item !== context)].slice(0, 3) : phraseHit.examples,
    };
  }

  let contextualHit: {
    text: string;
    translation: string | null;
    tokenCount: number;
  } | null = null;

  for (const block of blocks) {
    if (block.type !== 'dialogue') continue;
    if (blockId && block.id !== blockId) continue;

    for (const turn of block.turns || []) {
      const turnText = String(turn.text || '');
      const turnTokens = tokenize(turnText);
      if (!turnTokens.includes(normalizedToken)) continue;

      const turnContext = normalizeFreeText(turnText);
      const matchesContext = normalizedContext && turnContext === normalizedContext;

      if (matchesContext) {
        contextualHit = {
          text: turnText,
          translation: (turn.translation || '').trim() || null,
          tokenCount: turnTokens.length,
        };
        break;
      }

      if (!contextualHit) {
        contextualHit = {
          text: turnText,
          translation: (turn.translation || '').trim() || null,
          tokenCount: turnTokens.length,
        };
      }
    }

    if (contextualHit && normalizedContext) break;
  }

  const base = resolveGloss(glossary, normalizedToken, context);
  if (!contextualHit) return base;

  const contextualTranslation =
    contextualHit.tokenCount === 1 ? contextualHit.translation : null;

  return {
    ...base,
    translation: contextualTranslation || base.translation,
    examples: contextualHit.text ? [contextualHit.text, ...base.examples.filter((item) => item !== contextualHit.text)].slice(0, 3) : base.examples,
  };
}

export function resolveGloss(
  glossary: Map<string, GlossEntry>,
  token: string,
  context?: string,
): GlossEntry {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return {
      token,
      lemma: token,
      pronunciation: null,
      translation: null,
      pos: null,
      shortNote: 'No gloss yet for this token.',
      examples: context ? [context] : [],
    };
  }

  const hit = glossary.get(normalized);
  if (hit) {
    return {
      ...hit,
      token: normalized,
      lemma: hit.lemma || normalized,
      shortNote: hit.shortNote || null,
    };
  }

  return {
    token: normalized,
    lemma: normalized,
    pronunciation: null,
    translation: null,
    pos: null,
    shortNote: null,
    examples: context ? [context] : [],
  };
}

export function nextMicroChunkId(chunks: MicroChunk[], completedChunkIds: string[]): string | null {
  if (!chunks.length) return null;
  const completed = new Set(completedChunkIds);
  const next = chunks.find((chunk) => !completed.has(chunk.id));
  return next?.id ?? null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function inferUnitDeckSlug(lesson: LessonContent): string {
  if (lesson.pedagogy?.unitDeckSlug) return lesson.pedagogy.unitDeckSlug;
  const base = lesson.lessonSlug.replace(/-lesson-\d+-\d+.*$/i, '');
  return slugify(base || `${lesson.courseSlug}-core`);
}

function extractionNotes(blocks: LessonBlock[]): LessonSupportNote[] {
  const notes: LessonSupportNote[] = [];
  const prose = blocks.filter(
    (block) => block.type === 'heading' || block.type === 'paragraph' || block.type === 'list',
  );

  for (let i = 0; i < prose.length; i += 1) {
    const block = prose[i];
    if (block.type === 'heading') {
      const level = Number(block.level || 0);
      const title = String(block.text || '').trim();
      if (!title || level <= 1) continue;

      const headingPrefix = '#'.repeat(Math.min(4, Math.max(2, level)));
      notes.push({
        id: `${block.id}-note`,
        text: `${headingPrefix} ${title}`,
        tier: 'support',
      });
      continue;
    }

    const text =
      block.type === 'list'
        ? (block.items || []).join(' ')
        : String(block.text || '');
    const trimmed = text.trim();
    if (!trimmed || trimmed === '---') continue;

    const tier: 'support' | 'deep' =
      trimmed.length > 230 || /literally|grammar|abbreviated|another form|comes from/i.test(trimmed)
        ? 'deep'
        : 'support';

    notes.push({
      id: `${block.id}-note`,
      text: trimmed,
      tier,
    });
  }

  return notes;
}

function phraseTokens(text: string, translation?: string, pronunciation?: string) {
  return tokenize(text).map((token) => ({
    token,
    lemma: token,
    pronunciation,
    translation,
    usageHint: translation ? `Used in: ${translation}` : undefined,
  }));
}

function phraseHint(speaker: string | undefined, text: string, translation?: string): string {
  const line = text.trim();
  const who = String(speaker || '').toLowerCase().includes('barista') ? 'barista' : 'customer';
  if (line.endsWith('?')) {
    return `Use this when you ${who === 'barista' ? 'ask the customer a question.' : 'answer a question.'}`;
  }
  if (translation && translation.length <= 24) {
    return `Core response used in this exchange.`;
  }
  return `Core line used naturally in this exchange.`;
}

export function buildPedagogyView(lesson: LessonContent): LessonPedagogyView {
  const notes = extractionNotes(lesson.blocks);
  const supportNotes = notes.filter((note) => note.tier === 'support');
  const deepNotes = notes.filter((note) => note.tier === 'deep');

  const firstDeep = deepNotes[0]?.text;
  const coreFlow: LessonCorePhrase[] = [];

  for (const block of lesson.blocks) {
    if (block.type !== 'dialogue') continue;
    for (let idx = 0; idx < (block.turns || []).length; idx += 1) {
      const turn = block.turns?.[idx];
      if (!turn || !turn.text) continue;
      const translation = turn.translation?.trim() || undefined;
      const pronunciation = turn.pronunciation?.trim() || undefined;
      const speaker = turn.speaker?.trim() || 'Speaker';

      coreFlow.push({
        phraseId: `${lesson.lessonSlug}:${block.id}:${idx + 1}`,
        blockId: block.id,
        speaker,
        text: turn.text,
        translation,
        pronunciation,
        hint: phraseHint(speaker, turn.text, translation),
        deepExplanation: firstDeep,
        tokens: phraseTokens(turn.text, translation, pronunciation),
        retrievalPrompt: translation
          ? {
              type: 'translate_to_irish',
              prompt: `How do you say: "${translation}"`,
              expected: turn.text,
            }
          : undefined,
        tier: 'core',
      });
    }
  }

  return {
    defaultMode: 'full',
    pedagogyFocus: 'spoken_survival',
    unitDeckSlug: inferUnitDeckSlug(lesson),
    autoTrackPhrasebook: lesson.pedagogy?.autoTrackPhrasebook !== false,
    autoTrackLexicon: lesson.pedagogy?.autoTrackLexicon !== false,
    core_flow: coreFlow,
    micro_notes: supportNotes,
    deep_notes: deepNotes,
  };
}
