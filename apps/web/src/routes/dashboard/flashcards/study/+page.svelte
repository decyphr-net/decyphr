<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  type StudyCard = {
    id: number;
    front: string;
    back: string;
    pronunciation?: string | null;
    notes?: string | null;
  };

  let deck = {
    id: null as number | null,
    name: 'Due cards'
  };

  let cards: StudyCard[] = [];
  let currentIndex = 0;
  let revealed = false;
  let loading = true;

  $: currentCard =
    cards.length > 0
      ? {
          id: cards[currentIndex]?.id,
          text: cards[currentIndex]?.front,
          meaning: cards[currentIndex]?.back,
          pronunciation: cards[currentIndex]?.pronunciation,
          notes: cards[currentIndex]?.notes
        }
      : {
          id: null,
          text: 'No due cards',
          meaning: 'You are caught up',
          pronunciation: null,
          notes: null
        };

  onMount(async () => {
    try {
      const packId = new URLSearchParams(window.location.search).get('packId');
      const query = new URLSearchParams();
      if (packId) query.set('packId', packId);
      query.set('limit', '50');

      const res = await fetch(`/api/proxy/flashcards/study/due?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch due cards');
      cards = await res.json();

      if (packId) {
        deck.id = Number(packId);
        const deckRes = await fetch(`/api/proxy/flashcards/decks/${packId}`);
        if (deckRes.ok) {
          const deckData = await deckRes.json();
          deck.name = deckData.name;
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
        body: JSON.stringify({ grade: result })
      });
    } catch (err) {
      console.error('Failed to record attempt', err);
    } finally {
      nextCard();
    }
  }

  function nextCard() {
    revealed = false;
    if (currentIndex < cards.length - 1) {
      currentIndex += 1;
    } else {
      alert('Deck complete!');
      goto('/dashboard/flashcards');
    }
  }
</script>

<section class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-2xl mx-auto px-4 space-y-6">
    <header class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-semibold text-emerald-600">{deck.name}</h1>
        <p class="text-sm text-gray-500">Card {Math.min(currentIndex + 1, Math.max(cards.length, 1))} of {Math.max(cards.length, 1)}</p>
      </div>
      <span class="text-sm text-gray-400">Due now</span>
    </header>

    <div class="rounded-xl bg-white shadow p-8 min-h-[280px] flex flex-col justify-between">
      <div class="flex-1 flex items-center justify-center text-center">
        <p class="text-3xl font-semibold">{currentCard.text}</p>
      </div>

      {#if loading}
        <div class="text-center text-sm text-gray-500">Loading...</div>
      {:else if cards.length === 0}
        <div class="text-center">
          <button onclick={() => goto('/dashboard/flashcards')} class="mt-6 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
            Back to decks
          </button>
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
