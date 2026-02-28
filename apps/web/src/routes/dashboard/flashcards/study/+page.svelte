<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    incrementFlashcardsProgress,
    loadStudySession,
    saveStudySession,
    studyCoordinatorHref,
    type StudySession,
  } from '$lib/study-session';

  type StudyCard = {
    id: number;
    front: string;
    back: string;
    pronunciation?: string | null;
    notes?: string | null;
  };

  let deck = {
    id: null as number | null,
    name: 'Due cards',
  };

  let cards: StudyCard[] = [];
  let currentIndex = 0;
  let revealed = false;
  let loading = true;
  let studySessionId = '';
  let studySession: StudySession | null = null;
  let studyReturnTo = '';
  let studySessionLimit = 50;
  let studyScopePackIds: number[] = [];
  let studyGlobalFill = true;
  let studyMode = false;
  let attemptedInSession = 0;
  let authClientId = '';

  $: currentCard =
    cards.length > 0
      ? {
          id: cards[currentIndex]?.id,
          text: cards[currentIndex]?.front,
          meaning: cards[currentIndex]?.back,
          pronunciation: cards[currentIndex]?.pronunciation,
          notes: cards[currentIndex]?.notes,
        }
      : {
          id: null,
          text: 'No due cards',
          meaning: 'You are caught up',
          pronunciation: null,
          notes: null,
        };

  function parseSessionLimit(raw: string | null) {
    const parsed = Number(raw || 50);
    if (!Number.isFinite(parsed)) return 50;
    return Math.max(1, Math.min(200, Math.round(parsed)));
  }

  function parseScopePackIds(raw: string | null) {
    if (!raw) return [];
    return raw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function dedupeCards(items: StudyCard[]) {
    const seen = new Set<number>();
    const deduped: StudyCard[] = [];
    for (const card of items) {
      if (!card?.id || seen.has(card.id)) continue;
      seen.add(card.id);
      deduped.push(card);
    }
    return deduped;
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

  async function fetchDueCards(params: URLSearchParams) {
    const res = await fetch(`/api/proxy/flashcards/study/due?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch due cards');
    const payload = await res.json();
    return Array.isArray(payload) ? (payload as StudyCard[]) : [];
  }

  function persistStudyFlashcardsProgress(delta: number) {
    if (!studySessionId || delta <= 0) return;
    const currentSession = loadStudySession(studySessionId, authClientId || null);
    if (!currentSession) return;
    incrementFlashcardsProgress(currentSession, delta);
    saveStudySession(currentSession);
    studySession = currentSession;
  }

  onMount(async () => {
    try {
      await loadAuthContext();
      const params = new URLSearchParams(window.location.search);
      const packId = params.get('packId');
      studySessionId = params.get('studySession') || '';
      if (!authClientId) {
        studySessionId = '';
      }
      studySession = studySessionId ? loadStudySession(studySessionId, authClientId || null) : null;
      studyReturnTo = params.get('returnTo') || (studySessionId ? studyCoordinatorHref(studySessionId) : '');
      studySessionLimit = parseSessionLimit(params.get('sessionLimit'));
      studyScopePackIds = parseScopePackIds(params.get('scopePackIds'));
      studyGlobalFill = params.get('globalFill') !== '0';
      studyMode = Boolean(studySessionId);

      // If session storage is missing/corrupt, continue in normal study mode.
      if (studySessionId && !studySession) {
        studySessionId = '';
        studyReturnTo = '';
        studyScopePackIds = [];
        studyMode = false;
      }

      if (studyMode && studyScopePackIds.length > 0) {
        deck.name = 'Study Session Flashcards';
        const scopedCards: StudyCard[] = [];

        for (const scopedPackId of studyScopePackIds) {
          if (scopedCards.length >= studySessionLimit) break;
          const remaining = Math.max(1, studySessionLimit - scopedCards.length);
          const query = new URLSearchParams();
          query.set('packId', String(scopedPackId));
          query.set('limit', String(remaining));
          const next = await fetchDueCards(query);
          scopedCards.push(...next);
        }

        let combined = dedupeCards(scopedCards);

        if (combined.length < studySessionLimit && studyGlobalFill) {
          const globalQuery = new URLSearchParams();
          globalQuery.set('limit', String(Math.max(studySessionLimit * 2, studySessionLimit + 20)));
          const globalCards = await fetchDueCards(globalQuery);
          combined = dedupeCards([...combined, ...globalCards]);
        }

        cards = combined.slice(0, studySessionLimit);
      } else {
        const query = new URLSearchParams();
        if (packId) query.set('packId', packId);
        query.set('limit', String(studySessionLimit));

        cards = await fetchDueCards(query);

        if (packId) {
          deck.id = Number(packId);
          const deckRes = await fetch(`/api/proxy/flashcards/decks/${packId}`);
          if (deckRes.ok) {
            const deckData = await deckRes.json();
            deck.name = deckData.name;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load study cards', err);
      cards = [];
    } finally {
      loading = false;
    }
  });

  function reveal() {
    revealed = true;
  }

  async function rate(result: 'again' | 'hard' | 'good' | 'easy') {
    if (!currentCard.id) return;

    try {
      await fetch(`/api/proxy/flashcards/cards/${currentCard.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: result }),
      });
    } catch (err) {
      console.error('Failed to record attempt', err);
    } finally {
      attemptedInSession += 1;
      persistStudyFlashcardsProgress(1);
      await nextCard();
    }
  }

  async function nextCard() {
    revealed = false;
    if (currentIndex < cards.length - 1) {
      currentIndex += 1;
      return;
    }

    if (studyMode) {
      await goto(studyReturnTo || studyCoordinatorHref(studySessionId));
      return;
    }

    alert('Deck complete!');
    goto('/dashboard/flashcards');
  }
