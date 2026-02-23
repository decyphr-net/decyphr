<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount, tick } from 'svelte';
  export let data;

  type LessonBlock = {
    id: string;
    type: 'heading' | 'paragraph' | 'list';
    level?: number;
    text?: string;
    items?: string[];
  };

  type LessonPayload = {
    lesson: {
      courseSlug: string;
      courseTitle: string;
      lessonSlug: string;
      lessonTitle: string;
      estimatedMinutes: number;
      markdown: string;
      blocks: LessonBlock[];
      contentVersion: string;
      lexicon_include?: string[];
      lexicon_exclude?: string[];
    };
    progress: {
      status: 'not_started' | 'in_progress' | 'completed';
      progressPercent: number;
      lastBlockId: string | null;
      completedAt: string | null;
      timeSpentSec: number;
      contentVersion: string;
    };
  };

  let loading = true;
  let error = '';
  let payload: LessonPayload | null = null;

  let courseSlug = '';
  let lessonSlug = '';
  let currentBlockId: string | null = null;
  let observer: IntersectionObserver | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let hoverTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const hoverDedup = new Map<string, number>();
  const renderStoragePrefix = 'courses-render-exposure';
  let visibilityHandler: (() => void) | null = null;
  let unloadHandler: (() => void) | null = null;

  $: blocks = payload?.lesson.blocks ?? [];
  $: progressPercent = (() => {
    if (!blocks.length || !currentBlockId) return payload?.progress.progressPercent ?? 0;
    const idx = blocks.findIndex((item) => item.id === currentBlockId);
    if (idx < 0) return payload?.progress.progressPercent ?? 0;
    return Math.min(100, Math.max(payload?.progress.progressPercent ?? 0, Math.round(((idx + 1) / blocks.length) * 100)));
  })();

  $: spotlightTokens = (() => {
    if (!payload) return [] as string[];

    const include = payload.lesson.lexicon_include ?? [];
    if (include.length > 0) return include.slice(0, 24);

    const exclude = new Set((payload.lesson.lexicon_exclude ?? []).map((item) => item.toLowerCase()));
    const fromText = blocks
      .flatMap((block) => {
        if (block.type === 'list') return block.items ?? [];
        return block.text ? [block.text] : [];
      })
      .join(' ')
      .toLowerCase()
      .split(/[^\p{L}\p{N}'’-]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
      .filter((token) => !exclude.has(token))
      .filter((token) => !/^\d+$/.test(token));

    return [...new Set(fromText)].slice(0, 24);
  })();

  async function loadLesson() {
    if (!data?.courseSlug || !data?.lessonSlug) {
      error = 'Invalid route';
      loading = false;
      return;
    }

    courseSlug = data.courseSlug;
    lessonSlug = data.lessonSlug;

    loading = true;
    error = '';

    try {
      const res = await fetch(`/api/proxy/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      payload = await res.json();
      await tick();

      const hashTarget = window.location.hash ? window.location.hash.slice(1) : '';
      const preferred = hashTarget || payload?.progress?.lastBlockId || payload?.lesson?.blocks?.[0]?.id;
      if (preferred) {
        currentBlockId = preferred;
        document.getElementById(preferred)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      bindObserver();
      await emitRenderExposure();
      startProgressSync();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load lesson';
      payload = null;
    } finally {
      loading = false;
    }
  }

  function bindObserver() {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.getAttribute('id');
        if (id) {
          currentBlockId = id;
        }
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.25, 0.5, 0.75],
      },
    );

    for (const block of blocks) {
      const element = document.getElementById(block.id);
      if (element) observer.observe(element);
    }
  }

  function renderExposureKey() {
    if (!payload) return '';
    return [
      renderStoragePrefix,
      payload.lesson.courseSlug,
      payload.lesson.lessonSlug,
      payload.lesson.contentVersion,
    ].join(':');
  }

  async function emitRenderExposure() {
    if (!payload) return;
    const key = renderExposureKey();

    if (browser && key && localStorage.getItem(key) === '1') {
      return;
    }

    const tokens = spotlightTokens.slice(0, 120);
    if (!tokens.length) return;

    const res = await fetch(
      `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/lexicon-exposure`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens,
          source: 'render',
          eventId: crypto.randomUUID(),
          contentVersion: payload.lesson.contentVersion,
        }),
      },
    );

    if (res.ok && browser && key) {
      localStorage.setItem(key, '1');
    }
  }

  async function persistProgress(completed = false) {
    if (!payload) return;

    const body = {
      lastBlockId: currentBlockId || payload.progress.lastBlockId || null,
      progressPercent,
      completed,
      timeSpentDeltaSec: completed ? 0 : 15,
      contentVersion: payload.lesson.contentVersion,
    };

    const res = await fetch(
      `/api/proxy/courses/${encodeURIComponent(payload.lesson.courseSlug)}/lessons/${encodeURIComponent(payload.lesson.lessonSlug)}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      const next = await res.json();
      if (payload) {
        payload.progress = next.progress;
      }
    }
  }

  async function completeLesson() {
    await persistProgress(true);
  }

  function queueHoverExposure(token: string) {
    if (!payload) return;

    const now = Date.now();
    const prev = hoverDedup.get(token) || 0;
    if (now - prev < 1200) {
      return;
    }

    const existing = hoverTimers.get(token);
    if (existing) clearTimeout(existing);

    hoverTimers.set(
      token,
      setTimeout(async () => {
        hoverDedup.set(token, Date.now());

        await fetch(
          `/api/proxy/courses/${encodeURIComponent(payload!.lesson.courseSlug)}/lessons/${encodeURIComponent(payload!.lesson.lessonSlug)}/lexicon-exposure`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: [token],
              source: 'hover',
              eventId: crypto.randomUUID(),
              contentVersion: payload!.lesson.contentVersion,
            }),
          },
        );
      }, 220),
    );
  }

  function startProgressSync() {
    stopProgressSync();
    progressTimer = setInterval(() => {
      persistProgress(false).catch(() => undefined);
    }, 15000);

    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        persistProgress(false).catch(() => undefined);
      }
    };

    unloadHandler = () => {
      persistProgress(false).catch(() => undefined);
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('beforeunload', unloadHandler);
  }

  function stopProgressSync() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (unloadHandler) {
      window.removeEventListener('beforeunload', unloadHandler);
      unloadHandler = null;
    }
  }

  onMount(() => {
    loadLesson();
  });

  onDestroy(() => {
    observer?.disconnect();
    stopProgressSync();
    for (const timer of hoverTimers.values()) {
      clearTimeout(timer);
    }
    hoverTimers.clear();
  });
