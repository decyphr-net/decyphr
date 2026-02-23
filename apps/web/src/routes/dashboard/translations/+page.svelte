<script lang="ts">
  import { afterUpdate, onDestroy, onMount } from 'svelte';

  type Token = {
    text?: string;
    surface?: string;
    correctedWord?: string;
    pos?: string;
    lemma?: string;
    normalised?: string;
  };

  type Sentence = {
    text?: string;
    tokens: Token[];
  };

  type TranslationItem = {
    id: string;
    originalText: string;
    translated: string;
    createdAt: string;
    sentences: Sentence[];
    flatTokens: Token[];
  };

  type SessionResponse = {
    clientId?: string;
  };

  let text = '';
  let loading = false;
  let translations: TranslationItem[] = [];
  let page = 1;
  const limit = 5;
  let clientId = '';
  let eventSource: EventSource | null = null;
  let translationCache: Record<string, any> = {};
  let tokenHover: string | null = null;

  $: totalPages = Math.max(1, Math.ceil(translations.length / limit));
  $: page = Math.min(page, totalPages);
  $: paginatedTranslations = translations.slice((page - 1) * limit, page * limit);

  async function readError(response: Response, fallback: string): Promise<string> {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        if (payload?.error) return String(payload.error);
      }
      const textBody = await response.text();
      if (textBody) return textBody;
    } catch {
      // ignore
    }
    return fallback;
  }

  function normalizePayload(raw: any): TranslationItem {
    const tr = raw.translation || raw;

    const sentences = Array.isArray(raw.sentences)
      ? raw.sentences.map((s: any) => ({
          ...s,
          tokens: Array.isArray(s.tokens) ? s.tokens : [],
        }))
      : [];

    const flatTokens = sentences.flatMap((s: Sentence) => s.tokens || []);

    return {
      id: String(tr.id || tr.requestId),
      originalText: tr.originalText || '',
      translated: tr.translated || '',
      createdAt: tr.createdAt || new Date().toISOString(),
      sentences,
      flatTokens,
    };
  }

  function sortTranslations() {
    translations = [...translations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async function loadExistingTranslations() {
    loading = true;
    try {
      const res = await fetch('/api/proxy/translations/list');
      if (!res.ok) throw new Error(await readError(res, 'Failed to fetch list'));

      const payload = await res.json();
      const list = payload?.data ?? payload;

      if (!Array.isArray(list)) throw new Error('List payload is not an array');

      for (const item of list) {
        const id = String(item.id || item.requestId);
        translationCache[id] = { ...translationCache[id], ...item };
      }

      translations = Object.values(translationCache).map((item) => normalizePayload(item));
      sortTranslations();
    } catch (error) {
      console.error('Failed to load translations list', error);
      translations = [];
      alert(error instanceof Error ? error.message : 'Failed to load translations');
    } finally {
      loading = false;
    }
  }

  async function submit() {
    if (!text.trim() || !clientId) return;

    loading = true;
    try {
      const res = await fetch('/api/proxy/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          clientId,
          sourceLanguage: 'ga',
          targetLanguage: 'en',
        }),
      });

      if (!res.ok) throw new Error(await readError(res, 'Failed to submit translation'));

      text = '';
    } catch (error) {
      console.error('Failed to submit translation', error);
      alert(error instanceof Error ? error.message : 'Failed to submit translation');
    } finally {
      loading = false;
    }
  }

  function openSSE() {
    if (eventSource) return;

    eventSource = new EventSource('/api/translations/stream');

    eventSource.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data);
        const id = String(raw.translation?.id || raw.id || raw.requestId || '');
        if (!id) return;

        if (!translationCache[id]) {
          translationCache[id] = {
            id,
            originalText: '',
            translated: '',
            sentences: [],
          };
        }

        const cached = translationCache[id];

        if (raw.translation) {
          cached.originalText = raw.translation.originalText || cached.originalText;
          cached.translated = raw.translation.translated || cached.translated;
          cached.createdAt = raw.translation.createdAt || cached.createdAt;
        }

        if (raw.nlp?.sentences) {
          cached.sentences = raw.nlp.sentences.map((s: any) => ({
            ...s,
            tokens: Array.isArray(s.tokens) ? s.tokens : [],
          }));
        }

        if (!Array.isArray(cached.sentences)) cached.sentences = [];

        const entry = normalizePayload(cached);
        const idx = translations.findIndex((t) => t.id === entry.id);

        if (idx >= 0) {
          translations[idx] = entry;
          translations = [...translations];
        } else {
          translations = [entry, ...translations];
        }

        sortTranslations();
      } catch (error) {
        console.error('SSE parse error', error);
      }
    };

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      setTimeout(openSSE, 5000);
    };
  }

  onMount(async () => {
    try {
      const sessRes = await fetch('/api/auth/session');
      if (!sessRes.ok) throw new Error(await readError(sessRes, 'Failed to load session'));

      const sess = (await sessRes.json()) as SessionResponse;
      clientId = (sess.clientId || '').trim();
      if (!clientId) throw new Error('Client ID missing');

      await loadExistingTranslations();
      openSSE();
    } catch (error) {
      console.error('Translation init error', error);
      alert(error instanceof Error ? error.message : 'Failed to initialize translations');
    }
  });

  onDestroy(() => {
    eventSource?.close();
    eventSource = null;
  });

  afterUpdate(() => {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });
