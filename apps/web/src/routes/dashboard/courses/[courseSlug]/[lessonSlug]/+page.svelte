<script lang="ts">
  import { browser } from '$app/environment';
  import { cubicOut } from 'svelte/easing';
  import { tweened } from 'svelte/motion';
  import { goto } from '$app/navigation';
  import { onDestroy, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import AppModal from '$lib/components/ui/AppModal.svelte';
  import {
    appendStudySessionQuery,
    applyLessonProgressFromCatalog,
    loadStudySession,
    recommendedStudyHref,
    saveStudySession,
    studyCoordinatorHref,
    type StudyCatalogCourse,
    type StudySession,
  } from '$lib/study-session';
  export let data;

  type LessonPayload = {
    lesson: {
      courseSlug: string;
      courseTitle: string;
      lessonSlug: string;
      lessonTitle: string;
      estimatedMinutes: number;
      contentVersion: string;
    };
    progress: {
      status: 'not_started' | 'in_progress' | 'completed';
      progressPercent: number;
      lastBlockId: string | null;
      completedAt: string | null;
      timeSpentSec: number;
      contentVersion: string;
      swapQuizState?: Record<string, SwapQuizState> | null;
    };
    pedagogy: {
      defaultMode: 'full';
      pedagogyFocus: 'spoken_survival';
      unitDeckSlug: string;
      autoTrackPhrasebook: boolean;
      autoTrackLexicon: boolean;
      core_flow: Array<{
        phraseId: string;
        blockId: string;
        speaker: string;
        text: string;
        translation?: string;
        pronunciation?: string;
        hint: string;
        deepExplanation?: string;
        tokens: Array<{
          token: string;
          lemma?: string;
          pronunciation?: string;
          translation?: string;
          usageHint?: string;
        }>;
        retrievalPrompt?: {
          type: 'translate_to_irish';
          prompt: string;
          expected: string;
        };
        tier: 'core';
      }>;
      micro_notes: Array<{ id: string; text: string; tier: 'support' | 'deep' }>;
      deep_notes: Array<{ id: string; text: string; tier: 'support' | 'deep' }>;
    };
  };

  type GlossPayload = {
    token: string;
    lemma: string;
    pronunciation?: string | null;
    translation?: string | null;
    pos?: string | null;
    shortNote?: string | null;
    examples?: string[];
  };

  type CourseNavLesson = {
    lessonSlug: string;
    lessonTitle: string;
    order: number;
    estimatedMinutes: number;
    progress?: {
      status?: 'not_started' | 'in_progress' | 'completed';
      progressPercent?: number;
      lastBlockId?: string | null;
      lastSeenAt?: string | null;
    };
  };

  type CourseNavCourse = {
    courseSlug: string;
    lessons: CourseNavLesson[];
  };

  type Deck = { id: number; name: string };
  type SyncDiff = { phrasebookAdded: number; flashcardsAdded: number };
  type ToastItem = { id: number; message: string };
  type SwapOption = {
    irish: string;
    pronunciation: string;
    translation: string;
  };
  type VocabRow = {
    phrase: string;
    pronunciation: string;
    translation: string;
  };
  type DetailedNoteBlock =
    | { kind: 'paragraph'; id: string; text: string }
    | { kind: 'section'; id: string; text: string; level: number }
    | { kind: 'swap'; id: string; target: string; options: SwapOption[] }
    | { kind: 'vocab'; id: string; row: VocabRow };
  type SwapQuizState = {
    answer: string;
    status: 'idle' | 'empty' | 'incorrect' | 'correct';
    attempts: number;
    solvedOptionKeys: string[];
  };
  type LexiconExposureSource = 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect';

  let loading = true;
  let error = '';
  let payload: LessonPayload | null = null;
  let previousLessonHref = '';
  let nextLessonHref = '';
  let courseProgressPercent = 0;
  let courseProgressReady = false;
  const animatedProgress = tweened(0, { duration: 700, easing: cubicOut });
  let displayedProgressPercent = 0;
  let studySession: StudySession | null = null;
  let studyCoordinatorLink = '';
  let studyLessonsProgress = 0;
  let studyLessonsTarget = 0;
  let authClientId = '';
  let showStudyTargetReachedModal = false;
  let showFinishSessionButton = false;
  let pendingLessonAdvanceHref = '';
  const STUDY_CONTINUE_LESSONS_KEY_PREFIX = 'decyphr.studySession.continueLessons.v1';

  let currentBlockId: string | null = null;
  let observer: IntersectionObserver | null = null;
  let visibilityHandler: (() => void) | null = null;
  let unloadHandler: (() => void) | null = null;
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  let swapCheckHandler: ((event: MouseEvent) => void) | null = null;
  let activeRouteKey = '';
  let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  let glossLoading = false;
  let popoverOpen = false;
  let popoverPinned = false;
  let popoverX = 0;
  let popoverY = 0;
  let popoverToken = '';
  let popoverTranslation = '';
  let popoverRequestId = 0;
  const glossCache = new Map<string, GlossPayload>();
  let toasts: ToastItem[] = [];
  let toastSeq = 0;
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  let phrasebookTextCache = new Set<string>();
  let flashcardDeckId: number | null = null;
  let flashcardCardCache = new Set<string>();
  let lexiconRenderSent = new Set<string>();
  let trackingBootstrapped = false;
  let trackingBootstrapPromise: Promise<void> | null = null;
  let renderSessionId = '';
  let microNoteBlocks: DetailedNoteBlock[] = [];
  let deepNoteBlocks: DetailedNoteBlock[] = [];
  let swapQuizState: Record<string, SwapQuizState> = {};
  let swapQuizKeys: string[] = [];
  let swapOptionsByKey: Record<string, SwapOption[]> = {};
  let pendingSwapOptionCount = 0;
  let lessonAdvanceBlockedBySwaps = false;

  function normalizeText(value: string) {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function studyContinueLessonsKey(sessionId: string) {
    return `${STUDY_CONTINUE_LESSONS_KEY_PREFIX}:${sessionId}`;
  }

  function sanitizeSwapQuizStateRecord(raw: unknown) {
    if (!raw || typeof raw !== 'object') return {} as Record<string, SwapQuizState>;

    const next: Record<string, SwapQuizState> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!key || !value || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      const statusValue = row.status;
      const status: SwapQuizState['status'] =
        statusValue === 'idle' || statusValue === 'empty' || statusValue === 'incorrect' || statusValue === 'correct'
          ? statusValue
          : 'idle';
      const attempts = Number(row.attempts);
      const solvedOptionKeys = Array.isArray(row.solvedOptionKeys)
        ? Array.from(
            new Set(
              row.solvedOptionKeys
                .map((item) => String(item || '').trim())
                .filter(Boolean),
            ),
          )
        : [];

      next[key] = {
        answer: typeof row.answer === 'string' ? row.answer.slice(0, 180) : '',
        status,
        attempts: Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0,
        solvedOptionKeys,
      };
    }

    return next;
  }


  function loadContinueLessonsPreference(sessionId: string) {
    if (!browser || !sessionId) return false;
    try {
      return window.sessionStorage.getItem(studyContinueLessonsKey(sessionId)) === '1';
    } catch {
      return false;
    }
  }

  function saveContinueLessonsPreference(sessionId: string, enabled: boolean) {
    if (!browser || !sessionId) return;
    try {
      if (enabled) {
        window.sessionStorage.setItem(studyContinueLessonsKey(sessionId), '1');
      } else {
        window.sessionStorage.removeItem(studyContinueLessonsKey(sessionId));
      }
    } catch {
      // Best effort.
    }
  }

  function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return count === 1 ? singular : plural;
  }

  async function loadAuthContext() {
    authClientId = '';
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      authClientId = String(payload?.clientId || '').trim();
    } catch {
      authClientId = '';
    }
  }

  async function refreshPhrasebookCache() {
    try {
      const phraseRes = await fetch('/api/proxy/phrasebook/list', {
        cache: 'no-store',
      });
      if (!phraseRes.ok) return false;
      const rows = await phraseRes.json();
      if (!Array.isArray(rows)) return false;
      phrasebookTextCache = new Set(
        rows
          .map((row) => normalizeText(String(row?.text || '')))
          .filter(Boolean),
      );
      return true;
    } catch {
      return false;
    }
  }

  function pushToast(message: string, durationMs = 4200) {
    const id = ++toastSeq;
    toasts = [...toasts, { id, message }];

    const timer = setTimeout(() => {
      toasts = toasts.filter((item) => item.id !== id);
      toastTimers.delete(id);
    }, durationMs);

    toastTimers.set(id, timer);
  }

  function showSyncToast(diff: SyncDiff) {
    const practiceAdded = diff.phrasebookAdded;
    const hasPhrasebook = diff.phrasebookAdded > 0;
    const hasPractice = practiceAdded > 0;
    const hasFlashcards = diff.flashcardsAdded > 0;

    if (!hasPhrasebook && !hasPractice && !hasFlashcards) return;

    if (
      hasPhrasebook &&
      hasPractice &&
      hasFlashcards &&
      diff.phrasebookAdded === practiceAdded &&
      practiceAdded === diff.flashcardsAdded
    ) {
      const count = diff.phrasebookAdded;
      pushToast(`Added ${count} ${pluralize(count, 'phrase')} to Phrasebook, Practice, and Flashcards`);
      return;
    }

    const segments: string[] = [];
    if (hasPhrasebook) segments.push(`Phrasebook: +${diff.phrasebookAdded}`);
    if (hasPractice) segments.push(`Practice: +${practiceAdded}`);
    if (hasFlashcards) segments.push(`Flashcards: +${diff.flashcardsAdded}`);
    pushToast(`Added phrases (${segments.join(' • ')})`);
  }

  function phraseDomId(phraseId: string) {
    return `phrase-${phraseId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
  }

  function normalizeToken(value: string) {
    return value
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/(^[^a-záéíóú'-]+|[^a-záéíóú'-]+$)/gi, '')
      .trim();
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderPhraseTokens(value: string) {
    const parts = value.match(/[\p{L}\p{M}'’-]+|[^\p{L}\p{M}'’-]+/gu) || [];
    return parts
      .map((part) => {
        const token = normalizeToken(part);
        if (!token) return escapeHtml(part);
        return `<button type=\"button\" class=\"dialogue-token\" data-gloss-token=\"${escapeHtml(token)}\" data-gloss-context=\"${escapeHtml(value)}\">${escapeHtml(part)}</button>`;
      })
      .join('');
  }

  function renderInlineIrish(value: string) {
    const escaped = escapeHtml(value);
    return escaped.replace(/`([^`]+)`/g, '<span class="irish-inline">$1</span>');
  }

  function parseSwapHeader(value: string) {
    const text = String(value || '').trim();
    const match = text.match(/^Instead of\s+`([^`]+)`\s*:\s*(.*)$/i);
    if (!match) return null;
    return {
      target: (match[1] || '').trim(),
      optionsInline: (match[2] || '').trim(),
    };
  }

  function normalizeSwapAnswer(value: string) {
    return String(value || '')
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeSwapAnswerAscii(value: string) {
    return normalizeSwapAnswer(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function getSwapQuizState(key: string): SwapQuizState {
    return swapQuizState[key] || { answer: '', status: 'idle', attempts: 0, solvedOptionKeys: [] };
  }

  function setSwapAnswer(key: string, value: string) {
    const current = getSwapQuizState(key);
    swapQuizState = {
      ...swapQuizState,
      [key]: {
        ...current,
        answer: value,
        status: value.trim() ? 'idle' : current.status === 'correct' ? 'correct' : 'idle',
      },
    };
  }

  function swapOptionKey(value: string) {
    return normalizeSwapAnswerAscii(value) || normalizeSwapAnswer(value);
  }

  function findMatchedSwapOptionKeys(options: SwapOption[], answer: string) {
    const normalized = normalizeSwapAnswer(answer);
    const normalizedAscii = normalizeSwapAnswerAscii(answer);
    if (!normalized) return [] as string[];

    return options
      .filter((option) => {
        const candidate = normalizeSwapAnswer(option.irish);
        if (!candidate) return false;
        if (candidate === normalized) return true;
        return normalizeSwapAnswerAscii(option.irish) === normalizedAscii;
      })
      .map((option) => swapOptionKey(option.irish))
      .filter(Boolean);
  }

  function isSwapOptionSolved(quiz: SwapQuizState, option: SwapOption) {
    const key = swapOptionKey(option.irish);
    if (!key) return false;
    return quiz.solvedOptionKeys.includes(key);
  }

  function swapInputStateClass(status: SwapQuizState['status']) {
    if (status === 'incorrect' || status === 'empty') return 'swap-input-error';
    if (status === 'correct') return 'swap-input-success';
    return '';
  }

  function extractSwapAttemptTokens(value: string) {
    return Array.from(
      new Set(
        (String(value || '').match(/[\p{L}\p{M}'’-]+/gu) || [])
          .map((token) => normalizeToken(token))
          .filter(Boolean),
      ),
    );
  }

  async function trackSwapAttemptLexicon(
    key: string,
    answer: string,
    correct: boolean,
    attemptIndex: number,
  ) {
    if (!payload || !payload.pedagogy.autoTrackLexicon) return;
    const tokens = extractSwapAttemptTokens(answer);
    if (tokens.length === 0) return;

    const source: LexiconExposureSource = correct ? 'swap_correct' : 'swap_incorrect';
    const eventId = `swap:${source}:${payload.lesson.contentVersion}:${renderSessionId}:${key}:${attemptIndex}:${Date.now()}`;

    try {
      await fetch(
        `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/lexicon-exposure`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens,
            source,
            eventId,
            contentVersion: payload.lesson.contentVersion,
          }),
        },
      );
    } catch {
      // best effort
    }
  }

  function checkSwapAnswer(key: string, options: SwapOption[]) {
    const current = getSwapQuizState(key);
    const attempted = Boolean(current.answer.trim());
    const matchedOptionKeys = attempted ? findMatchedSwapOptionKeys(options, current.answer) : [];
    const correct = matchedOptionKeys.length > 0;
    const nextStatus = !attempted
      ? 'empty'
      : correct
        ? 'correct'
        : 'incorrect';
    const nextAttempts = current.attempts + 1;
    const nextSolvedOptionKeys = correct
      ? Array.from(new Set([...current.solvedOptionKeys, ...matchedOptionKeys]))
      : current.solvedOptionKeys;

    swapQuizState = {
      ...swapQuizState,
      [key]: {
        ...current,
        answer: correct ? '' : current.answer,
        status: nextStatus,
        attempts: nextAttempts,
        solvedOptionKeys: nextSolvedOptionKeys,
      },
    };

    if (attempted) {
      void trackSwapAttemptLexicon(key, current.answer, correct, nextAttempts);
    }

    void persistProgress(false, 0).catch(() => undefined);
  }

  function onSwapInput(event: Event, key: string) {
    const input = event.currentTarget as HTMLInputElement | null;
    setSwapAnswer(key, input?.value || '');
  }

  function onSwapKeydown(event: KeyboardEvent, key: string, options: SwapOption[]) {
    const lower = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (lower === 'c' || lower === 'v' || lower === 'x')) {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    checkSwapAnswer(key, options);
  }

  function blockClipboardEvent(event: ClipboardEvent) {
    event.preventDefault();
  }

  function blockDropEvent(event: DragEvent) {
    event.preventDefault();
  }

  function handleSwapCheckClick(event: MouseEvent, key: string, options: SwapOption[]) {
    event.preventDefault();
    event.stopPropagation();
    checkSwapAnswer(key, options);
  }

  function onDocumentSwapCheck(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-swap-check-key]') as HTMLButtonElement | null;
    if (!button) return;
    const key = button.dataset.swapCheckKey || '';
    if (!key) return;
    handleSwapCheckClick(event, key, swapOptionsByKey[key] || []);
  }

  function looksLikeSwapOptions(value: string) {
    const text = String(value || '').trim();
    return text.startsWith('>') || text.includes(' > ') || text.includes('>');
  }

  function parseNoteHeading(value: string) {
    const text = String(value || '').trim();
    const match = text.match(/^(#{2,4})\s+(.+)$/);
    if (!match) return null;
    return {
      level: match[1].length,
      text: (match[2] || '').trim(),
    };
  }

  function parseInlineSectionLabel(value: string) {
    const text = String(value || '').trim();
    if (!text.endsWith(':')) return null;
    if (text.length > 56) return null;
    if (text.includes('.')) return null;
    const label = text.replace(/:\s*$/, '').trim();
    if (!label || label.split(/\s+/).filter(Boolean).length > 4) return null;
    return label || null;
  }

  function cleanVocabToken(value: string) {
    return String(value || '')
      .replace(/^[([{"'“”‘’.,!?;:]+/, '')
      .replace(/[)\]}",'“”‘’.,!?;:]+$/, '')
      .trim();
  }

  function tokenHasPronunciationSignal(token: string) {
    const cleaned = cleanVocabToken(token);
    if (!cleaned) return false;
    if (/[A-Z]{2,}/.test(cleaned)) return true;
    if (/-/.test(cleaned) && /[A-Z]/.test(cleaned)) return true;
    return /[A-Z].*[A-Z]/.test(cleaned);
  }

  function tokenLooksTranslationStart(token: string) {
    const cleaned = cleanVocabToken(token);
    if (!cleaned) return false;
    if (/^[€$£]?\d/.test(cleaned)) return true;
    return /^[A-Z][A-Za-z]+$/.test(cleaned);
  }

  function tokenLooksTranslationWord(token: string) {
    const cleaned = cleanVocabToken(token);
    if (!cleaned) return false;
    if (/^[€$£]?\d+(?:[.,]\d+)?$/.test(cleaned)) return true;
    return /^[A-Za-z]+$/.test(cleaned);
  }

  function parseVocabRow(value: string): VocabRow | null {
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text || text.length < 4 || text.endsWith(':')) return null;
    if (text.includes('`') || text.includes('>')) return null;

    const tokens = text.split(' ').filter(Boolean);
    if (tokens.length < 3) return null;

    let phrase = '';
    let pronunciation = '';
    let translation = '';

    const strongPronStart = tokens.findIndex((token, idx) => idx > 0 && tokenHasPronunciationSignal(token));
    const pronunciationConnectors = new Set([
      'leh',
      'gon',
      'wah',
      'lyat',
      'will',
      'bih',
      'noh',
      'duh',
      'sent',
    ]);
    if (strongPronStart > 0) {
      let pronStart = strongPronStart;
      let boundaryFound = false;
      for (let i = strongPronStart - 1; i >= 0; i -= 1) {
        if (/[.?!]$/.test(tokens[i])) {
          pronStart = i + 1;
          boundaryFound = true;
          break;
        }
      }

      if (!boundaryFound) {
        let candidate = pronStart - 1;
        while (candidate >= 1) {
          const cleaned = cleanVocabToken(tokens[candidate]);
          if (!cleaned) break;

          if (tokenHasPronunciationSignal(cleaned)) {
            pronStart = candidate;
            candidate -= 1;
            continue;
          }

          const isTitlePronWord = /^[A-Z][a-z]+$/.test(cleaned) && cleaned.length <= 6;
          if (isTitlePronWord) {
            pronStart = candidate;
            candidate -= 1;
            continue;
          }

          const isLowerPronConnector =
            /^[a-z]+$/.test(cleaned) &&
            cleaned.length <= 6 &&
            pronunciationConnectors.has(cleaned.toLowerCase());
          if (isLowerPronConnector) {
            pronStart = candidate;
            candidate -= 1;
            continue;
          }

          break;
        }
      }

      let translationStart = -1;
      for (let i = tokens.length - 1; i > pronStart; i -= 1) {
        const token = tokens[i];
        if (!tokenLooksTranslationStart(token) || tokenHasPronunciationSignal(token)) continue;
        const tail = tokens.slice(i);
        if (tail.length > 6) continue;
        if (!tail.every((item) => tokenLooksTranslationWord(item))) continue;
        translationStart = i;
        break;
      }

      phrase = tokens.slice(0, pronStart).join(' ').trim();
      pronunciation = tokens
        .slice(pronStart, translationStart > pronStart ? translationStart : tokens.length)
        .join(' ')
        .trim();
      translation = translationStart > pronStart ? tokens.slice(translationStart).join(' ').trim() : '';

      if (phrase && pronunciation) {
        return {
          phrase,
          pronunciation,
          translation,
        };
      }
    }

    if (/[.?!]/.test(text) || tokens.length > 10) return null;

    let translationStart = -1;
    for (let i = tokens.length - 1; i >= 1; i -= 1) {
      const token = tokens[i];
      if (!tokenLooksTranslationStart(token) || tokenHasPronunciationSignal(token)) continue;
      const tail = tokens.slice(i);
      if (tail.length > 6) continue;
      if (!tail.every((item) => tokenLooksTranslationWord(item))) continue;
      translationStart = i;
      break;
    }

    if (translationStart >= 2) {
      const head = tokens.slice(0, translationStart);
      let splitAt = Math.floor(head.length / 2);
      if (splitAt < 1) splitAt = 1;
      if (splitAt >= head.length) splitAt = head.length - 1;

      phrase = head.slice(0, splitAt).join(' ').trim();
      pronunciation = head.slice(splitAt).join(' ').trim();
      translation = tokens.slice(translationStart).join(' ').trim();

      if (phrase && pronunciation) {
        return {
          phrase,
          pronunciation,
          translation,
        };
      }
    }

    return null;
  }

  function parseSwapOptions(value: string): SwapOption[] {
    const tokens = String(value || '')
      .split('>')
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) return [];

    const options: SwapOption[] = [];
    for (let i = 0; i < tokens.length; i += 3) {
      const irish = tokens[i] || '';
      const pronunciation = tokens[i + 1] || '';
      const translation = tokens[i + 2] || '';
      if (!irish) continue;
      options.push({ irish, pronunciation, translation });
    }
    return options;
  }

  function buildDetailedNoteBlocks(
    notes: Array<{ id: string; text: string }>,
  ): DetailedNoteBlock[] {
    const blocks: DetailedNoteBlock[] = [];

    for (let i = 0; i < notes.length; i += 1) {
      const note = notes[i];
      const heading = parseNoteHeading(note?.text || '');
      if (heading) {
        blocks.push({
          kind: 'section',
          id: note.id,
          text: heading.text,
          level: heading.level,
        });
        continue;
      }

      const header = parseSwapHeader(note?.text || '');

      if (header) {
        let source = header.optionsInline;
        let consumedNext = false;

        if (!source || !looksLikeSwapOptions(source)) {
          const next = notes[i + 1];
          if (next && looksLikeSwapOptions(next.text)) {
            source = next.text;
            consumedNext = true;
          }
        }

        const options = parseSwapOptions(source);
        if (options.length > 0) {
          blocks.push({
            kind: 'swap',
            id: consumedNext ? `${note.id}::${notes[i + 1]?.id || 'next'}` : note.id,
            target: header.target,
            options,
          });
          if (consumedNext) i += 1;
          continue;
        }
      }

      const inlineSectionLabel = parseInlineSectionLabel(note?.text || '');
      if (inlineSectionLabel) {
        blocks.push({
          kind: 'section',
          id: note.id,
          text: inlineSectionLabel,
          level: 4,
        });
        continue;
      }

      const vocabRow = parseVocabRow(note?.text || '');
      if (vocabRow) {
        blocks.push({
          kind: 'vocab',
          id: note.id,
          row: vocabRow,
        });
        continue;
      }

      blocks.push({ kind: 'paragraph', id: note.id, text: note.text });
    }

    return blocks;
  }

  function speakerBubbleClass(speaker: string) {
    const normalized = (speaker || '').toLowerCase();
    if (normalized.includes('barista')) return 'lesson-bubble lesson-bubble-barista mr-10';
    return 'lesson-bubble lesson-bubble-customer ml-10';
  }

  function completionFallbackHref(baseHref: string): string {
    if (!payload || !baseHref) return baseHref;
    const params = new URLSearchParams();
    params.set('completeCourse', payload.lesson.courseSlug);
    params.set('completeLesson', payload.lesson.lessonSlug);
    return `${baseHref}${baseHref.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  function withStudySession(href: string) {
    return appendStudySessionQuery(href, studySession?.id ?? null);
  }

  function notifySwapAttemptsRequired() {
    const remaining = Math.max(0, pendingSwapOptionCount);
    if (remaining <= 0) return;
    pushToast(
      `Complete ${remaining} more ${pluralize(remaining, 'swap option', 'swap options')} before continuing.`,
    );
  }

  function lessonTargetReachedInActiveStudy() {
    return Boolean(
      studySession &&
      studySession.status === 'active' &&
      studyLessonsTarget > 0 &&
      studyLessonsProgress >= studyLessonsTarget,
    );
  }

  function wouldCompleteLessonTargetOnNext() {
    if (!studySession || studySession.status !== 'active') return false;
    if (!studyCoordinatorLink || showFinishSessionButton) return false;
    if (studyLessonsTarget <= 0) return false;
    if (studyLessonsProgress >= studyLessonsTarget) return false;
    if (!payload || payload.progress.status === 'completed') return false;
    const projected = studyLessonsProgress + 1;
    return projected >= studyLessonsTarget;
  }

  async function continueBeyondLessonTarget() {
    if (!studySession || !pendingLessonAdvanceHref) return;
    saveContinueLessonsPreference(studySession.id, true);
    showFinishSessionButton = true;
    showStudyTargetReachedModal = false;
    const nextHref = pendingLessonAdvanceHref;
    pendingLessonAdvanceHref = '';
    await navigateWithProgress(nextHref, true);
  }

  async function continueToNextSessionStep() {
    if (!studySession || !studyCoordinatorLink) return;
    showStudyTargetReachedModal = false;
    pendingLessonAdvanceHref = '';
    const saved = await persistProgressForNavigation(true);
    if (!saved) return;
    await goto(recommendedStudyHref(studySession));
  }

  function cancelStudyTargetChoice() {
    showStudyTargetReachedModal = false;
    pendingLessonAdvanceHref = '';
  }

  async function flushCompletionFromUrl() {
    if (!browser) return;

    const params = new URLSearchParams(window.location.search);
    const completeCourse = params.get('completeCourse');
    const completeLesson = params.get('completeLesson');
    if (!completeCourse || !completeLesson) return;

    try {
      await fetch(
        `/api/proxy/courses/${encodeURIComponent(completeCourse)}/lessons/${encodeURIComponent(completeLesson)}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completed: true,
            progressPercent: 100,
            timeSpentDeltaSec: 0,
            contentVersion: 'fallback',
          }),
        },
      );
    } catch {
      // Best-effort fallback.
    } finally {
      params.delete('completeCourse');
      params.delete('completeLesson');
      const query = params.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }

  async function loadLessonNavigation(courseSlug: string, lessonSlug: string) {
    previousLessonHref = '';
    nextLessonHref = '';
    courseProgressPercent = 0;
    courseProgressReady = false;

    const res = await fetch('/api/proxy/courses/catalog', { cache: 'no-store' });
    if (!res.ok) return;

    const catalog = await res.json();
    const courses = (catalog?.courses ?? []) as CourseNavCourse[];
    const currentCourse = courses.find((item) => item.courseSlug === courseSlug);
    if (!currentCourse || !Array.isArray(currentCourse.lessons)) return;

    if (studySession) {
      applyLessonProgressFromCatalog(studySession, courses as unknown as StudyCatalogCourse[]);
      saveStudySession(studySession);
      studyLessonsProgress = studySession.progress.lessonsCompleted;
      studyLessonsTarget = studySession.targets.lessons;
      studyCoordinatorLink = studyCoordinatorHref(studySession.id);
    }

    const lessons = currentCourse.lessons.slice().sort((a, b) => a.order - b.order);
    const completedLessons = lessons.filter((item) => item.progress?.status === 'completed').length;
    courseProgressPercent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
    courseProgressReady = true;

    const currentIndex = lessons.findIndex((item) => item.lessonSlug === lessonSlug);
    if (currentIndex < 0) return;

    const previous = lessons[currentIndex - 1];
    const next = lessons[currentIndex + 1];

    if (previous) {
      previousLessonHref = `/dashboard/courses/${encodeURIComponent(courseSlug)}/${encodeURIComponent(previous.lessonSlug)}`;
    }
    if (next) {
      nextLessonHref = `/dashboard/courses/${encodeURIComponent(courseSlug)}/${encodeURIComponent(next.lessonSlug)}`;
    }
  }

  async function loadLesson() {
    if (!data?.courseSlug || !data?.lessonSlug) {
      error = 'Invalid route';
      loading = false;
      return;
    }

    loading = true;
    error = '';
    payload = null;
    courseProgressPercent = 0;
    courseProgressReady = false;
    swapQuizState = {};

    trackingBootstrapped = false;
    trackingBootstrapPromise = null;
    phrasebookTextCache = new Set();
    flashcardDeckId = null;
    flashcardCardCache = new Set();
    lexiconRenderSent = new Set();
    renderSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await loadAuthContext();
    const nextStudySessionId = browser ? new URLSearchParams(window.location.search).get('studySession') || '' : '';
    const scopedStudySessionId = authClientId ? nextStudySessionId : '';
    studySession = scopedStudySessionId ? loadStudySession(scopedStudySessionId, authClientId || null) : null;
    studyCoordinatorLink = studySession ? studyCoordinatorHref(studySession.id) : '';
    studyLessonsProgress = studySession?.progress.lessonsCompleted ?? 0;
    studyLessonsTarget = studySession?.targets.lessons ?? 0;
    showFinishSessionButton = studySession ? loadContinueLessonsPreference(studySession.id) : false;
    showStudyTargetReachedModal = false;

    try {
      await flushCompletionFromUrl();

      const res = await fetch(`/api/proxy/courses/${encodeURIComponent(data.courseSlug)}/lessons/${encodeURIComponent(data.lessonSlug)}`, {
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(await res.text());
      payload = await res.json();
      swapQuizState = sanitizeSwapQuizStateRecord(payload?.progress?.swapQuizState);

      await loadLessonNavigation(data.courseSlug, data.lessonSlug);
      await tick();

      const firstPhrase = payload?.pedagogy?.core_flow?.[0];
      const renderableBlockIds = new Set((payload?.pedagogy?.core_flow ?? []).map((item) => item.blockId));
      const hashBlockId =
        browser && window.location.hash ? decodeURIComponent(window.location.hash.slice(1)).trim() : '';
      const preferredBlockId = hashBlockId || payload?.progress?.lastBlockId || firstPhrase?.blockId || null;
      currentBlockId =
        preferredBlockId && renderableBlockIds.has(preferredBlockId)
          ? preferredBlockId
          : firstPhrase?.blockId || null;

      if (currentBlockId) {
        await tick();
        const target = Array.from(document.querySelectorAll<HTMLElement>('[data-block-id]')).find(
          (node) => node.getAttribute('data-block-id') === currentBlockId,
        );
        target?.scrollIntoView({ block: 'start' });
      }

      bindObserver();
      startProgressSync();
      syncAllCorePhrases().catch(() => undefined);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load lesson';
      payload = null;
    } finally {
      loading = false;
    }
  }

  async function bootstrapTracking() {
    if (!payload || trackingBootstrapped) return;
    if (trackingBootstrapPromise) return trackingBootstrapPromise;

    trackingBootstrapPromise = (async () => {
      try {
        await refreshPhrasebookCache();

        const deckName = `Unit: ${payload.lesson.courseTitle} • ${payload.pedagogy.unitDeckSlug}`;
        const decksRes = await fetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
        let decks: Deck[] = [];
        if (decksRes.ok) {
          const raw = await decksRes.json();
          decks = Array.isArray(raw) ? raw : [];
        }

        let deck = decks.find((item) => item.name === deckName);
        if (!deck) {
          const createDeckRes = await fetch('/api/proxy/flashcards/decks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: deckName,
              description: `Auto-generated from ${payload.lesson.lessonTitle}`,
              language: payload.lesson.courseSlug === 'cafe' ? 'ga' : 'ga',
            }),
          });
          if (createDeckRes.ok) {
            deck = await createDeckRes.json();
          }
        }

        flashcardDeckId = deck?.id ?? null;

        if (flashcardDeckId) {
          const detailRes = await fetch(`/api/proxy/flashcards/decks/${flashcardDeckId}`, { cache: 'no-store' });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const cards = Array.isArray(detail?.cards) ? detail.cards : [];
            for (const card of cards) {
              const key = `${normalizeText(String(card?.front || ''))}|${normalizeText(String(card?.back || ''))}`;
              if (key !== '|') flashcardCardCache.add(key);
            }
          }
        }
      } catch {
        // Best effort only.
      } finally {
        trackingBootstrapped = true;
      }
    })();

    return trackingBootstrapPromise;
  }

  async function syncPhraseToPhrasebookAndFlashcards(
    phrase: LessonPayload['pedagogy']['core_flow'][number],
  ): Promise<SyncDiff> {
    if (!payload) return { phrasebookAdded: 0, flashcardsAdded: 0 };
    const diff: SyncDiff = { phrasebookAdded: 0, flashcardsAdded: 0 };
    await bootstrapTracking().catch(() => undefined);

    if (payload.pedagogy.autoTrackPhrasebook) {
      const phraseText = normalizeText(phrase.text);
      if (!phrasebookTextCache.has(phraseText)) {
        try {
          const res = await fetch('/api/proxy/phrasebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: phrase.text,
              translation: phrase.translation,
              pronunciation: phrase.pronunciation,
              notes: `${payload.lesson.lessonTitle} • ${phrase.speaker}`,
              autoTranslate: !phrase.translation,
            }),
          });
          if (res.ok) {
            phrasebookTextCache.add(phraseText);
          }
        } catch {
          // best effort
        }
      }
    }

    const deckId = flashcardDeckId;
    const back = phrase.translation || phrase.hint || 'Meaning pending';
    const cardKey = `${normalizeText(phrase.text)}|${normalizeText(back)}`;
    if (deckId && !flashcardCardCache.has(cardKey)) {
      try {
        const res = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            front: phrase.text,
            back,
            pronunciation: phrase.pronunciation,
            notes: `${payload.lesson.lessonTitle} • ${phrase.speaker}`,
          }),
        });
        if (res.ok) {
          flashcardCardCache.add(cardKey);
          diff.flashcardsAdded += 1;
        }
      } catch {
        // best effort
      }
    }

    return diff;
  }

  async function resolvePhrasebookAddedCount(
    baseline: Set<string>,
    candidates: Set<string>,
  ) {
    if (candidates.size === 0) return 0;

    let confirmed = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await refreshPhrasebookCache();
      confirmed = 0;
      for (const text of candidates) {
        if (!baseline.has(text) && phrasebookTextCache.has(text)) {
          confirmed += 1;
        }
      }
      if (confirmed >= candidates.size) return confirmed;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    return confirmed;
  }

  async function trackLexiconRenderForPhrase(phrase: LessonPayload['pedagogy']['core_flow'][number]) {
    if (!payload || !payload.pedagogy.autoTrackLexicon) return;

    const reqs = phrase.tokens.map(async (tokenRow, tokenIdx) => {
      const token = normalizeToken(tokenRow.token || '');
      if (!token) return;

      const eventId = `render:${payload.lesson.contentVersion}:${renderSessionId}:${phrase.phraseId}:${tokenIdx}:${token}`;
      if (lexiconRenderSent.has(eventId)) return;
      lexiconRenderSent.add(eventId);

      try {
        await fetch(
          `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/lexicon-exposure`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: [token],
              source: 'render',
              eventId,
              contentVersion: payload.lesson.contentVersion,
            }),
          },
        );
      } catch {
        // best effort
      }
    });

    await Promise.all(reqs);
  }

  async function syncAllCorePhrases() {
    if (!payload) return;
    const totalDiff: SyncDiff = { phrasebookAdded: 0, flashcardsAdded: 0 };
    const phrasebookBaseline = new Set(phrasebookTextCache);
    const phrasebookCandidates = new Set<string>();

    await bootstrapTracking().catch(() => undefined);

    for (const phrase of payload.pedagogy.core_flow) {
      const phraseText = normalizeText(phrase.text);
      if (
        payload.pedagogy.autoTrackPhrasebook &&
        phraseText &&
        !phrasebookBaseline.has(phraseText)
      ) {
        phrasebookCandidates.add(phraseText);
      }
      const diff = await syncPhraseToPhrasebookAndFlashcards(phrase);
      totalDiff.flashcardsAdded += diff.flashcardsAdded;
      await trackLexiconRenderForPhrase(phrase);
    }

    if (payload.pedagogy.autoTrackPhrasebook) {
      totalDiff.phrasebookAdded = await resolvePhrasebookAddedCount(
        phrasebookBaseline,
        phrasebookCandidates,
      );
    }

    showSyncToast(totalDiff);
  }

  function bindObserver() {
    observer?.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible || !payload) return;

        const blockId = visible.target.getAttribute('data-block-id');
        if (blockId && blockId !== currentBlockId) {
          currentBlockId = blockId;
          queueProgressPersist();
        }

      },
      {
        rootMargin: '-25% 0px -50% 0px',
        threshold: [0.2, 0.5, 0.8],
      },
    );

    for (const phrase of payload?.pedagogy?.core_flow ?? []) {
      const node = document.getElementById(phraseDomId(phrase.phraseId));
      if (node) observer.observe(node);
    }
  }

  $: progressPercent = payload
    ? courseProgressReady
      ? courseProgressPercent
      : payload.progress.status === 'completed'
        ? 100
        : 0
    : 0;
  $: microNoteBlocks = buildDetailedNoteBlocks(payload?.pedagogy?.micro_notes ?? []);
  $: deepNoteBlocks = buildDetailedNoteBlocks(payload?.pedagogy?.deep_notes ?? []);
  $: swapQuizKeys = Array.from(
    new Set([
      ...microNoteBlocks
        .filter((block): block is Extract<DetailedNoteBlock, { kind: 'swap' }> => block.kind === 'swap')
        .map((block) => `micro:${block.id}`),
      ...deepNoteBlocks
        .filter((block): block is Extract<DetailedNoteBlock, { kind: 'swap' }> => block.kind === 'swap')
        .map((block) => `deep:${block.id}`),
    ]),
  );
  $: {
    const entries: Array<[string, SwapOption[]]> = [];
    for (const block of microNoteBlocks) {
      if (block.kind === 'swap') entries.push([`micro:${block.id}`, block.options]);
    }
    for (const block of deepNoteBlocks) {
      if (block.kind === 'swap') entries.push([`deep:${block.id}`, block.options]);
    }
    swapOptionsByKey = Object.fromEntries(entries);
  }
  $: pendingSwapOptionCount = swapQuizKeys.reduce((count, key) => {
    const options = swapOptionsByKey[key] || [];
    const required = new Set(options.map((option) => swapOptionKey(option.irish)).filter(Boolean));
    if (required.size === 0) return count;
    const solved = new Set((swapQuizState[key]?.solvedOptionKeys || []).filter((item) => required.has(item)));
    return count + Math.max(0, required.size - solved.size);
  }, 0);
  $: lessonAdvanceBlockedBySwaps = pendingSwapOptionCount > 0;
  $: animatedProgress.set(Math.max(0, Math.min(100, progressPercent)), {
    duration: loading ? 0 : 700,
    easing: cubicOut,
  });
  $: displayedProgressPercent = Math.max(0, Math.min(100, Math.round($animatedProgress)));

  async function persistProgress(completed = false, timeSpentDeltaSec = completed ? 0 : 15) {
    if (!payload) return;
    const wasCompleted = payload.progress.status === 'completed';

    const body = {
      lastBlockId: currentBlockId || payload.progress.lastBlockId || null,
      progressPercent: completed
        ? 100
        : Math.max(0, Math.min(100, Math.round(payload.progress.progressPercent || 0))),
      completed,
      timeSpentDeltaSec,
      contentVersion: payload.lesson.contentVersion,
      swapQuizState: sanitizeSwapQuizStateRecord(swapQuizState),
    };

    const res = await fetch(
      `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const next = await res.json();
    const nextSwapQuizState = sanitizeSwapQuizStateRecord(next?.progress?.swapQuizState);
    payload.progress = {
      ...next.progress,
      swapQuizState: nextSwapQuizState,
    };
    swapQuizState = nextSwapQuizState;

    if (completed && !wasCompleted && studySession && studySession.status === 'active') {
      studySession.progress.lessonsCompleted = Math.min(
        studySession.targets.lessons,
        studySession.progress.lessonsCompleted + 1,
      );
      saveStudySession(studySession);
      studyLessonsProgress = studySession.progress.lessonsCompleted;
    }
  }

  function deriveActiveBlockId() {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-block-id]'));
    if (!nodes.length) return currentBlockId;

    const viewportMid = window.innerHeight / 2;
    let best: { id: string; score: number } | null = null;

    for (const node of nodes) {
      const id = node.getAttribute('data-block-id');
      if (!id) continue;
      const rect = node.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;

      const nodeMid = rect.top + rect.height / 2;
      const score = Math.abs(nodeMid - viewportMid);
      if (!best || score < best.score) {
        best = { id, score };
      }
    }

    if (best?.id) return best.id;
    return currentBlockId || payload?.pedagogy?.core_flow?.[0]?.blockId || null;
  }

  async function persistProgressForNavigation(completed = false) {
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer);
      persistDebounceTimer = null;
    }

    const activeBlockId = deriveActiveBlockId();
    if (activeBlockId) {
      currentBlockId = activeBlockId;
    }

    try {
      await persistProgress(completed);
      return true;
    } catch (err) {
      console.error('Failed to save progress before navigation', err);
      error = 'Could not save progress. Please try again.';
      return false;
    }
  }

  async function navigateWithProgress(href: string, completed = false) {
    if (!href) return;
    const saved = await persistProgressForNavigation(completed);
    if (!saved) return;
    await goto(href);
  }

  async function navigateToLesson(event: MouseEvent, href: string, completed = false) {
    event.preventDefault();
    await navigateWithProgress(href, completed);
  }

  async function handleNextLessonClick(event: MouseEvent, href: string) {
    event.preventDefault();
    if (lessonAdvanceBlockedBySwaps) {
      notifySwapAttemptsRequired();
      return;
    }
    if (wouldCompleteLessonTargetOnNext()) {
      pendingLessonAdvanceHref = href;
      showStudyTargetReachedModal = true;
      return;
    }
    await navigateWithProgress(href, true);
  }

  function queueProgressPersist(delayMs = 350) {
    if (!payload) return;
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(() => {
      persistDebounceTimer = null;
      persistProgress(false).catch((error) => {
        console.error('Failed to save progress from block update', error);
      });
    }, delayMs);
  }

  function setPopoverPosition(tokenNode: HTMLElement) {
    const rect = tokenNode.getBoundingClientRect();
    popoverX = rect.left + rect.width / 2;
    popoverY = rect.top - 10;
  }

  async function loadTokenGloss(tokenNode: HTMLElement, blockId?: string) {
    if (!payload) return;

    const token = tokenNode.getAttribute('data-gloss-token') || '';
    if (!token) return;
    const cacheKey = `${payload.lesson.contentVersion}:${blockId || ''}:${token}`;

    popoverToken = token;
    popoverOpen = true;
    setPopoverPosition(tokenNode);
    popoverTranslation = '';

    const cached = glossCache.get(cacheKey);
    if (cached) {
      popoverTranslation = cached.translation || 'No gloss yet for this token.';
      return;
    }

    glossLoading = true;
    const requestId = ++popoverRequestId;

    try {
      const res = await fetch(
        `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/gloss`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            context: tokenNode.getAttribute('data-gloss-context') || undefined,
            blockId,
          }),
        },
      );

      if (!res.ok) throw new Error(await res.text());
      const nextGloss = (await res.json()) as GlossPayload;
      glossCache.set(cacheKey, nextGloss);
      if (requestId === popoverRequestId) {
        popoverTranslation = nextGloss.translation || 'No gloss yet for this token.';
      }
    } catch (err) {
      if (requestId === popoverRequestId) {
        popoverTranslation = 'No gloss yet for this token.';
      }
    } finally {
      if (requestId === popoverRequestId) {
        glossLoading = false;
      }
    }
  }

  function closePopover(force = false) {
    if (!force && popoverPinned) return;
    popoverOpen = false;
    popoverPinned = false;
  }

  function handleTokenHover(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target || !payload) return;
    const tokenNode = target.closest('[data-gloss-token]') as HTMLElement | null;
    if (!tokenNode) return;
    const blockId = target.closest('[data-block-id]')?.getAttribute('data-block-id') || undefined;
    popoverPinned = false;
    loadTokenGloss(tokenNode, blockId).catch(() => undefined);
  }

  function handleTokenMove(event: MouseEvent) {
    if (!popoverOpen || popoverPinned) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const tokenNode = target.closest('[data-gloss-token]') as HTMLElement | null;
    if (!tokenNode) return;
    setPopoverPosition(tokenNode);
  }

  function handleTokenLeave(event: MouseEvent) {
    if (popoverPinned) return;
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest('[data-gloss-token]')) return;
    closePopover();
  }

  function handleTokenClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const tokenNode = target.closest('[data-gloss-token]') as HTMLElement | null;
    if (!tokenNode) {
      closePopover(true);
      return;
    }
    const blockId = target.closest('[data-block-id]')?.getAttribute('data-block-id') || undefined;
    popoverPinned = true;
    loadTokenGloss(tokenNode, blockId).catch(() => undefined);
  }

  function startProgressSync() {
    stopProgressSync();

    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        persistProgress(false).catch(() => undefined);
      }
    };

    unloadHandler = () => {
      persistProgress(false).catch(() => undefined);
    };

    keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && popoverOpen) closePopover(true);
    };
    swapCheckHandler = (event: MouseEvent) => {
      onDocumentSwapCheck(event);
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('beforeunload', unloadHandler);
    window.addEventListener('keydown', keydownHandler);
    document.addEventListener('click', swapCheckHandler, true);
  }

  function stopProgressSync() {
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (unloadHandler) {
      window.removeEventListener('beforeunload', unloadHandler);
      unloadHandler = null;
    }
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    if (swapCheckHandler) {
      document.removeEventListener('click', swapCheckHandler, true);
      swapCheckHandler = null;
    }
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer);
      persistDebounceTimer = null;
    }
  }

  $: {
    const nextKey = data?.courseSlug && data?.lessonSlug ? `${data.courseSlug}:${data.lessonSlug}` : '';
    if (nextKey && nextKey !== activeRouteKey) {
      activeRouteKey = nextKey;
      loadLesson();
    }
  }

  onDestroy(() => {
    observer?.disconnect();
    persistProgress(false, 0).catch(() => undefined);
    stopProgressSync();
    for (const timer of toastTimers.values()) {
      clearTimeout(timer);
    }
    toastTimers.clear();
  });
</script>

<section class="lesson-shell relative overflow-hidden py-10">
  <div class="lesson-glow-a pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl"></div>
  <div class="lesson-glow-b pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full blur-3xl"></div>

  <div class="relative z-10 mx-auto max-w-4xl space-y-6">
    {#if loading}
      <div class="lesson-card rounded-xl p-6">Loading lesson...</div>
    {:else if error}
      <div class="rounded-xl border border-rose-400/40 bg-rose-100/40 p-6 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>
    {:else if payload}
      {#key activeRouteKey}
        <section
          class="lesson-card rounded-3xl p-6 space-y-6"
          in:fly={{ y: 14, duration: 300, easing: cubicOut }}
        >
        <header class="pb-1">
          <a
            href={withStudySession('/dashboard/courses?view=all')}
            class="lesson-backlink mt-2 inline-flex text-sm font-medium"
            onclick={(event) => navigateToLesson(event, withStudySession('/dashboard/courses?view=all'), !nextLessonHref)}
          >
            Back to modules
          </a>

          <div class="mt-2 h-2.5 w-full overflow-hidden rounded-full lesson-track">
            <div class="progress-fill h-2.5 rounded-full" style={`width: ${$animatedProgress}%`}></div>
          </div>
          <p class="lesson-subtle mt-2 text-sm font-medium">{displayedProgressPercent}% unit complete</p>


          <h1 class="lesson-heading mt-2 text-3xl font-extrabold tracking-tight">{payload.lesson.lessonTitle}</h1>
          <p class="lesson-subtle mt-1">{payload.lesson.courseTitle}</p>

          {#if studySession && studyLessonsTarget > 0}
            <div class="lesson-study-banner mt-4 rounded-xl px-4 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-emerald-700">
                  Study session in progress
                </p>
                <a href={studyCoordinatorLink} class="lesson-study-link text-sm font-semibold">View session</a>
              </div>
              <p class="text-sm text-emerald-700/90 mt-1">
                Lessons: {Math.min(studyLessonsProgress, studyLessonsTarget)} / {studyLessonsTarget}
              </p>
            </div>
          {/if}
        </header>

        {#if payload.pedagogy.core_flow.length > 0}
          <article
            class="lesson-frame-section"
            onmouseover={handleTokenHover}
            onmousemove={handleTokenMove}
            onmouseout={handleTokenLeave}
            onclick={handleTokenClick}
          >
            <div class="space-y-4">
              {#each payload.pedagogy.core_flow as phrase, idx (phrase.phraseId)}
                <section
                  id={phraseDomId(phrase.phraseId)}
                  data-phrase-id={phrase.phraseId}
                  data-block-id={phrase.blockId}
                  class={`phrase-card rounded-2xl border p-4 ${speakerBubbleClass(phrase.speaker)}`}
                >
                  <div class="flex items-start justify-between gap-3">
                    <p class="lesson-subtle text-xs font-semibold uppercase tracking-wide">{phrase.speaker} • Step {idx + 1}</p>
                  </div>

                  <p class="lesson-heading mt-2 text-lg font-semibold">{@html renderPhraseTokens(phrase.text)}</p>

                  {#if phrase.pronunciation}
                    <p class="lesson-subtle mt-1 text-sm italic">{phrase.pronunciation}</p>
                  {/if}

                  {#if phrase.translation}
                    <p class="lesson-copy mt-2 text-sm">{phrase.translation}</p>
                  {/if}
                </section>
              {/each}
            </div>
          </article>
        {/if}

        {#if payload.pedagogy.micro_notes.length > 0 || payload.pedagogy.deep_notes.length > 0}
          <section class="lesson-frame-section px-2">
            <div class="space-y-3 detailed-copy">
              {#each microNoteBlocks as block (block.id)}
                {#if block.kind === 'section'}
                  <div class={`note-section-heading ${block.level >= 3 ? 'note-section-sub' : ''}`}>
                    {block.text}
                  </div>
                {:else if block.kind === 'vocab'}
                  <article class="vocab-row rounded-xl border p-3">
                    <p class="vocab-irish text-sm font-semibold">{@html renderInlineIrish(block.row.phrase)}</p>
                    {#if block.row.pronunciation}
                      <p class="vocab-pron mt-1 text-xs">{block.row.pronunciation}</p>
                    {/if}
                    {#if block.row.translation}
                      <p class="vocab-trans mt-1 text-xs">{block.row.translation}</p>
                    {/if}
                  </article>
                {:else if block.kind === 'paragraph'}
                  <p class="lesson-copy text-sm">{@html renderInlineIrish(block.text)}</p>
                {:else}
                  {@const quizKey = `micro:${block.id}`}
                  {@const quiz = swapQuizState[quizKey] || { answer: '', status: 'idle', attempts: 0, solvedOptionKeys: [] }}
                  <section class="swap-block rounded-xl border p-4">
                    <p class="swap-title text-sm font-semibold">
                      Instead of <span class="irish-inline">{block.target}</span>, try:
                    </p>

                    <div class="swap-quiz mt-3 rounded-lg border p-3">
                      <p class="swap-quiz-label text-xs font-semibold uppercase tracking-wide">Interactive swap</p>
                      <p class="swap-quiz-prompt mt-2 text-sm">
                        Fill the blank with one valid swap for <span class="irish-inline">{block.target}</span>.
                      </p>
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          class={`swap-input w-full rounded-lg border px-3 py-2 text-sm sm:w-72 ${swapInputStateClass(quiz.status)}`}
                          placeholder="Type swap in Irish"
                          value={quiz.answer}
                          oninput={(event) => onSwapInput(event, quizKey)}
                          onkeydown={(event) => onSwapKeydown(event, quizKey, block.options)}
                          oncopy={blockClipboardEvent}
                          oncut={blockClipboardEvent}
                          onpaste={blockClipboardEvent}
                          ondrop={blockDropEvent}
                          ondragover={blockDropEvent}
                          autocomplete="off"
                          autocorrect="off"
                          autocapitalize="off"
                          spellcheck="false"
                        />
                        <button
                          type="button"
                          data-swap-check-key={quizKey}
                          class="relative z-20 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                          Check
                        </button>
                      </div>
                    </div>

                    <div class="swap-grid mt-3 grid gap-2 sm:grid-cols-2">
                      {#each block.options as option, idx (`${block.id}-${idx}`)}
                        {@const solved = isSwapOptionSolved(quiz, option)}
                        <article class={`swap-option rounded-lg border p-3 ${solved ? 'swap-option-solved' : ''}`}>
                          <p class={`swap-irish text-sm font-semibold ${solved ? 'swap-irish-solved' : ''}`}>
                            {@html renderInlineIrish(option.irish)}
                          </p>
                          {#if option.pronunciation}
                            <p class={`swap-pron mt-1 text-xs ${solved ? 'swap-pron-solved' : ''}`}>{option.pronunciation}</p>
                          {/if}
                          {#if option.translation}
                            <p class={`swap-trans mt-1 text-xs ${solved ? 'swap-trans-solved' : ''}`}>{option.translation}</p>
                          {/if}
                        </article>
                      {/each}
                    </div>
                  </section>
                {/if}
              {/each}
              {#each deepNoteBlocks as block (block.id)}
                {#if block.kind === 'section'}
                  <div class={`note-section-heading ${block.level >= 3 ? 'note-section-sub' : ''}`}>
                    {block.text}
                  </div>
                {:else if block.kind === 'vocab'}
                  <article class="vocab-row rounded-xl border p-3">
                    <p class="vocab-irish text-sm font-semibold">{@html renderInlineIrish(block.row.phrase)}</p>
                    {#if block.row.pronunciation}
                      <p class="vocab-pron mt-1 text-xs">{block.row.pronunciation}</p>
                    {/if}
                    {#if block.row.translation}
                      <p class="vocab-trans mt-1 text-xs">{block.row.translation}</p>
                    {/if}
                  </article>
                {:else if block.kind === 'paragraph'}
                  <p class="lesson-copy text-sm">{@html renderInlineIrish(block.text)}</p>
                {:else}
                  {@const quizKey = `deep:${block.id}`}
                  {@const quiz = swapQuizState[quizKey] || { answer: '', status: 'idle', attempts: 0, solvedOptionKeys: [] }}
                  <section class="swap-block rounded-xl border p-4">
                    <p class="swap-title text-sm font-semibold">
                      Instead of <span class="irish-inline">{block.target}</span>, try:
                    </p>

                    <div class="swap-quiz mt-3 rounded-lg border p-3">
                      <p class="swap-quiz-label text-xs font-semibold uppercase tracking-wide">Interactive swap</p>
                      <p class="swap-quiz-prompt mt-2 text-sm">
                        Fill the blank with one valid swap for <span class="irish-inline">{block.target}</span>.
                      </p>
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          class={`swap-input w-full rounded-lg border px-3 py-2 text-sm sm:w-72 ${swapInputStateClass(quiz.status)}`}
                          placeholder="Type swap in Irish"
                          value={quiz.answer}
                          oninput={(event) => onSwapInput(event, quizKey)}
                          onkeydown={(event) => onSwapKeydown(event, quizKey, block.options)}
                          oncopy={blockClipboardEvent}
                          oncut={blockClipboardEvent}
                          onpaste={blockClipboardEvent}
                          ondrop={blockDropEvent}
                          ondragover={blockDropEvent}
                          autocomplete="off"
                          autocorrect="off"
                          autocapitalize="off"
                          spellcheck="false"
                        />
                        <button
                          type="button"
                          data-swap-check-key={quizKey}
                          class="relative z-20 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                          Check
                        </button>
                      </div>
                    </div>

                    <div class="swap-grid mt-3 grid gap-2 sm:grid-cols-2">
                      {#each block.options as option, idx (`${block.id}-${idx}`)}
                        {@const solved = isSwapOptionSolved(quiz, option)}
                        <article class={`swap-option rounded-lg border p-3 ${solved ? 'swap-option-solved' : ''}`}>
                          <p class={`swap-irish text-sm font-semibold ${solved ? 'swap-irish-solved' : ''}`}>
                            {@html renderInlineIrish(option.irish)}
                          </p>
                          {#if option.pronunciation}
                            <p class={`swap-pron mt-1 text-xs ${solved ? 'swap-pron-solved' : ''}`}>{option.pronunciation}</p>
                          {/if}
                          {#if option.translation}
                            <p class={`swap-trans mt-1 text-xs ${solved ? 'swap-trans-solved' : ''}`}>{option.translation}</p>
                          {/if}
                        </article>
                      {/each}
                    </div>
                  </section>
                {/if}
              {/each}
            </div>
          </section>
        {/if}

        <section class="lesson-frame-section">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              {#if previousLessonHref}
                <a
                  href={withStudySession(previousLessonHref)}
                  class="lesson-btn-secondary rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                  onclick={(event) => navigateToLesson(event, withStudySession(previousLessonHref))}
                >
                  Previous lesson
                </a>
              {:else}
                <span class="lesson-btn-disabled rounded-xl px-4 py-2 text-sm font-medium">Previous lesson</span>
              {/if}

              {#if nextLessonHref}
                {#if lessonAdvanceBlockedBySwaps}
                  <button
                    type="button"
                    class="lesson-btn-blocked rounded-xl px-4 py-2 text-sm font-semibold transition"
                    onclick={notifySwapAttemptsRequired}
                  >
                    Next lesson
                  </button>
                {:else}
                  <a
                    href={completionFallbackHref(withStudySession(nextLessonHref))}
                    class="lesson-btn-primary rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                    onclick={(event) => handleNextLessonClick(event, withStudySession(nextLessonHref))}
                  >
                    Next lesson
                  </a>
                {/if}
              {:else}
                {#if lessonAdvanceBlockedBySwaps}
                  <button
                    type="button"
                    class="lesson-btn-blocked rounded-xl px-4 py-2 text-sm font-semibold transition"
                    onclick={notifySwapAttemptsRequired}
                  >
                    Finish unit
                  </button>
                {:else}
                  <a
                    href={completionFallbackHref(withStudySession('/dashboard/courses?view=all'))}
                    class="lesson-btn-primary rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                    onclick={(event) => navigateToLesson(event, withStudySession('/dashboard/courses?view=all'), true)}
                  >
                    Finish unit
                  </a>
                {/if}
              {/if}

              {#if showFinishSessionButton && lessonTargetReachedInActiveStudy() && studyCoordinatorLink}
                <a
                  href={studyCoordinatorLink}
                  class="lesson-btn-secondary rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
                  onclick={(event) => navigateToLesson(event, studyCoordinatorLink)}
                >
                  Finish Session
                </a>
              {/if}
            </div>

            <p class="lesson-subtle text-sm">
              {#if lessonAdvanceBlockedBySwaps}
                Complete every swap option to unlock the next step.
              {:else}
                Progress auto-saves.
              {/if}
            </p>
          </div>
        </section>
        </section>
      {/key}
    {/if}
  </div>
</section>

<AppModal
  open={showStudyTargetReachedModal}
  title="Lesson requirement complete"
  description="This next lesson completes your guided lesson requirement."
  closeOnBackdrop={false}
  closeOnEscape={false}
>
  <p class="text-sm text-slate-700">
    Choose to continue lessons, or move to the next step in your guided session.
  </p>
  <div slot="actions">
    <button
      type="button"
      class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
      onclick={cancelStudyTargetChoice}
    >
      Cancel
    </button>
    <button
      type="button"
      class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
      onclick={continueBeyondLessonTarget}
    >
      Continue Lessons
    </button>
    <button
      type="button"
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      onclick={continueToNextSessionStep}
    >
      Next Session Step
    </button>
  </div>
</AppModal>

{#if popoverOpen}
  <div
    class="token-popover"
    role="status"
    aria-live="polite"
    style={`left:${popoverX}px; top:${popoverY}px; transform: translate(-50%, -100%);`}
  >
    <p class="token-popover-token">{popoverToken}</p>
    {#if glossLoading}
      <p class="token-popover-text">Loading...</p>
    {:else}
      <p class="token-popover-text">{popoverTranslation || 'No gloss yet for this token.'}</p>
    {/if}
  </div>
{/if}

{#if toasts.length > 0}
  <div class="lesson-toast-stack" role="status" aria-live="polite">
    {#each toasts as toast (toast.id)}
      <div class="lesson-toast">{toast.message}</div>
    {/each}
  </div>
{/if}

<style>
  .lesson-shell {
    color: var(--text-1);
  }

  .lesson-glow-a {
    background: color-mix(in oklab, var(--accent-soft) 65%, transparent);
  }

  .lesson-glow-b {
    background: color-mix(in oklab, var(--accent) 22%, transparent);
  }

  .lesson-card {
    border: 1px solid var(--border);
    background: var(--surface-1);
    box-shadow: 0 10px 26px color-mix(in oklab, var(--border) 35%, transparent);
  }

  .phrase-card {
    border-color: color-mix(in oklab, var(--border) 78%, transparent);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--border) 24%, transparent);
  }

  .lesson-frame-section {
    border-top: 1px solid color-mix(in oklab, var(--border) 80%, transparent);
    padding-top: 1rem;
  }

  .note-section-heading {
    margin-top: 0.35rem;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: color-mix(in oklab, var(--accent-strong) 60%, var(--text-2));
  }

  .note-section-sub {
    color: color-mix(in oklab, var(--accent) 62%, var(--text-2));
  }

  .vocab-row {
    border-color: color-mix(in oklab, var(--border) 72%, transparent);
    background: color-mix(in oklab, var(--surface-1) 90%, white 10%);
    box-shadow: 0 4px 14px color-mix(in oklab, var(--border) 16%, transparent);
  }

  .vocab-irish {
    color: var(--text-1);
  }

  .vocab-pron {
    color: color-mix(in oklab, var(--text-2) 74%, transparent);
    font-style: italic;
  }

  .vocab-trans {
    color: color-mix(in oklab, var(--text-2) 84%, transparent);
  }

  .swap-block {
    border-color: color-mix(in oklab, var(--border) 72%, transparent);
    background: color-mix(in oklab, var(--surface-1) 90%, white 10%);
  }

  .swap-title {
    color: color-mix(in oklab, var(--text-1) 90%, var(--accent) 10%);
  }

  .swap-option {
    border-color: color-mix(in oklab, var(--border) 75%, transparent);
    background: color-mix(in oklab, var(--surface-1) 95%, white 5%);
  }

  .swap-quiz {
    border-color: color-mix(in oklab, var(--border) 72%, transparent);
    background: color-mix(in oklab, var(--surface-1) 90%, white 10%);
  }

  .swap-quiz-label {
    color: color-mix(in oklab, var(--text-2) 78%, transparent);
  }

  .swap-quiz-prompt {
    color: color-mix(in oklab, var(--text-1) 85%, transparent);
  }

  .swap-input {
    border-color: color-mix(in oklab, var(--border) 72%, transparent);
    background: var(--surface-1);
    color: var(--text-1);
  }

  .swap-input::placeholder {
    color: color-mix(in oklab, var(--text-2) 68%, transparent);
  }

  .swap-input-error {
    border-color: rgb(220 38 38 / 0.9);
    box-shadow: 0 0 0 1px rgb(220 38 38 / 0.25);
  }

  .swap-input-success {
    border-color: rgb(22 163 74 / 0.9);
    box-shadow: 0 0 0 1px rgb(22 163 74 / 0.25);
  }

  .swap-irish {
    color: var(--text-1);
  }

  .swap-pron {
    color: color-mix(in oklab, var(--text-2) 75%, transparent);
    font-style: italic;
  }

  .swap-trans {
    color: color-mix(in oklab, var(--text-2) 82%, transparent);
  }

  .swap-option-solved {
    border-color: rgb(22 163 74 / 0.75);
    background: rgb(236 253 245 / 0.95);
  }

  .swap-option,
  .swap-option * {
    user-select: none;
    -webkit-user-select: none;
  }

  .swap-irish-solved {
    color: rgb(21 128 61 / 0.98);
    text-decoration: line-through;
    text-decoration-color: rgb(21 128 61 / 0.95);
    text-decoration-thickness: 2px;
  }

  .swap-pron-solved,
  .swap-trans-solved {
    color: rgb(22 101 52 / 0.9);
    text-decoration: line-through;
    text-decoration-color: rgb(22 101 52 / 0.88);
    text-decoration-thickness: 1.5px;
  }

  .lesson-bubble {
    border-color: color-mix(in oklab, var(--border) 76%, transparent);
  }

  .lesson-bubble-barista {
    background: color-mix(in oklab, var(--surface-2) 70%, var(--surface-1));
  }

  .lesson-bubble-customer {
    background: color-mix(in oklab, var(--surface-3) 82%, var(--surface-1));
  }

  .lesson-heading {
    color: var(--text-1);
  }

  .lesson-copy {
    color: var(--text-2);
  }

  .lesson-subtle {
    color: var(--text-muted);
  }

  .lesson-backlink {
    color: var(--text-muted);
  }

  .lesson-backlink:hover {
    color: var(--text-2);
  }

  .lesson-track {
    background: color-mix(in oklab, var(--border) 70%, transparent);
  }

  .lesson-study-banner {
    border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--border));
    background: color-mix(in oklab, var(--accent-soft) 45%, var(--surface-1));
  }

  .lesson-study-link {
    color: color-mix(in oklab, var(--accent-strong) 85%, #065f46);
  }

  .progress-fill {
    background: linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 75%, #38bdf8));
    background-size: 180% 100%;
    animation: shimmer 3.8s linear infinite;
  }

  .detailed-copy {
    border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in oklab, var(--surface-2) 78%, transparent),
      color-mix(in oklab, var(--accent-soft) 16%, transparent)
    );
    border-radius: 1rem;
    padding: 0.95rem 1rem;
  }

  .lesson-btn-secondary {
    border: 1px solid var(--border);
    background: var(--surface-3);
    color: var(--text-1);
  }

  .lesson-btn-primary {
    border: 1px solid color-mix(in oklab, var(--accent-strong) 65%, var(--border));
    background: var(--accent);
    color: #fff;
  }

  .lesson-btn-primary:hover {
    background: var(--accent-strong);
  }

  .lesson-btn-disabled {
    border: 1px solid var(--border);
    color: var(--text-muted);
  }

  .lesson-btn-blocked {
    border: 1px solid color-mix(in oklab, var(--border) 85%, transparent);
    background: color-mix(in oklab, var(--surface-2) 78%, var(--surface-1));
    color: color-mix(in oklab, var(--text-muted) 88%, transparent);
    cursor: not-allowed;
  }

  :global(.dialogue-token) {
    display: inline;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    margin: 0;
    border-bottom: 1px dashed color-mix(in oklab, var(--accent) 52%, transparent);
    cursor: pointer;
  }

  :global(.dialogue-token:hover) {
    color: var(--accent-strong);
  }

  :global(.irish-inline) {
    display: inline-block;
    border-radius: 0.45rem;
    border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--border));
    background: color-mix(in oklab, var(--accent-soft) 40%, var(--surface-1));
    color: var(--text-1);
    font-weight: 600;
    padding: 0.05rem 0.4rem;
    margin: 0 0.05rem;
    line-height: 1.35;
  }

  .token-popover {
    position: fixed;
    z-index: 80;
    max-width: min(24rem, calc(100vw - 1.5rem));
    border: 1px solid var(--border);
    background: var(--surface-1);
    border-radius: 0.7rem;
    box-shadow: 0 10px 24px color-mix(in oklab, var(--border) 35%, #000 30%);
    padding: 0.45rem 0.65rem;
    pointer-events: none;
  }

  .token-popover-token {
    color: var(--text-muted);
    font-size: 0.69rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .token-popover-text {
    color: var(--text-1);
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.2rem;
  }

  .lesson-toast-stack {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 70;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: min(28rem, calc(100vw - 2rem));
  }

  .lesson-toast {
    border: 1px solid color-mix(in oklab, var(--accent-strong) 28%, var(--border));
    background: color-mix(in oklab, var(--surface-1) 90%, var(--accent-soft) 10%);
    color: var(--text-1);
    box-shadow: 0 12px 24px color-mix(in oklab, #000 12%, transparent);
    border-radius: 0.75rem;
    padding: 0.6rem 0.75rem;
    font-size: 0.84rem;
    font-weight: 600;
    line-height: 1.3;
    animation: toast-in 220ms ease-out both;
  }

  @keyframes shimmer {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 180% 0%;
    }
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
