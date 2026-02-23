<script lang="ts">
  import { goto } from '$app/navigation';

  type ExerciseType = 'typed_translation' | 'sentence_builder' | 'cloze';
  const SESSION_SIZE = 15;

  type Exercise = {
    exerciseId: string;
    phraseId: number;
    exerciseType: ExerciseType;
    prompt: string;
    tokens?: string[];
    maskedIndex?: number;
    dueAt: string;
    expectedAnswer: string;
    source: 'main' | 'retry';
  };

  let loading = false;
  let submitting = false;
  let sessionMode: 'idle' | 'lesson' | 'fix_mistakes' | 'complete' = 'idle';

  let queue: Exercise[] = [];
  let index = 0;
  let completedCount = 0;
  let totalPlanned = 0;
  let masteredKeys = new Set<string>();

  let freeTextAnswer = '';
  let sentenceChoices: Array<{ id: string; value: string; selectedAt: number | null }> = [];
  let sentenceSelectionCounter = 0;
  let showAnswer = false;

  let feedback: {
    isCorrect: boolean;
    expectedAnswer: string;
    userAnswer: string;
    userAnswerHtml: string;
    expectedAnswerHtml: string;
  } | null = null;
  let feedbackMessage = '';

  const successMessages = [
    'Great job. That was spot on.',
    'Nice work. You nailed that one.',
    'Excellent answer. Keep the momentum going.',
    'Well done. Your Irish is improving.',
    'Strong work. You got it exactly right.',
  ];

  const retryMessages = [
    'Good effort. Let’s tighten that one up.',
    'Nice try. You are close.',
    'No problem. This one will stick after another pass.',
    'Keep going. You are building real progress.',
    'You are doing well. Let’s review this phrase once more.',
  ];

  function pickRandom(items: string[]): string {
    return items[Math.floor(Math.random() * items.length)];
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeToken(token: string): string {
    return token
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^\p{L}\p{N}\s'-]/gu, '')
      .trim();
  }

  function looksIrish(text: string): boolean {
    const value = text.toLowerCase();
    if (/[áéíóú]/i.test(text)) return true;
    return /\b(tá|ní|bhí|agus|conas|cad|go|raibh|maith|an|ar|le|mé|tú|sí|sé|siad)\b/.test(value);
  }

  function looksEnglish(text: string): boolean {
    const value = text.toLowerCase();
    return /\b(the|is|are|what|how|where|why|hello|good|morning|i|you|we|they|can|do|does|review|book|word)\b/.test(
      value,
    );
  }

  function typedInstruction(exercise: Exercise): string {
    return looksIrish(exercise.prompt)
      ? 'Type the English translation'
      : 'Type the Irish translation';
  }

  function buildDiffHtml(expected: string, actual: string) {
    const expectedParts = expected.split(/\s+/).filter(Boolean);
    const actualParts = actual.split(/\s+/).filter(Boolean);
    const length = Math.max(expectedParts.length, actualParts.length);

    const expectedHtmlParts: string[] = [];
    const actualHtmlParts: string[] = [];

    for (let i = 0; i < length; i += 1) {
      const expectedPart = expectedParts[i] ?? '';
      const actualPart = actualParts[i] ?? '';
      const matches = normalizeToken(expectedPart) === normalizeToken(actualPart);

      if (expectedPart) {
        expectedHtmlParts.push(
          matches ? escapeHtml(expectedPart) : `<strong>${escapeHtml(expectedPart)}</strong>`,
        );
      }

      if (actualPart) {
        actualHtmlParts.push(
          matches ? escapeHtml(actualPart) : `<strong>${escapeHtml(actualPart)}</strong>`,
        );
      }
    }

    return {
      expectedHtml: expectedHtmlParts.join(' '),
      actualHtml: actualHtmlParts.join(' '),
    };
  }

  function usableTokens(exercise: Exercise | null | undefined): string[] {
    if (!exercise || exercise.exerciseType !== 'sentence_builder') return [];
    return (exercise.tokens || []).map((token) => token.trim()).filter(Boolean);
  }

  function isInvalidSentenceBuilder(exercise: Exercise | null | undefined): boolean {
    return !!exercise && exercise.exerciseType === 'sentence_builder' && usableTokens(exercise).length === 0;
  }

  function hasVisibleClozeContext(exercise: Exercise | null | undefined): boolean {
    if (!exercise || exercise.exerciseType !== 'cloze') return true;
    const prompt = (exercise.prompt || '').trim();
    const visibleTokens = prompt
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token && token !== '____')
      .filter((token) => /[\p{L}\p{N}]/u.test(token));

    if (visibleTokens.length === 0) return false;
    return !looksEnglish(visibleTokens.join(' '));
  }

  function isInvalidExercise(exercise: Exercise | null | undefined): boolean {
    if (!exercise) return true;
    if (isInvalidSentenceBuilder(exercise)) return true;
    if (!hasVisibleClozeContext(exercise)) return true;
    return false;
  }

  function exerciseMasteryKey(exercise: Exercise): string {
    return `${exercise.exerciseType}:${exercise.phraseId}`;
  }

  $: current = queue[index] || null;
  $: selectedSentenceTokens = sentenceChoices
    .filter((token) => token.selectedAt != null)
    .sort((a, b) => Number(a.selectedAt) - Number(b.selectedAt))
    .map((token) => token.value);
  $: progress = totalPlanned > 0 ? Math.min(100, Math.round((completedCount / totalPlanned) * 100)) : 0;

  async function readError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  function resetAnswerState() {
    freeTextAnswer = '';
    showAnswer = false;
    feedback = null;
    feedbackMessage = '';
    sentenceChoices = [];
    sentenceSelectionCounter = 0;

    const active = queue[index];
    if (active?.exerciseType === 'sentence_builder') {
      sentenceChoices = usableTokens(active).map((token, tokenIndex) => ({
        id: `${tokenIndex}-${token}`,
        value: token,
        selectedAt: null,
      }));
    }
  }

  function skipInvalidExercises() {
    while (index < queue.length && isInvalidExercise(queue[index])) {
      index += 1;
    }

    if (index >= queue.length) {
      sessionMode = 'complete';
      return;
    }

    resetAnswerState();
  }

  function beginSession(items: any[], mode: 'lesson' | 'fix_mistakes') {
    queue = (items || [])
      .map((item) => ({ ...item, source: 'main' as const }))
      .filter((item) => !isInvalidExercise(item))
      .slice(0, SESSION_SIZE);

    index = 0;
    completedCount = 0;
    totalPlanned = queue.length;
    masteredKeys = new Set<string>();
    sessionMode = queue.length > 0 ? mode : 'idle';

    skipInvalidExercises();

    if (queue.length === 0) {
      alert(
        mode === 'lesson'
          ? 'No practice items are available right now.'
          : 'No recent mistakes found. Great work.',
      );
    }
  }

  async function startLesson() {
    loading = true;
    try {
      const res = await fetch(`/api/proxy/practice/due?limit=${SESSION_SIZE}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load practice session'));
      const payload = await res.json();
      beginSession(payload?.items || [], 'lesson');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to start practice session');
    } finally {
      loading = false;
    }
  }

  async function startFixMistakes() {
    loading = true;
    try {
      const res = await fetch(`/api/proxy/practice/mistakes?limit=${SESSION_SIZE}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(await readError(res, 'Failed to load mistakes session'));
      const payload = await res.json();
      beginSession(payload?.items || [], 'fix_mistakes');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to start mistakes session');
    } finally {
      loading = false;
    }
  }

  function startFlashcardReview() {
    goto('/dashboard/flashcards/study');
  }

  function toggleSentenceToken(tokenIndex: number) {
    const token = sentenceChoices[tokenIndex];
    if (!token) return;

    sentenceChoices = sentenceChoices.map((item, idx) =>
      idx === tokenIndex
        ? {
            ...item,
            selectedAt: item.selectedAt == null ? sentenceSelectionCounter : null,
          }
        : item,
    );

    if (token.selectedAt == null) {
      sentenceSelectionCounter += 1;
    }
  }

  function clearSentenceSelection() {
    sentenceChoices = sentenceChoices.map((item) => ({ ...item, selectedAt: null }));
    sentenceSelectionCounter = 0;
  }

  function nextQuestion() {
    index += 1;
    if (index >= queue.length) {
      sessionMode = 'complete';
      return;
    }
    skipInvalidExercises();
  }

  async function submitAttempt() {
    if (!current) return;

    const body: Record<string, unknown> = {
      exerciseType: current.exerciseType,
      phraseId: current.phraseId,
    };

    if (current.exerciseType === 'sentence_builder') {
      body.userTokens = selectedSentenceTokens;
    } else {
      body.userAnswer = freeTextAnswer;
    }

    submitting = true;
    try {
      const res = await fetch('/api/proxy/practice/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Failed to submit attempt'));
      }

      const payload = await res.json();
      const isCorrect = !!payload?.isCorrect;
      const submittedAnswer =
        current.exerciseType === 'sentence_builder'
          ? selectedSentenceTokens.join(' ')
          : freeTextAnswer;
      const diff = buildDiffHtml(current.expectedAnswer, submittedAnswer);

      feedback = {
        isCorrect,
        expectedAnswer: current.expectedAnswer,
        userAnswer: submittedAnswer,
        userAnswerHtml: diff.actualHtml,
        expectedAnswerHtml: diff.expectedHtml,
      };
      feedbackMessage = isCorrect ? pickRandom(successMessages) : pickRandom(retryMessages);

      if (isCorrect) {
        const key = exerciseMasteryKey(current);
        if (!masteredKeys.has(key)) {
          masteredKeys.add(key);
          completedCount = masteredKeys.size;
        }
      } else {
        // Retry wrong prompts, but do not change total/progress denominator.
        queue = [...queue, { ...current, source: 'retry' }];
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to submit answer');
    } finally {
      submitting = false;
    }
  }

  function continueAfterFeedback() {
    nextQuestion();
  }

  function restart() {
    sessionMode = 'idle';
    queue = [];
    index = 0;
    completedCount = 0;
    totalPlanned = 0;
    masteredKeys = new Set<string>();
    feedback = null;
    feedbackMessage = '';
    showAnswer = false;
    freeTextAnswer = '';
    sentenceChoices = [];
  }
