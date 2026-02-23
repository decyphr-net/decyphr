<script lang="ts">
  import { onMount } from 'svelte';
  import GoalCreateModal from '$lib/components/focus/GoalCreateModal.svelte';
  import GoalList from '$lib/components/focus/GoalList.svelte';
  import GoalProgressCard from '$lib/components/focus/GoalProgressCard.svelte';
  import { focusStore } from '$lib/stores/focus';

  let showCreateModal = false;
  let loading = false;
  let goals: any[] = [];
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

  async function loadGoals() {
    const res = await fetch('/api/proxy/goals');
    if (!res.ok) throw new Error(await readError(res, 'Failed to load goals'));
    goals = await res.json();
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
      await Promise.all([loadGoals(), loadSummary(), loadHistory(), focusStore.loadActive()]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to load focus data');
    } finally {
      loading = false;
    }
  }

  async function createGoal(event: CustomEvent<any>) {
    const res = await fetch('/api/proxy/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event.detail),
    });

    if (!res.ok) {
      alert(await readError(res, 'Failed to create goal'));
      return;
    }

    showCreateModal = false;
    await refreshAll();
  }

  async function archiveGoal(event: CustomEvent<{ id: string }>) {
    const res = await fetch(`/api/proxy/goals/${event.detail.id}/archive`, { method: 'POST' });
    if (!res.ok) {
      alert(await readError(res, 'Failed to archive goal'));
      return;
    }
    await refreshAll();
  }

  async function checkoffGoal(event: CustomEvent<{ id: string }>) {
    const res = await fetch(`/api/proxy/goals/${event.detail.id}/checkoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 }),
    });

    if (!res.ok) {
      alert(await readError(res, 'Failed to check off goal'));
      return;
    }
    await refreshAll();
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
    <h1 class="text-3xl font-bold">Focus & Goals Hub</h1>
    <p class="text-emerald-50 mt-2">Run timed or goal-based focus sessions while navigating the rest of the app.</p>

    <div class="mt-5 flex gap-3 flex-wrap">
      <button onclick={quickStartTime} class="rounded-lg bg-white text-emerald-700 px-4 py-2 font-semibold">Start 25m focus</button>
      <button onclick={quickStartGoal} class="rounded-lg bg-emerald-700/70 text-white px-4 py-2 font-semibold border border-emerald-300/40">Start goal session</button>
      <button onclick={() => (showCreateModal = true)} class="rounded-lg border border-white/60 px-4 py-2 font-semibold">Create goal</button>
    </div>
  </header>

  {#if loading}
    <div class="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading focus and goals data...</div>
  {:else}
    <GoalProgressCard {summary} />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-gray-800">Goals</h2>
        <GoalList {goals} on:archive={archiveGoal} on:checkoff={checkoffGoal} />
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
    </div>
  {/if}

  <GoalCreateModal open={showCreateModal} on:close={() => (showCreateModal = false)} on:create={createGoal} />
</section>
