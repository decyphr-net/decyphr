<script lang="ts">
  import { onMount } from 'svelte';
  import GoalCreateModal from '$lib/components/focus/GoalCreateModal.svelte';
  import GoalList from '$lib/components/focus/GoalList.svelte';
  import GoalProgressCard from '$lib/components/focus/GoalProgressCard.svelte';

  let showCreateModal = false;
  let loading = false;
  let goals: any[] = [];
  let summary: any = null;

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

  async function refreshAll() {
    loading = true;
    try {
      await Promise.all([loadGoals(), loadSummary()]);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to load goal data');
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

  onMount(refreshAll);
</script>

<section class="max-w-6xl mx-auto py-6 space-y-6">
  <header class="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white p-8 shadow">
    <h1 class="text-3xl font-bold">Goals</h1>
    <p class="text-slate-200 mt-2">Manage long-term learning targets separately from session flow.</p>

    <div class="mt-5 flex gap-3 flex-wrap">
      <button onclick={() => (showCreateModal = true)} class="rounded-lg bg-white text-slate-900 px-4 py-2 font-semibold">Create goal</button>
      <a href="/dashboard/pomodoro" class="rounded-lg border border-white/50 px-4 py-2 font-semibold">Back to pomodoro</a>
    </div>
  </header>

  {#if loading}
    <div class="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading goals data...</div>
  {:else}
    <GoalProgressCard {summary} />

    <div class="space-y-3">
      <h2 class="text-lg font-semibold text-gray-800">Active and archived goals</h2>
      <GoalList {goals} on:archive={archiveGoal} on:checkoff={checkoffGoal} />
    </div>
  {/if}

  <GoalCreateModal open={showCreateModal} on:close={() => (showCreateModal = false)} on:create={createGoal} />
</section>