</script>

<section class="py-12">
  <div class="max-w-6xl mx-auto px-6 space-y-10">
    <header class="space-y-2">
      <h1 class="text-3xl font-bold text-emerald-600">Translation</h1>
      <p class="text-gray-600">Translate text and inspect individual words inline.</p>
    </header>

    <section class="rounded-xl border bg-white p-6 space-y-4">
      <label for="translation-source" class="block text-sm font-medium text-gray-700">Source text</label>
      <textarea
        id="translation-source"
        bind:value={text}
        class="w-full min-h-[180px] rounded-lg border p-4 text-sm leading-relaxed focus:border-emerald-500 focus:ring-emerald-500"
        placeholder="Paste or type text to translate..."
      ></textarea>

      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">{text.length} characters</span>
        <button
          onclick={submit}
          disabled={loading}
          class="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {loading ? 'Translating...' : 'Translate'}
        </button>
      </div>
    </section>

    {#each paginatedTranslations as translation (translation.id)}
      <div class="rounded-lg border bg-white p-4 space-y-3 relative">
        {#if !translation.translated}
          <div class="flex items-center gap-3 text-emerald-600">
            <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span class="text-sm">Translating...</span>
          </div>
        {/if}

        {#if translation.translated}
          <p class="font-semibold text-lg">{translation.originalText}</p>
          <p class="text-gray-600">{translation.translated}</p>

          {#if translation.flatTokens.length}
            <div class="flex flex-wrap gap-2 mt-3">
              {#each translation.flatTokens as token, i (`token_${translation.id}_${i}`)}
                <div
                  class="relative"
                  onmouseenter={() => (tokenHover = `${translation.id}_${i}`)}
                  onmouseleave={() => (tokenHover = null)}
                >
                  <span class="bg-gray-100 px-2 py-1 rounded text-sm hover:bg-gray-200 cursor-default">
                    {token.correctedWord || token.surface || token.text || ''}
                  </span>

                  {#if tokenHover === `${translation.id}_${i}`}
                    <div class="absolute z-10 bg-white border p-2 shadow rounded mt-1 text-sm w-48">
                      <ul class="space-y-1">
                        <li><strong>Surface:</strong> {token.surface || 'N/A'}</li>
                        <li><strong>POS:</strong> {token.pos || 'N/A'}</li>
                        <li><strong>Lemma:</strong> {token.lemma || 'N/A'}</li>
                        <li><strong>Normalized:</strong> {token.normalised || 'N/A'}</li>
                      </ul>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/each}

    {#if translations.length === 0}
      <p class="text-sm italic text-gray-500">No translations yet.</p>
    {/if}

    {#if translations.length > limit}
      <div class="flex items-center justify-center gap-6 mt-4">
        <button
          onclick={() => (page = Math.max(1, page - 1))}
          disabled={page === 1}
          class="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
        >
          Previous
        </button>

        <span class="text-sm font-medium">Page {page} of {totalPages}</span>

        <button
          onclick={() => (page = Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          class="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    {/if}
  </div>
</section>
