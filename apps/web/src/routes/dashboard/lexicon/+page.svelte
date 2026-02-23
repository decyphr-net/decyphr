<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';

  type SnapshotStats = {
    score?: number | string;
    updatedAt?: string;
  };

  type SnapshotItem = {
    id?: string | number;
    word?: string;
    lemma?: string;
    normalised?: string;
    pos?: string;
    stats?: SnapshotStats;
    cefr?: { level?: string; confidence?: number };
  };

  type CEFREstimate = {
    level: string;
    confidence: number;
  };

  let snapshot: SnapshotItem[] = [];
  let loading = true;
  let clientId = '';
  let cefr: CEFREstimate = { level: '-', confidence: 0 };

  let pageSize = 20;
  let currentPage = 1;

  let searchTerm = '';
  let sortKey: 'lemma' | 'word' | 'pos' | 'score' | 'cefr' = 'lemma';
  let sortDir: 'asc' | 'desc' = 'asc';

  let showImport = false;
  let importText = '';

  let flashcardModalOpen = false;
  let flashcardModalLoading = false;
  let flashcardDecks: Array<{ id: number; name: string }> = [];
  let flashcardForm = {
    deckId: '',
    newDeckName: '',
    front: '',
    back: '',
    notes: ''
  };

  let showCefrInfo = false;
  let showConfidenceInfo = false;

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  $: parsedWords = importText
    .split(/[\n,]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  $: highCount = snapshot.filter((item) => Number(item.stats?.score ?? 0) > 0.8).length;
  $: mediumCount = snapshot.filter((item) => {
    const score = Number(item.stats?.score ?? 0);
    return score > 0.5 && score <= 0.8;
  }).length;
  $: lowCount = snapshot.filter((item) => Number(item.stats?.score ?? 0) <= 0.5).length;

  $: filteredData = (() => {
    const term = searchTerm.trim().toLowerCase();
    let data = snapshot;

    if (term) {
      data = data.filter(
        (item) =>
          (item.lemma || '').toLowerCase().includes(term) ||
          (item.normalised || '').toLowerCase().includes(term) ||
          (item.word || '').toLowerCase().includes(term)
      );
    }

    const dir = sortDir === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      if (sortKey === 'score') {
        return (Number(a.stats?.score ?? 0) - Number(b.stats?.score ?? 0)) * dir;
      }

      if (sortKey === 'cefr') {
        const aIdx = cefrLevels.indexOf(a.cefr?.level ?? '');
        const bIdx = cefrLevels.indexOf(b.cefr?.level ?? '');
        return (aIdx - bIdx) * dir;
      }

      const aVal = ((a as Record<string, unknown>)[sortKey] ?? '') as string;
      const bVal = ((b as Record<string, unknown>)[sortKey] ?? '') as string;
      return aVal.toLowerCase().localeCompare(bVal.toLowerCase()) * dir;
    });
  })();

  $: totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  $: currentPage = Math.min(currentPage, totalPages);
  $: paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  $: avgConfidence = snapshot.length
    ? (snapshot.reduce((sum, item) => sum + Number(item.stats?.score || 0), 0) / snapshot.length).toFixed(2)
    : '--';

  $: lastUpdate = snapshot.length
    ? new Date(snapshot[0]?.stats?.updatedAt || Date.now()).toLocaleDateString()
    : '--';

  $: rangeLabel = (() => {
    if (!filteredData.length) return '0 entries';
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, filteredData.length);
    return `${start}-${end} of ${filteredData.length}`;
  })();

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setSort(key: 'lemma' | 'word' | 'pos' | 'score' | 'cefr') {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
    currentPage = 1;
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) currentPage = page;
  }

  function nextPage() {
    if (currentPage < totalPages) currentPage += 1;
  }

  function prevPage() {
    if (currentPage > 1) currentPage -= 1;
  }

  async function readError(response: Response, fallback: string) {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        if (body?.error) return String(body.error);
      }
      const text = await response.text();
      if (text) return text;
    } catch {
      // no-op
    }
    return fallback;
  }

  async function loadSnapshot(id: string) {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(`/api/proxy/snapshot/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(await readError(res, 'Failed to load snapshot'));

        const data = await res.json();
        snapshot = Array.isArray(data.snapshot) ? data.snapshot : [];
        cefr = data.cefr ?? { level: '-', confidence: 0 };
        currentPage = 1;
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Failed to load lexicon data');
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
          continue;
        }
      }
    }

    console.error('Failed to load snapshot', lastError);
    snapshot = [];
    cefr = { level: '-', confidence: 0 };
    alert(lastError?.message || 'Failed to load lexicon data');
  }

  async function submitImport() {
    if (!parsedWords.length) return;

    const res = await fetch('/api/proxy/lexicon/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: parsedWords })
    });

    if (!res.ok) {
      alert(await readError(res, 'Import failed'));
      return;
    }

    showImport = false;
    importText = '';
    if (clientId) await loadSnapshot(clientId);
  }

  async function openCreateFlashcardModal(item: SnapshotItem) {
    try {
      const decksRes = await fetch('/api/proxy/flashcards/decks', { cache: 'no-store' });
      if (!decksRes.ok) throw new Error('Failed to load decks');

      const frontText = (item.word || item.lemma || '').trim();
      if (!frontText) {
        alert('This lexicon row has no word text to use as card front');
        return;
      }

      const notesParts: string[] = [];
      if (item.pos) notesParts.push(`POS: ${item.pos}`);
      if (item.stats?.score != null) {
        notesParts.push(`Lexicon confidence: ${Number(item.stats.score).toFixed(2)}`);
      }

      flashcardDecks = await decksRes.json();
      flashcardForm = {
        deckId: flashcardDecks[0] ? String(flashcardDecks[0].id) : '__new__',
        newDeckName: flashcardDecks[0] ? '' : 'Lexicon',
        front: frontText,
        back: '',
        notes: notesParts.join(' | ')
      };
      flashcardModalOpen = true;
    } catch (err) {
      console.error('Failed to open flashcard modal', err);
      alert(err instanceof Error ? err.message : 'Failed to load decks');
    }
  }

  function closeFlashcardModal() {
    flashcardModalOpen = false;
    flashcardModalLoading = false;
  }

  async function submitFlashcardFromLexicon() {
    flashcardModalLoading = true;

    try {
      let deckId = flashcardForm.deckId;
      if (!deckId) throw new Error('Please select a deck');

      if (deckId === '__new__') {
        const newDeckName = (flashcardForm.newDeckName || '').trim();
        if (!newDeckName) throw new Error('New deck name is required');

        const createRes = await fetch('/api/proxy/flashcards/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newDeckName,
            description: 'Cards created from lexicon entries',
            language: 'ga'
          })
        });

        if (!createRes.ok) throw new Error(await readError(createRes, 'Failed to create deck'));
        const createdDeck = await createRes.json();
        deckId = String(createdDeck.id);
      }

      const front = (flashcardForm.front || '').trim();
      const back = (flashcardForm.back || '').trim();
      if (!front || !back) throw new Error('Front and back are required');

      const cardRes = await fetch(`/api/proxy/flashcards/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front,
          back,
          notes: flashcardForm.notes || undefined
        })
      });

      if (!cardRes.ok) throw new Error(await readError(cardRes, 'Failed to create flashcard'));

      closeFlashcardModal();
      alert('Flashcard created');
    } catch (err) {
      console.error('Failed to create flashcard from lexicon', err);
      alert(err instanceof Error ? err.message : 'Failed to create flashcard');
    } finally {
      flashcardModalLoading = false;
    }
  }

  onMount(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) throw new Error(await readError(res, 'Not authenticated'));
      const session = await res.json();
      clientId = String(session.clientId || '');

      if (!clientId) throw new Error('Client ID is missing from session');

      await loadSnapshot(clientId);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to initialize lexicon');
    } finally {
      loading = false;
    }
  });

  afterUpdate(() => {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });
