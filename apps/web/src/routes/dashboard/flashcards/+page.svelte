<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  type Deck = {
    id: number;
    name: string;
    description?: string | null;
    language?: string;
    cardCount?: number;
    dueCount?: number;
  };

  let decks: Deck[] = [];
  let loading = true;

  let showDeckModal = false;
  let showCardModal = false;

  let deckForm = {
    name: '',
    description: '',
    language: 'ga'
  };

  let cardForm = {
    deckId: '',
    front: '',
    back: '',
    pronunciation: '',
    notes: ''
  };

  async function loadDecks() {
    loading = true;
    try {
      const res = await fetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch decks');
      decks = await res.json();
    } catch (err) {
      console.error('Failed to load decks', err);
      decks = [];
    } finally {
      loading = false;
    }
  }

  onMount(loadDecks);

  function startQuickStudy() {
    goto('/dashboard/flashcards/study');
  }

  function openDeck(deck: Deck) {
    goto(`/dashboard/flashcards/study?packId=${deck.id}`);
  }

  function openDeckModal() {
    deckForm = { name: '', description: '', language: 'ga' };
    showDeckModal = true;
  }

  function closeDeckModal() {
    showDeckModal = false;
  }

  function openCardModal(deck?: Deck) {
    cardForm = {
      deckId: deck ? String(deck.id) : decks[0] ? String(decks[0].id) : '',
      front: '',
      back: '',
      pronunciation: '',
      notes: ''
    };
    showCardModal = true;
  }

  function closeCardModal() {
    showCardModal = false;
  }

  async function createDeck() {
    const name = deckForm.name.trim();
    if (!name) {
      alert('Deck name is required');
      return;
    }

    try {
      const res = await fetch('/api/proxy/flashcards/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: deckForm.description || undefined,
          language: deckForm.language || 'ga'
        })
      });

      if (!res.ok) throw new Error('Failed to create deck');
      const deck = await res.json();

      decks = [
        {
          ...deck,
          cardCount: deck.cardCount ?? 0,
          dueCount: deck.dueCount ?? 0
        },
        ...decks
      ];
      closeDeckModal();
    } catch (err) {
      console.error('Failed to create deck', err);
      alert('Failed to create deck');
    }
  }

  async function submitCard() {
    const deckId = Number(cardForm.deckId);
    const front = cardForm.front.trim();
    const back = cardForm.back.trim();

    if (!deckId || !front || !back) {
      alert('Deck, front, and back are required');
      return;
    }

    try {
      const res = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front,
          back,
          pronunciation: cardForm.pronunciation || undefined,
          notes: cardForm.notes || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to add card');

      decks = decks.map((deck) =>
        deck.id === deckId
          ? { ...deck, cardCount: (deck.cardCount || 0) + 1 }
          : deck
      );

      closeCardModal();
    } catch (err) {
      console.error('Failed to add card', err);
      alert('Failed to add card');
    }
  }
</script>

<section class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-5xl mx-auto px-4 space-y-10">
    <header>
      <h1 class="text-3xl font-bold text-emerald-600">Flashcards</h1>
      <p class="text-gray-500 mt-1">Review what you've learned.</p>
      <p class="text-sm mt-2">
        <a href="/dashboard/practice" class="text-emerald-700 hover:underline">
          Try Practice Lab for typed translation, sentence building, and cloze drills.
        </a>
      </p>
    </header>

    <section class="rounded-xl border bg-emerald-600 text-white p-6 shadow">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <button
          onclick={startQuickStudy}
          class="block w-full rounded-lg border bg-white p-5 shadow hover:shadow-md transition text-left"
        >
          <div>
            <h2 class="text-xl font-semibold text-emerald-600">Quick Start</h2>
            <p class="text-emerald-500 text-sm">Study all cards that are due right now</p>
          </div>
        </button>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-800">Your decks</h2>
        <button onclick={openDeckModal} class="text-sm text-emerald-600 hover:underline">+ New deck</button>
      </div>

      {#if loading}
        <div class="rounded-lg border bg-white p-5 text-sm text-gray-500">Loading decks...</div>
      {:else if decks.length === 0}
        <div class="rounded-lg border bg-white p-5 text-sm text-gray-500">No decks yet. Create your first deck.</div>
      {:else}
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each decks as deck (deck.id)}
            <div
              class="rounded-lg border bg-white p-5 shadow hover:shadow-md transition cursor-pointer"
              role="button"
              tabindex="0"
              onclick={() => openDeck(deck)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openDeck(deck);
                }
              }}
            >
              <div class="space-y-2">
                <h3 class="font-semibold text-lg">{deck.name}</h3>
                <p class="text-sm text-gray-500">{deck.description || ''}</p>

                <div class="flex justify-between text-sm pt-2">
                  <span class="text-gray-600">{deck.cardCount || 0} cards</span>
                  <span class={deck.dueCount && deck.dueCount > 0 ? 'font-medium text-emerald-600' : 'font-medium text-gray-400'}>
                    {deck.dueCount || 0} due
                  </span>
                </div>

                <button
                  class="mt-3 w-full rounded border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                  onclick={(event) => {
                    event.stopPropagation();
                    openCardModal(deck);
                  }}
                >
                  + Add card
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    {#if showDeckModal}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
          <h2 class="text-xl font-semibold text-gray-800">Create deck</h2>

          <input bind:value={deckForm.name} type="text" placeholder="Deck name" class="w-full rounded border px-3 py-2 text-sm" />
          <input bind:value={deckForm.description} type="text" placeholder="Description (optional)" class="w-full rounded border px-3 py-2 text-sm" />
          <input bind:value={deckForm.language} type="text" placeholder="Language code (e.g. ga)" class="w-full rounded border px-3 py-2 text-sm" />

          <div class="flex justify-end gap-3">
            <button onclick={closeDeckModal} class="px-4 py-2 rounded border">Cancel</button>
            <button onclick={createDeck} class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Create</button>
          </div>
        </div>
      </div>
    {/if}

    {#if showCardModal}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
          <h2 class="text-xl font-semibold text-gray-800">Add flashcard</h2>

          <label for="flashcard-deck" class="block text-sm text-gray-600">Deck</label>
          <select id="flashcard-deck" bind:value={cardForm.deckId} class="w-full rounded border px-3 py-2 text-sm">
            {#each decks as deck (deck.id)}
              <option value={String(deck.id)}>{deck.name}</option>
            {/each}
          </select>

          <label for="flashcard-front" class="block text-sm text-gray-600">Front</label>
          <textarea id="flashcard-front" bind:value={cardForm.front} class="w-full rounded border px-3 py-2 text-sm min-h-[80px]"></textarea>

          <label for="flashcard-back" class="block text-sm text-gray-600">Back</label>
          <textarea id="flashcard-back" bind:value={cardForm.back} class="w-full rounded border px-3 py-2 text-sm min-h-[80px]"></textarea>

          <label for="flashcard-pronunciation" class="block text-sm text-gray-600">Pronunciation (optional)</label>
          <input id="flashcard-pronunciation" bind:value={cardForm.pronunciation} type="text" class="w-full rounded border px-3 py-2 text-sm" />

          <label for="flashcard-notes" class="block text-sm text-gray-600">Notes (optional)</label>
          <textarea id="flashcard-notes" bind:value={cardForm.notes} class="w-full rounded border px-3 py-2 text-sm min-h-[60px]"></textarea>

          <div class="flex justify-end gap-3">
            <button onclick={closeCardModal} class="px-4 py-2 rounded border">Cancel</button>
            <button onclick={submitCard} class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>
