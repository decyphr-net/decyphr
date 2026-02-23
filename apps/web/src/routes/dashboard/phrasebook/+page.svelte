<script lang="ts">
  import { afterUpdate, onDestroy, onMount } from 'svelte';

  type TokenRow = { position: number; surface: string; lemma: string; pos: string };
  type Phrase = {
    id: number | string;
    text: string;
    translation?: string | null;
    tokens?: TokenRow[];
    pronunciation?: string | null;
    example?: string | null;
    notes?: string | null;
    showTokens?: boolean;
    autoTranslate?: boolean;
    loading?: boolean;
    pendingRequestId?: string | null;
  };
  type ModalPhrase = {
    id: number | string | null;
    text: string;
    translation?: string | null;
    autoTranslate?: boolean;
    pronunciation?: string | null;
    example?: string | null;
    notes?: string | null;
    showTokens?: boolean;
    loading?: boolean;
    pendingRequestId?: string | null;
    tokens?: TokenRow[];
  };

  let loading = false;
  let statements: Phrase[] = [];
  let page = 1;
  const limit = 5;
  let searchQuery = '';

  let modalOpen = false;
  let deleteModalOpen = false;
  let translationConfirmOpen = false;
  let flashcardModalOpen = false;
  let flashcardModalLoading = false;

  let statementToDelete: Phrase | null = null;
  let statementToTranslate: Phrase | null = null;

  let modalStatement: ModalPhrase = {
    id: null,
    text: '',
    translation: '',
    autoTranslate: false,
    pronunciation: '',
    example: '',
    notes: ''
  };
  let source: EventSource | null = null;

  let flashcardDecks: Array<{ id: number; name: string }> = [];
  let flashcardForm = {
    deckId: '',
    newDeckName: '',
    front: '',
    back: '',
    pronunciation: '',
    notes: ''
  };

  async function readErrorMessage(response: Response, fallback: string) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        if (body?.error) return String(body.error);
      } else {
        const text = await response.text();
        if (text) return text;
      }
    } catch {
      // ignore parse errors
    }
    return fallback;
  }

  $: filteredStatements = !searchQuery.trim()
    ? statements
    : statements.filter(
        (s) =>
          s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.translation || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

  $: totalPages = Math.max(1, Math.ceil(filteredStatements.length / limit));
  $: page = Math.min(page, totalPages);
  $: paginatedStatements = filteredStatements.slice((page - 1) * limit, page * limit);

  async function init() {
    loading = true;
    try {
      const res = await fetch('/api/proxy/phrasebook/list');
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load phrasebook'));
      const data = await res.json();

      statements = data.map((s: Phrase) => ({
        ...s,
        showTokens: false,
        autoTranslate: !s.translation,
        loading: false,
      }));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to load statements');
    } finally {
      loading = false;
    }

    source = new EventSource('/api/phrasebook/stream');
    source.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg || !msg.type) return;

      if (msg.type === 'phrase.deleted') {
        statements = statements.filter((s) => s.id !== msg.phraseId);
        return;
      }

      if (msg.type === 'phrase.translation.requested') {
        const idx = statements.findIndex((s) => s.id === msg.phraseId);
        if (idx !== -1) statements[idx].loading = true;
        statements = [...statements];
        return;
      }

      if (!msg.phrase) return;
      const idx = statements.findIndex((s) => s.id === msg.phrase.id);
      const tempIdx = msg.requestId
        ? statements.findIndex((s) => s.pendingRequestId === msg.requestId)
        : -1;

      const normalized: Phrase = {
        id: msg.phrase.id,
        text: msg.phrase.text,
        translation: msg.phrase.translation ?? null,
        tokens: msg.phrase.tokens ?? [],
        pronunciation: msg.phrase.pronunciation ?? null,
        example: msg.phrase.example ?? null,
        notes: msg.phrase.notes ?? null,
        loading: false,
        showTokens: false,
        autoTranslate: !msg.phrase.translation,
        pendingRequestId: null,
      };

      if (idx !== -1) {
        statements[idx] = { ...statements[idx], ...normalized };
      } else if (tempIdx !== -1) {
        statements[tempIdx] = { ...statements[tempIdx], ...normalized };
      } else {
        statements = [normalized, ...statements];
      }
      statements = [...statements];
    };

    source.onerror = () => {
      console.warn('Phrasebook SSE disconnected');
    };
  }

  onMount(() => {
    init();
  });

  onDestroy(() => {
    source?.close();
    source = null;
  });

  afterUpdate(() => {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });

  function openModal(statement: Phrase | null = null) {
    modalStatement = statement
      ? { ...statement, autoTranslate: false }
      : { id: null, text: '', translation: '', autoTranslate: false, pronunciation: '', example: '', notes: '' };
    modalOpen = true;
  }

  function onTranslationInput() {
    if (modalStatement.autoTranslate) modalStatement.autoTranslate = false;
  }

  async function performGenerateTranslation(statement: Phrase) {
    statement.loading = true;
    statements = [...statements];

    try {
      const res = await fetch(`/api/proxy/phrasebook/${statement.id}/translate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate translation');
      const data = await res.json();
      statement.pendingRequestId = data.requestId || null;
      statements = [...statements];
    } catch (err) {
      console.error(err);
      alert('Failed to generate translation');
      statement.loading = false;
      statements = [...statements];
    }
  }

  async function generateTranslation(statement: Phrase) {
    if (statement.translation) {
      statementToTranslate = statement;
      translationConfirmOpen = true;
      return;
    }
    await performGenerateTranslation(statement);
  }

  function cancelGenerateTranslation() {
    translationConfirmOpen = false;
    statementToTranslate = null;
  }

  async function confirmGenerateTranslation() {
    const statement = statementToTranslate;
    translationConfirmOpen = false;
    statementToTranslate = null;
    if (!statement) return;
    await performGenerateTranslation(statement);
  }

  async function submitStatement() {
    if (!modalStatement.text?.trim()) {
      alert('Statement cannot be empty.');
      return;
    }

    const isEdit = !!modalStatement.id;
    const endpoint = isEdit ? `/api/proxy/phrasebook/${modalStatement.id}` : '/api/proxy/phrasebook';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modalStatement)
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'Save failed'));

      const data = await res.json();

      if (isEdit) {
        const idx = statements.findIndex((s) => s.id === modalStatement.id);
        if (idx !== -1) {
          statements[idx].loading = true;
          statements[idx].pendingRequestId = data.requestId || null;
          statements = [...statements];
        }
      } else {
        statements = [
          {
            id: `tmp-${data.requestId || Date.now()}`,
            text: modalStatement.text,
            translation: modalStatement.translation || null,
            tokens: [],
            pronunciation: modalStatement.pronunciation || null,
            example: modalStatement.example || null,
            notes: modalStatement.notes || null,
            loading: true,
            showTokens: false,
            autoTranslate: !!modalStatement.autoTranslate,
            pendingRequestId: data.requestId || null,
          },
          ...statements,
        ];
      }

      modalOpen = false;
    } catch (err) {
      console.error(err);
      alert('Failed to save statement');
    }
  }

  function deleteStatement(statement: Phrase) {
    statementToDelete = statement;
    deleteModalOpen = true;
  }

  function cancelDelete() {
    deleteModalOpen = false;
    statementToDelete = null;
  }

  async function confirmDeleteStatement() {
    const statement = statementToDelete;
    if (!statement) return;

    statement.loading = true;
    statements = [...statements];

    try {
      const res = await fetch(`/api/proxy/phrasebook/${statement.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const data = await res.json();
      statement.pendingRequestId = data.requestId || null;
      deleteModalOpen = false;
      statementToDelete = null;
      statement.loading = false;
      statements = [...statements];
    } catch (err) {
      console.error(err);
      alert('Failed to delete statement');
      statement.loading = false;
      statements = [...statements];
    }
  }

  async function openCreateFlashcardModal(statement: Phrase) {
    try {
      const decksRes = await fetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
      if (!decksRes.ok) throw new Error('Failed to load decks');
      flashcardDecks = await decksRes.json();

      flashcardForm = {
        deckId: flashcardDecks[0] ? String(flashcardDecks[0].id) : '__new__',
        newDeckName: flashcardDecks[0] ? '' : 'Phrasebook',
        front: statement.text || '',
        back: statement.translation || '',
        pronunciation: statement.pronunciation || '',
        notes: statement.notes || '',
      };
      flashcardModalOpen = true;
    } catch (err) {
      console.error(err);
      alert('Failed to load decks');
    }
  }

  function closeFlashcardModal() {
    flashcardModalOpen = false;
    flashcardModalLoading = false;
  }

  async function submitFlashcard() {
    flashcardModalLoading = true;

    try {
      let deckId = flashcardForm.deckId;
      if (!deckId) throw new Error('Please select a deck');

      if (deckId === '__new__') {
        const newDeckName = flashcardForm.newDeckName.trim();
        if (!newDeckName) throw new Error('New deck name is required');

        const createRes = await fetch('/api/proxy/flashcards/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDeckName,
            description: 'Cards created from phrasebook',
            language: 'ga'
          })
        });

        if (!createRes.ok) throw new Error('Failed to create deck');
        const createdDeck = await createRes.json();
        deckId = String(createdDeck.id);
      }

      const front = flashcardForm.front.trim();
      const back = flashcardForm.back.trim();
      if (!front || !back) throw new Error('Front and back are required');

      const cardRes = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front,
          back,
          pronunciation: flashcardForm.pronunciation || undefined,
          notes: flashcardForm.notes || undefined,
        })
      });

      if (!cardRes.ok) throw new Error('Failed to create flashcard');

      closeFlashcardModal();
      alert('Flashcard created');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to create flashcard');
    } finally {
      flashcardModalLoading = false;
    }
  }
