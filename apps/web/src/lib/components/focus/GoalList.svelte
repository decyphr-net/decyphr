<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let goals: Array<any> = [];

  const dispatch = createEventDispatcher();
</script>

<div class="space-y-3">
  {#if goals.length === 0}
    <div class="rounded-xl border bg-white p-4 text-sm text-gray-500">No goals yet.</div>
  {/if}

  {#each goals as goal (goal.id)}
    <div class="rounded-xl border bg-white p-4 space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-gray-800">{goal.title}</p>
          <p class="text-xs text-gray-500">{goal.periodType} • {goal.targetType} • target {goal.targetValue}</p>
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
