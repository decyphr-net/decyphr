<script lang="ts">
  import { onMount } from 'svelte';
  import GoalProgressCard from '$lib/components/focus/GoalProgressCard.svelte';
  import { focusStore } from '$lib/stores/focus';

  let loading = false;
  let summary: any = null;
  let history: any[] = [];

  async function readError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      return body?.error || body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  async function loadSummary() {
    const res = await fetch('/api/proxy/goals/progress/summary');
    if (!res.ok) throw new Error(await readError(res, 'Failed to load progress summary'));
    summary = await res.json();
  }

  async function loadHistory() {
    const res = await fetch('/api/proxy/focus/sessions/history?page=1&pageSize=10');
    if (!res.ok) throw new Error(await readError(res, 'Failed to load history'));
    const payload = await res.json();
    history = payload?.data || [];
  }

  async function refreshAll() {
    loading = true;
    try {
      await Promise.all([loadSummary(), loadHistory(), focusStore.loadActive()]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to load focus data');
    } finally {
      loading = false;
    }
  }

  async function quickStartTime() {
    await focusStore.startSession({
      mode: 'time',
      activityType: 'course_material',
      plannedSeconds: 25 * 60,
      metadataJson: { source: 'focus_hub' },
    });
  }

  async function quickStartGoal() {
    const target = prompt('What are you working on?');
    if (!target) return;

    await focusStore.startSession({
      mode: 'goal',
      activityType: 'course_material',
      goalText: target,
      metadataJson: { source: 'focus_hub' },
    });
  }

  function formatDateTime(value?: string | null) {
    if (!value) return '--';
    return new Date(value).toLocaleString();
  }

  onMount(refreshAll);
</script>

<section class="max-w-6xl mx-auto py-6 space-y-6">
  <header class="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white p-8 shadow">
    <h1 class="text-3xl font-bold">Pomodoro Focus</h1>
    <p class="text-emerald-50 mt-2">Start a focused block, then jump directly back into course work or practice.</p>

    <div class="mt-5 flex gap-3 flex-wrap">
      <button onclick={quickStartTime} class="rounded-lg bg-white text-emerald-700 px-4 py-2 font-semibold">Start 25m focus</button>
      <button onclick={quickStartGoal} class="rounded-lg bg-emerald-700/70 text-white px-4 py-2 font-semibold border border-emerald-300/40">Start goal session</button>
      <a href="/dashboard/courses" class="rounded-lg border border-white/60 px-4 py-2 font-semibold">Go to courses</a>
      <a href="/dashboard/practice" class="rounded-lg border border-white/60 px-4 py-2 font-semibold">Go to practice</a>
    </div>
  </header>

  {#if loading}
    <div class="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading focus data...</div>
  {:else}
    <GoalProgressCard {summary} />

    <div class="rounded-xl border bg-white p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">Long-term goals</h2>
        <p class="text-sm text-gray-500 mt-1">Goal planning and check-ins now live on a dedicated page.</p>
      </div>
      <a href="/dashboard/goals" class="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium">Open goals</a>
    </div>

    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-gray-800">Recent focus sessions</h2>

      <div class="space-y-2">
        {#if history.length === 0}
          <div class="rounded-xl border bg-white p-4 text-sm text-gray-500">No sessions recorded yet.</div>
        {/if}

        {#each history as session (session.id)}
          <div class="rounded-xl border bg-white p-4 space-y-1">
            <div class="flex justify-between items-start gap-2">
              <p class="font-medium text-gray-800">{session.goalText || session.mode + ' session'}</p>
              <span class="text-xs px-2 py-1 rounded-full {session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}">{session.status}</span>
            </div>
            <p class="text-xs text-gray-500">{session.activityType}</p>
            <p class="text-xs text-gray-500">Started: {formatDateTime(session.startedAt)}</p>
            <p class="text-xs text-gray-500">Ended: {formatDateTime(session.endedAt)}</p>
            <p class="text-xs text-gray-500">Actual: {Math.round((session.actualSeconds || 0) / 60)} minutes</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