</script>

<style>
  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
  .animate-progress { animation: progress 1.2s linear infinite; }
</style>

<section class="py-12">
  <div class="max-w-6xl mx-auto px-6 space-y-10">
    <div class="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-xl p-8 text-center text-white shadow-lg animate-fade-in">
      <h1 class="text-4xl font-extrabold tracking-tight">Phrasebook</h1>
      <p class="mt-3 text-lg opacity-90">Save useful Irish phrases and keep them ready for real conversations.</p>
      <button class="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 transition w-full sm:w-auto" onclick={() => openModal()}>
        <i data-lucide="plus-circle" class="w-5 h-5"></i>
        <span>Add phrase</span>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
          <i data-lucide="list" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Total phrases</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{statements.length}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
          <i data-lucide="check-circle" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Translated</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{statements.filter((s) => s.translation).length}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0">
          <i data-lucide="clock" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Pending translation</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{statements.filter((s) => s.autoTranslate && !s.translation).length}</p>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <input type="text" bind:value={searchQuery} placeholder="Search phrases..." class="w-full rounded border px-3 py-2 text-sm" />
    </div>

    {#if !loading && statements.length === 0}
      <div class="py-16 px-6 rounded-xl bg-emerald-50 text-center shadow-md space-y-4">
        <i data-lucide="message-square-text" class="w-16 h-16 mx-auto mb-2 text-emerald-400"></i>
        <h2 class="text-xl font-semibold text-gray-700">No phrases yet</h2>
        <p class="max-w-md mx-auto text-sm text-gray-600">Start by adding useful Irish phrases you want to remember.</p>
        <button class="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition" onclick={() => openModal()}>
          Add your first phrase
        </button>
      </div>
    {/if}

    {#each paginatedStatements as statement (statement.id)}
      <div class="relative">
        {#if statement.loading}
          <div class="absolute inset-0 bg-white/60 flex items-center justify-center z-50">
            <svg class="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          </div>
        {/if}

        <details class="absolute top-3 right-3 z-50">
          <summary class="list-none cursor-pointer p-1 rounded hover:bg-gray-100">
            <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </summary>
          <ul class="absolute right-0 mt-2 w-44 bg-white border rounded shadow z-50 divide-y text-sm">
            <li><button onclick={() => generateTranslation(statement)} class="w-full text-left px-4 py-2 hover:bg-gray-100">Generate translation</button></li>
            <li><button onclick={() => openModal(statement)} class="w-full text-left px-4 py-2 hover:bg-gray-100">Edit</button></li>
            <li><button onclick={() => deleteStatement(statement)} class="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Delete</button></li>
            <li><button onclick={() => openCreateFlashcardModal(statement)} class="w-full text-left px-4 py-2 hover:bg-gray-100">Create flashcard</button></li>
          </ul>
        </details>

        <div class="rounded-lg border bg-white p-5 space-y-4 shadow hover:shadow-md transition overflow-hidden">
          <p class="text-lg font-semibold">{statement.text}</p>

          {#if statement.translation}
            <p class="text-gray-600 italic flex items-center gap-2">
              <span>{statement.translation}</span>
            </p>
          {/if}

          <button onclick={() => {
            statement.showTokens = !statement.showTokens;
            statements = [...statements];
          }} class="text-sm text-emerald-600 hover:underline">
            {statement.showTokens ? 'Hide analysis' : 'Show analysis'}
          </button>

          {#if statement.showTokens}
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full text-sm border rounded">
                <thead class="bg-gray-50 text-gray-700">
                  <tr>
                    <th class="px-3 py-2 border">Position</th>
                    <th class="px-3 py-2 border">Word</th>
                    <th class="px-3 py-2 border">Lemma</th>
                    <th class="px-3 py-2 border">POS</th>
                  </tr>
                </thead>
                <tbody>
                  {#each statement.tokens || [] as token (token.position)}
                    <tr class="odd:bg-white even:bg-gray-50">
                      <td class="px-3 py-1 border text-center">{token.position}</td>
                      <td class="px-3 py-1 border">{token.surface}</td>
                      <td class="px-3 py-1 border text-gray-600">{token.lemma}</td>
                      <td class="px-3 py-1 border font-mono">{token.pos}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}

          {#if statement.pronunciation || statement.example || statement.notes}
            <div class="rounded-md bg-gray-50 border border-gray-200 p-3 space-y-2 text-sm">
              {#if statement.pronunciation}
                <p class="flex items-center gap-2">
                  <span class="text-xs uppercase text-gray-400">Pronunciation</span>
                  <span class="font-mono text-gray-700">{statement.pronunciation}</span>
                </p>
              {/if}
              {#if statement.example}
                <p>
                  <span class="text-xs uppercase text-gray-400 block">Example</span>
                  <span class="text-gray-700 italic">{statement.example}</span>
                </p>
              {/if}
              {#if statement.notes}
                <p>
                  <span class="text-xs uppercase text-gray-400 block">Notes</span>
                  <span class="text-gray-700">{statement.notes}</span>
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if totalPages > 1}
      <div class="flex justify-center items-center gap-6">
        <button onclick={() => (page = Math.max(1, page - 1))} disabled={page === 1} class="border rounded px-3 py-1 text-sm disabled:opacity-40">Prev</button>
        <span class="text-sm">{page} / {totalPages}</span>
        <button onclick={() => (page = Math.min(totalPages, page + 1))} disabled={page === totalPages} class="border rounded px-3 py-1 text-sm disabled:opacity-40">Next</button>
      </div>
    {/if}

    {#if modalOpen}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={(e) => e.target === e.currentTarget && (modalOpen = false)}>
        <div class="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
          <h2 class="text-xl font-bold">{modalStatement.id ? 'Edit phrase' : 'Add phrase'}</h2>

          <textarea bind:value={modalStatement.text} class="w-full border rounded p-3 min-h-[100px]" placeholder="Statement text"></textarea>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Translation</label>
            <textarea bind:value={modalStatement.translation} oninput={onTranslationInput} disabled={modalStatement.autoTranslate}
              class="w-full min-h-[80px] rounded-lg border p-3 text-sm disabled:bg-gray-100 disabled:text-gray-400" placeholder="Enter translation manually"></textarea>
            {#if modalStatement.autoTranslate}
              <p class="text-xs text-gray-500">Translation will be generated automatically.</p>
            {/if}
            <label class="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" bind:checked={modalStatement.autoTranslate} class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              <span>Auto-generate translation</span>
            </label>
          </div>

          <div class="border-t pt-4 space-y-4">
            <h3 class="text-sm font-semibold text-gray-700">Learning details</h3>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Pronunciation</label>
              <input type="text" bind:value={modalStatement.pronunciation} class="w-full rounded-lg border p-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Example</label>
              <textarea bind:value={modalStatement.example} rows="2" class="w-full rounded-lg border p-2 text-sm"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea bind:value={modalStatement.notes} rows="3" class="w-full rounded-lg border p-2 text-sm"></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button onclick={() => (modalOpen = false)} class="px-4 py-2 border rounded">Cancel</button>
            <button onclick={submitStatement} class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
          </div>
        </div>
      </div>
    {/if}

    {#if deleteModalOpen}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={(e) => e.target === e.currentTarget && cancelDelete()}>
        <div class="bg-white rounded-xl p-6 w-full max-w-sm text-center space-y-4">
          <h2 class="text-lg font-bold text-gray-700">Delete phrase</h2>
          <p class="text-sm text-gray-600">Are you sure you want to delete this phrase?</p>
          <div class="flex justify-center gap-4 mt-4">
            <button onclick={cancelDelete} class="px-4 py-2 rounded border">Cancel</button>
            <button onclick={confirmDeleteStatement} class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    {/if}

    {#if translationConfirmOpen}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={(e) => e.target === e.currentTarget && cancelGenerateTranslation()}>
        <div class="bg-white rounded-xl p-6 w-full max-w-sm text-center space-y-4">
          <h2 class="text-lg font-bold text-gray-700">Replace translation</h2>
          <p class="text-sm text-gray-600">This will replace the existing translation. Continue?</p>
          <div class="flex justify-center gap-4 mt-4">
            <button onclick={cancelGenerateTranslation} class="px-4 py-2 rounded border">Cancel</button>
            <button onclick={confirmGenerateTranslation} class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Continue</button>
          </div>
        </div>
      </div>
    {/if}

    {#if flashcardModalOpen}
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={(e) => e.target === e.currentTarget && closeFlashcardModal()}>
        <div class="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
          <h2 class="text-xl font-bold">Create flashcard</h2>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Deck</label>
            <select bind:value={flashcardForm.deckId} class="w-full rounded-lg border p-2 text-sm">
              <option value="">Select a deck</option>
              {#each flashcardDecks as deck (deck.id)}
                <option value={String(deck.id)}>{deck.name}</option>
              {/each}
              <option value="__new__">Create new deck</option>
            </select>
          </div>

          {#if flashcardForm.deckId === '__new__'}
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">New deck name</label>
              <input type="text" bind:value={flashcardForm.newDeckName} class="w-full rounded-lg border p-2 text-sm" />
            </div>
          {/if}

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Front</label>
            <textarea bind:value={flashcardForm.front} rows="2" class="w-full rounded-lg border p-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Back</label>
            <textarea bind:value={flashcardForm.back} rows="2" class="w-full rounded-lg border p-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Pronunciation (optional)</label>
            <input type="text" bind:value={flashcardForm.pronunciation} class="w-full rounded-lg border p-2 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea bind:value={flashcardForm.notes} rows="2" class="w-full rounded-lg border p-2 text-sm"></textarea>
          </div>

          <div class="flex justify-end gap-3">
            <button onclick={closeFlashcardModal} class="px-4 py-2 rounded border">Cancel</button>
            <button onclick={submitFlashcard} disabled={flashcardModalLoading} class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>
