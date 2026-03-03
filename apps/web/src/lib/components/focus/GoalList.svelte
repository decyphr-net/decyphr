<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let goals: Array<any> = [];

  const dispatch = createEventDispatcher();

  function labelPeriod(periodType?: string): string {
    if (periodType === 'weekly') return 'Weekly';
    if (periodType === 'monthly') return 'Monthly';
    if (periodType === 'yearly') return 'Yearly';
    if (periodType === 'custom') return 'Custom';
    return 'No period';
  }

  function labelTarget(goal: any): string {
    const value = Number(goal?.targetValue);
    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;

    if (goal?.targetType === 'time_minutes') return `${safeValue} minutes`;
    if (goal?.targetType === 'session_count') return `${safeValue} sessions`;
    if (goal?.targetType === 'unit_count') return `${safeValue} units`;
    return `${safeValue}`;
  }
</script>

<div class="space-y-3">
  {#if goals.length === 0}
    <div class="rounded-xl border bg-white p-4 text-sm text-gray-500">No goals yet.</div>
  {/if}

  {#each goals as goal (goal.id)}
    <div class="rounded-xl border bg-white p-4 space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-gray-800">{goal.title || 'Untitled goal'}</p>
          <p class="text-xs text-gray-500">{labelPeriod(goal.periodType)} • {labelTarget(goal)}</p>
          {#if goal.description}
            <p class="mt-1 text-xs text-gray-500">{goal.description}</p>
          {/if}
        </div>
        <span class="text-xs px-2 py-1 rounded-full {goal.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : goal.status === 'archived' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}">{goal.status}</span>
      </div>

      {#if goal.progress}
        <div class="space-y-1">
          <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div class="h-full bg-emerald-500" style={`width: ${Math.min(100, goal.progress.percent || 0)}%`}></div>
          </div>
          <p class="text-xs text-gray-500">{goal.progress.achieved} / {goal.progress.target}</p>
        </div>
      {/if}

      <div class="flex gap-2">
        <button onclick={() => dispatch('checkoff', { id: goal.id })} class="rounded border px-2 py-1 text-xs">Check off</button>
        {#if goal.status !== 'archived'}
          <button onclick={() => dispatch('archive', { id: goal.id })} class="rounded border px-2 py-1 text-xs">Archive</button>
        {/if}
      </div>
    </div>
  {/each}
</div>