</script>

<section class="py-12 flex flex-col gap-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-xl p-8 text-center text-white shadow-lg animate-fade-in">
      <h1 class="text-4xl font-extrabold tracking-tight">Lexicon</h1>
      <p class="mt-3 text-lg opacity-90">Track your active Irish vocabulary and confidence as you learn.</p>
      <button
        class="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 font-semibold text-white hover:bg-white/20 transition w-full sm:w-auto"
        onclick={() => scrollToSection('lexicon-table')}
      >
        <i data-lucide="arrow-down" class="w-5 h-5"></i>
        <span>Jump to table</span>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 mt-6">
      <div class="flex flex-1 items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
          <i data-lucide="list" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Words tracked</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{snapshot.length}</p>
        </div>
      </div>

      <div class="flex flex-1 items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
          <i data-lucide="star" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Avg confidence</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{avgConfidence}</p>
        </div>
      </div>

      <div class="flex flex-1 items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
          <i data-lucide="clock" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Last update</p>
          <p class="text-xl font-semibold text-gray-800 truncate">{lastUpdate}</p>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition mt-6">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
        <i data-lucide="award" class="w-6 h-6"></i>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-gray-500 truncate">Estimated CEFR level</p>

        <div class="relative inline-block mt-1 sm:mt-0">
          <button onclick={() => (showCefrInfo = !showCefrInfo)} class="text-gray-400 hover:text-gray-600">
            <i data-lucide="info" class="w-4 h-4"></i>
          </button>
          {#if showCefrInfo}
            <div class="absolute z-50 mt-2 w-64 sm:w-72 rounded-lg bg-white p-4 text-sm text-gray-700 shadow-lg border">
              <p class="font-medium mb-1">Common European Framework of Reference</p>
              <p class="text-gray-600">A1 is beginner level and C2 is near-native proficiency.</p>
            </div>
          {/if}
        </div>

        <p class="text-xl font-semibold text-gray-800 mt-2 sm:mt-1 truncate">
          <span
            class={`px-2 py-0.5 rounded-full text-white ${
              cefr.level === 'C2' || cefr.level === 'C1'
                ? 'bg-green-600'
                : cefr.level === 'B2' || cefr.level === 'B1'
                  ? 'bg-yellow-500'
                  : cefr.level === 'A2'
                    ? 'bg-orange-500'
                    : 'bg-red-600'
            }`}
          >
            {cefr.level || '-'}
          </span>
          <span class="ml-2 text-gray-600 text-sm truncate">{cefr.confidence ? `(${cefr.confidence.toFixed(2)})` : ''}</span>
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 flex-shrink-0">
          <i data-lucide="thumbs-up" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">High confidence</p>
          <p class="text-2xl font-bold text-green-600 truncate">{highCount}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0">
          <i data-lucide="meh" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Medium confidence</p>
          <p class="text-2xl font-bold text-yellow-600 truncate">{mediumCount}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 flex-shrink-0">
          <i data-lucide="thumbs-down" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-500 truncate">Low confidence</p>
          <p class="text-2xl font-bold text-red-600 truncate">{lowCount}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="relative w-full sm:max-w-sm">
        <input
          type="text"
          placeholder="Search words"
          class="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          bind:value={searchTerm}
          oninput={() => (currentPage = 1)}
        />
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
      </div>

      <button
        onclick={() => (showImport = true)}
        class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition w-full sm:w-auto"
      >
        <i data-lucide="plus" class="w-4 h-4"></i>
        <span>Import words</span>
      </button>
    </div>

    <div id="lexicon-table" class="mt-8 overflow-x-auto rounded-xl bg-emerald-50 shadow-sm border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200 table-auto sm:table-fixed">
        <thead class="bg-emerald-100">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-emerald-800 cursor-pointer select-none" onclick={() => setSort('lemma')}>
              Word {sortKey === 'lemma' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-emerald-800 cursor-pointer select-none" onclick={() => setSort('word')}>
              Base form {sortKey === 'word' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-emerald-800 cursor-pointer select-none" onclick={() => setSort('pos')}>
              Part of speech {sortKey === 'pos' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-emerald-800 cursor-pointer select-none" onclick={() => setSort('score')}>
              <div class="flex items-center gap-1 relative">
                <span>Confidence</span>
                <button onclick={(e) => {
                  e.stopPropagation();
                  showConfidenceInfo = !showConfidenceInfo;
                }} class="text-emerald-700">
                  <i data-lucide="info" class="w-4 h-4"></i>
                </button>
                {#if showConfidenceInfo}
                  <div class="absolute z-50 mt-20 w-64 sm:w-72 rounded-lg bg-white p-4 text-sm text-gray-700 shadow-lg border">
                    <p class="font-medium mb-1">Model confidence score</p>
                    <p class="text-gray-600">Higher values indicate stronger confidence in lexical recognition.</p>
                  </div>
                {/if}
                {sortKey === 'score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </div>
            </th>
            <th class="px-4 py-2 text-left text-sm font-medium text-emerald-800">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#if loading}
            <tr>
              <td colspan="5" class="py-12 text-center">
                <svg class="animate-spin h-8 w-8 text-emerald-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              </td>
            </tr>
          {:else if filteredData.length === 0}
            <tr>
              <td colspan="5" class="py-12 text-center text-gray-500">
                <i data-lucide="folder-search" class="w-12 h-12 mx-auto mb-4 text-emerald-400"></i>
                <p class="mb-2 font-medium">No lexicon entries found</p>
                <button
                  class="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition"
                  onclick={() => (showImport = true)}
                >
                  <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                  <span>Import words</span>
                </button>
              </td>
            </tr>
          {:else}
            {#each paginatedData as item, index (`${item.id || item.lemma || item.word || 'row'}-${index}`)}
              <tr class="hover:bg-emerald-50 transition-colors">
                <td class="px-4 py-2">{item.word || '-'}</td>
                <td class="px-4 py-2">{item.lemma || '-'}</td>
                <td class="px-4 py-2">{item.pos || '-'}</td>
                <td class="px-4 py-2">
                  <span
                    class={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                      Number(item.stats?.score ?? 0) > 0.8
                        ? 'bg-green-600'
                        : Number(item.stats?.score ?? 0) > 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-600'
                    }`}
                  >
                    {Number(item.stats?.score ?? 0).toFixed(2)}
                  </span>
                </td>
                <td class="px-4 py-2">
                  <button
                    onclick={() => openCreateFlashcardModal(item)}
                    class="inline-flex items-center gap-1 rounded border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <i data-lucide="square-plus" class="w-3 h-3"></i>
                    <span>Create flashcard</span>
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    {#if !loading && totalPages > 1}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 text-sm text-gray-600 gap-2 sm:gap-0">
        <div>{rangeLabel}</div>

        <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onclick={prevPage}
            disabled={currentPage === 1}
            class="px-3 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>

          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNo (pageNo)}
            <button
              onclick={() => goToPage(pageNo)}
              class={`px-2 py-1 rounded transition ${
                pageNo === currentPage ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-emerald-500 hover:text-white'
              }`}
            >
              {pageNo}
            </button>
          {/each}

          <button
            onclick={nextPage}
            disabled={currentPage === totalPages}
            class="px-3 py-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if flashcardModalOpen}
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onclick={(e) => e.target === e.currentTarget && closeFlashcardModal()}>
      <div class="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 class="text-xl font-semibold mb-2">Create flashcard</h2>

        <div class="space-y-3">
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
            <input type="text" bind:value={flashcardForm.front} class="w-full rounded-lg border p-2 text-sm" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Back</label>
            <textarea bind:value={flashcardForm.back} rows="3" class="w-full rounded-lg border p-2 text-sm"></textarea>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea bind:value={flashcardForm.notes} rows="2" class="w-full rounded-lg border p-2 text-sm"></textarea>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button onclick={closeFlashcardModal} class="px-4 py-2 text-sm rounded bg-gray-200">Cancel</button>
          <button
            onclick={submitFlashcardFromLexicon}
            disabled={flashcardModalLoading}
            class="px-4 py-2 text-sm rounded bg-emerald-600 text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showImport}
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onclick={(e) => e.target === e.currentTarget && (showImport = false)}>
      <div class="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 class="text-xl font-semibold mb-2">Import words</h2>

        <p class="text-sm text-gray-600 mb-4">Paste words separated by commas or new lines.</p>

        <textarea
          bind:value={importText}
          rows="6"
          class="w-full rounded-lg border p-3 text-sm focus:ring-emerald-500"
          placeholder="Dia duit\nle do thoil\nslan"
        ></textarea>

        <div class="mt-2 text-xs text-gray-500">Detected {parsedWords.length} words</div>

        <div class="mt-6 flex justify-end gap-2">
          <button onclick={() => (showImport = false)} class="px-4 py-2 text-sm rounded bg-gray-200">Cancel</button>
          <button onclick={submitImport} class="px-4 py-2 text-sm rounded bg-emerald-600 text-white">Import</button>
        </div>
      </div>
    </div>
  {/if}
</section>
