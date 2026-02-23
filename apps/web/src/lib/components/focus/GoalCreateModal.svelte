<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();

  let title = '';
  let description = '';
  let periodType: 'weekly' | 'monthly' | 'yearly' | 'custom' = 'weekly';
  let periodStart = '';
  let periodEnd = '';
  let targetType: 'time_minutes' | 'session_count' | 'unit_count' = 'time_minutes';
  let targetValue = 120;
  let activityType = '';

  function close() {
    dispatch('close');
  }

  function submit() {
    dispatch('create', {
      title,
      description,
      periodType,
      periodStart,
      periodEnd,
      targetType,
      targetValue,
      activityType: activityType || undefined,
    });
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="bg-white rounded-xl w-full max-w-lg p-6 space-y-3">
      <h3 class="text-xl font-semibold">Create goal</h3>
      <input bind:value={title} placeholder="Goal title" class="w-full rounded border px-3 py-2 text-sm" />
      <textarea bind:value={description} placeholder="Description" class="w-full rounded border px-3 py-2 text-sm"></textarea>

      <div class="grid grid-cols-2 gap-2">
        <select bind:value={periodType} class="rounded border px-3 py-2 text-sm">
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom</option>
        </select>
        <select bind:value={targetType} class="rounded border px-3 py-2 text-sm">
          <option value="time_minutes">Time (minutes)</option>
          <option value="session_count">Session count</option>
          <option value="unit_count">Unit count</option>
        </select>
        <input type="datetime-local" bind:value={periodStart} class="rounded border px-3 py-2 text-sm" />
        <input type="datetime-local" bind:value={periodEnd} class="rounded border px-3 py-2 text-sm" />
        <input type="number" min="1" bind:value={targetValue} class="rounded border px-3 py-2 text-sm" />
        <input bind:value={activityType} placeholder="activityType (optional)" class="rounded border px-3 py-2 text-sm" />
      </div>

      <div class="flex justify-end gap-2">
        <button onclick={close} class="px-4 py-2 rounded border">Cancel</button>
        <button onclick={submit} class="px-4 py-2 rounded bg-emerald-600 text-white">Create</button>
      </div>
    </div>
  </div>
{/if}