</script>

<section class="py-8">
  <div class="mx-auto max-w-4xl space-y-6">
    {#if loading}
      <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading lesson...</div>
    {:else if error}
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
    {:else if payload}
      <header class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <a href="/dashboard/courses" class="text-sm font-medium text-emerald-700 hover:text-emerald-800">Back to courses</a>
        <h1 class="mt-2 text-3xl font-extrabold text-slate-900">{payload.lesson.lessonTitle}</h1>
        <p class="mt-1 text-slate-600">{payload.lesson.courseTitle} • {payload.lesson.estimatedMinutes} min</p>

        <div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-2 bg-emerald-500 transition-all" style={`width: ${progressPercent}%`}></div>
        </div>
        <p class="mt-2 text-sm text-slate-500">{progressPercent}% complete</p>

        <button
          class="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          onclick={completeLesson}
        >
          Mark lesson complete
        </button>
      </header>

      <article class="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {#each blocks as block}
          <div id={block.id} class="scroll-mt-24 rounded-md px-1 py-1" class:active={currentBlockId === block.id}>
            {#if block.type === 'heading'}
              {#if block.level === 1}
                <h2 class="text-3xl font-bold">{block.text}</h2>
              {:else if block.level === 2}
                <h3 class="text-2xl font-semibold">{block.text}</h3>
              {:else}
                <h4 class="text-xl font-semibold">{block.text}</h4>
              {/if}
            {:else if block.type === 'list'}
              <ul class="list-disc space-y-1 pl-6 text-slate-800">
                {#each block.items ?? [] as item}
                  <li>{item}</li>
                {/each}
              </ul>
            {:else}
              <p class="leading-7 text-slate-800">{block.text}</p>
            {/if}
          </div>
        {/each}
      </article>

      {#if spotlightTokens.length > 0}
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900">Word Spotlight</h2>
          <p class="mt-1 text-sm text-slate-600">Hover a word to log focused lexical exposure.</p>
          <div class="mt-4 flex flex-wrap gap-2">
            {#each spotlightTokens as token}
              <button
                type="button"
                class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                onmouseenter={() => queueHoverExposure(token)}
              >
                {token}
              </button>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  </div>
</section>

<style>
  .active {
    background: rgb(240 253 244);
  }
</style>