</script>

<section class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-2xl mx-auto px-4 space-y-6">
    <header class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-semibold text-emerald-600">{deck.name}</h1>
        <p class="text-sm text-gray-500">
          Card {Math.min(currentIndex + 1, Math.max(cards.length, 1))} of {Math.max(cards.length, 1)}
        </p>
      </div>
      <span class="text-sm text-gray-400">
        {studyMode ? `Study session • ${attemptedInSession} reviewed` : 'Due now'}
      </span>
    </header>

    {#if studyMode && studySession}
      <section class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p class="text-sm font-semibold text-emerald-800">Guided session mode</p>
        <p class="text-sm text-emerald-700 mt-1">
          Flashcards: {studySession.progress.flashcardsCompleted} / {studySession.targets.flashcards}
        </p>
      </section>
    {/if}

    <div class="rounded-xl bg-white shadow p-8 min-h-[280px] flex flex-col justify-between">
      <div class="flex-1 flex items-center justify-center text-center">
        <p class="text-3xl font-semibold">{currentCard.text}</p>
      </div>

      {#if loading}
        <div class="text-center text-sm text-gray-500">Loading...</div>
      {:else if cards.length === 0}
        <div class="text-center space-y-2">
          {#if studyMode}
            <p class="text-sm text-gray-600">No due flashcards available for this session.</p>
            <button
              onclick={() => goto(studyReturnTo || studyCoordinatorHref(studySessionId))}
              class="mt-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Return to Study Session
            </button>
          {:else}
            <button onclick={() => goto('/dashboard/flashcards')} class="mt-6 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
              Back to decks
            </button>
          {/if}
        </div>
      {:else if !revealed}
        <div class="text-center">
          <button onclick={reveal} class="mt-6 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
            Show answer
          </button>
        </div>
      {:else}
        <div class="space-y-6">
          <div class="border-t pt-4 text-center space-y-2">
            <p class="text-lg italic text-gray-700">{currentCard.meaning}</p>
            {#if currentCard.pronunciation}
              <p class="text-sm font-mono text-gray-500">{currentCard.pronunciation}</p>
            {/if}
            {#if currentCard.notes}
              <p class="text-sm text-gray-600">{currentCard.notes}</p>
            {/if}
          </div>

          <div class="grid grid-cols-4 gap-3">
            <button onclick={() => rate('again')} class="rating-btn bg-red-100 text-red-700">Again <span class="text-xs text-gray-400">soon</span></button>
            <button onclick={() => rate('hard')} class="rating-btn bg-orange-100 text-orange-700">Hard <span class="text-xs text-gray-400">short</span></button>
            <button onclick={() => rate('good')} class="rating-btn bg-emerald-100 text-emerald-700">Good <span class="text-xs text-gray-400">normal</span></button>
            <button onclick={() => rate('easy')} class="rating-btn bg-blue-100 text-blue-700">Easy <span class="text-xs text-gray-400">long</span></button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .rating-btn {
    border-radius: 0.5rem;
    padding: 0.75rem 0.5rem;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }
</style>