</script>

<section class="max-w-5xl mx-auto space-y-6">
  <header class="rounded-2xl bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 text-white p-8 shadow">
    <h1 class="text-3xl font-bold">Practice</h1>
    <p class="mt-2 text-sky-50">Complete a focused run. Mistakes get repeated at the end.</p>
  </header>

  {#if sessionMode === 'idle'}
    <div class="grid md:grid-cols-3 gap-4">
      <button
        onclick={startLesson}
        disabled={loading}
        class="rounded-2xl border bg-white p-6 text-left shadow-sm hover:shadow-md transition disabled:opacity-60"
      >
        <p class="text-sm uppercase tracking-wide text-emerald-600 font-semibold">Main Session</p>
        <h2 class="mt-1 text-2xl font-bold text-gray-900">Start Practice</h2>
        <p class="mt-2 text-sm text-gray-600">Mixed exercises from your phrasebook.</p>
      </button>

      <button
        onclick={startFixMistakes}
        disabled={loading}
        class="rounded-2xl border bg-white p-6 text-left shadow-sm hover:shadow-md transition disabled:opacity-60"
      >
        <p class="text-sm uppercase tracking-wide text-amber-600 font-semibold">Targeted Review</p>
        <h2 class="mt-1 text-2xl font-bold text-gray-900">Fix Mistakes</h2>
        <p class="mt-2 text-sm text-gray-600">Retry phrases you missed recently.</p>
      </button>

      <button
        onclick={startFlashcardReview}
        class="rounded-2xl border bg-white p-6 text-left shadow-sm hover:shadow-md transition"
      >
        <p class="text-sm uppercase tracking-wide text-sky-600 font-semibold">Spaced Repetition</p>
        <h2 class="mt-1 text-2xl font-bold text-gray-900">Flashcard Review</h2>
        <p class="mt-2 text-sm text-gray-600">Open due flashcards from inside the Practice Hub.</p>
      </button>
    </div>
  {:else if sessionMode === 'complete'}
    <div class="rounded-2xl border bg-white p-8 shadow-sm text-center space-y-3">
      <p class="text-sm uppercase tracking-wide text-emerald-600 font-semibold">Session Complete</p>
      <h2 class="text-3xl font-bold text-gray-900">Well done</h2>
      <p class="text-gray-600">You completed {completedCount} of {totalPlanned} prompts.</p>
      <button onclick={restart} class="mt-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 font-semibold">
        Back to Practice
      </button>
    </div>
  {:else}
    <div class="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm text-gray-600">
          <span>{sessionMode === 'fix_mistakes' ? 'Fix Mistakes' : 'Practice Session'}</span>
          <span>{completedCount} / {totalPlanned}</span>
        </div>
        <div class="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div class="h-full bg-emerald-500 transition-all" style={`width: ${progress}%`}></div>
        </div>
      </div>

      {#if current}
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-wide text-gray-500">
            {current.source === 'retry' ? 'Retry' : 'Practice'}
          </p>
          <h2 class="text-2xl font-semibold text-gray-900">{current.prompt}</h2>
        </div>

        {#if current.exerciseType === 'sentence_builder'}
          <div class="space-y-3">
            <p class="text-sm text-gray-600">Build the Irish sentence in order.</p>

            <div class="rounded-lg border bg-gray-50 p-3 min-h-14 flex flex-wrap gap-2">
              {#if selectedSentenceTokens.length === 0}
                <span class="text-sm text-gray-400">Select tokens below...</span>
              {:else}
                {#each selectedSentenceTokens as token, tokenIndex (`${token}-${tokenIndex}`)}
                  <span class="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-sm font-medium">{token}</span>
                {/each}
              {/if}
            </div>

            <div class="flex flex-wrap gap-2">
              {#each sentenceChoices as token, tokenIndex (token.id)}
                <button
                  onclick={() => toggleSentenceToken(tokenIndex)}
                  class={`px-3 py-1.5 rounded-lg border text-sm ${
                    token.selectedAt != null
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {token.value}
                </button>
              {/each}
            </div>

            <button onclick={clearSentenceSelection} class="text-sm text-gray-500 hover:text-gray-800">Clear</button>
          </div>
        {:else}
          <div class="space-y-2">
            <label for="practice-answer" class="text-sm font-medium text-gray-700">
              {current.exerciseType === 'typed_translation'
                ? typedInstruction(current)
                : 'Fill in the missing Irish word'}
            </label>
            <textarea
              id="practice-answer"
              bind:value={freeTextAnswer}
              class="w-full rounded-lg border px-3 py-2 min-h-24"
              placeholder="Enter your answer"
            ></textarea>
          </div>
        {/if}

        <div class="flex flex-wrap items-center gap-3">
          {#if !feedback}
            <button
              onclick={submitAttempt}
              disabled={submitting}
              class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Checking...' : 'Check'}
            </button>
            <button onclick={() => (showAnswer = !showAnswer)} class="rounded-lg border px-4 py-2 text-sm font-semibold">
              {showAnswer ? 'Hide answer' : 'Reveal answer'}
            </button>
          {:else}
            <button onclick={continueAfterFeedback} class="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold">
              Continue
            </button>
          {/if}
        </div>

        {#if showAnswer && !feedback}
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p class="font-semibold">Expected answer</p>
            <p>{current.expectedAnswer}</p>
          </div>
        {/if}

        {#if feedback}
          <div
            class={`rounded-lg border p-3 text-sm ${
              feedback.isCorrect
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-red-300 bg-red-50 text-red-900'
            }`}
          >
            <p class="font-semibold">{feedbackMessage}</p>
            {#if !feedback.isCorrect}
              <p class="mt-1">Your answer: {@html feedback.userAnswerHtml || '<em>(blank)</em>'}</p>
              <p class="mt-1">Expected answer: {@html feedback.expectedAnswerHtml}</p>
              <p class="mt-1">This prompt has been added to your retry queue.</p>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</section>
