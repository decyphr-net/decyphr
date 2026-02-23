<script lang="ts">
  import { onMount } from 'svelte';
  import { focusStore } from '$lib/stores/focus';

  const activityTypes = [
    'reading',
    'course_material',
    'listening',
    'conversation',
    'writing',
    'review',
    'other',
  ];

  let open = false;
  let mode: 'time' | 'goal' = 'time';
  let activityType = 'course_material';
  let plannedMinutes = 25;
  let goalText = '';
  let loading = false;

  $: state = $focusStore;
  $: session = state.session;

  function formatTime(seconds: number | null | undefined) {
    if (seconds == null) return '--:--';
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  async function start() {
    loading = true;
    await focusStore.startSession({
      mode,
      activityType,
      goalText: mode === 'goal' ? goalText.trim() : undefined,
      plannedSeconds: mode === 'time' ? plannedMinutes * 60 : undefined,
      metadataJson: { source: 'focus_widget' },
    });
    loading = false;
    open = false;
  }

  onMount(() => {
    focusStore.loadActive();
  });
</script>

<div class="fixed bottom-5 right-5 z-50">
  {#if session && (session.status === 'running' || session.status === 'paused')}
    <div class="w-80 rounded-2xl bg-white border shadow-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-800">Focus Session</h3>
        <span class="text-xs px-2 py-1 rounded-full {session.status === 'running' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          {session.status}
        </span>
      </div>

      <p class="text-xs text-gray-500">{session.activityType.replace('_', ' ')}</p>
      {#if session.goalText}
        <p class="text-sm text-gray-700">{session.goalText}</p>
      {/if}

      <div class="rounded-xl bg-gray-50 p-3">
        <p class="text-xs text-gray-500">{session.mode === 'time' ? 'Remaining' : 'Elapsed'}</p>
        <p class="text-2xl font-bold text-gray-900">
          {session.mode === 'time' ? formatTime(session.remainingSeconds) : formatTime(session.actualSeconds)}
        </p>
      </div>

      <div class="flex items-center gap-2">
        {#if session.status === 'running'}
          <button onclick={() => focusStore.pause()} class="flex-1 rounded-lg bg-amber-500 text-white py-2 text-sm font-medium">Pause</button>
        {:else}
          <button onclick={() => focusStore.resume()} class="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium">Resume</button>
        {/if}
        <button onclick={() => focusStore.complete()} class="flex-1 rounded-lg bg-blue-600 text-white py-2 text-sm font-medium">Complete</button>
        <button onclick={() => focusStore.cancel()} class="rounded-lg border px-3 py-2 text-sm">End</button>
      </div>

      {#if session.mode === 'time'}
        <div class="flex items-center gap-2">
          <button onclick={() => focusStore.adjust({ remainingSecondsDelta: 300 })} class="rounded border px-2 py-1 text-xs">+5m</button>
          <button onclick={() => focusStore.adjust({ remainingSecondsDelta: 600 })} class="rounded border px-2 py-1 text-xs">+10m</button>
          <button onclick={() => focusStore.adjust({ remainingSecondsDelta: -300 })} class="rounded border px-2 py-1 text-xs">-5m</button>
        </div>
      {/if}
    </div>
  {:else}
    <button
      onclick={() => (open = !open)}
      class="rounded-full bg-emerald-600 text-white px-4 py-3 shadow-lg hover:bg-emerald-700 text-sm font-semibold"
    >
      Start Focus
    </button>

    {#if open}
      <div class="mt-2 w-80 rounded-2xl bg-white border shadow-lg p-4 space-y-3">
        <h3 class="text-sm font-semibold text-gray-800">New Focus Session</h3>

        <div>
          <label for="focus-mode" class="block text-xs text-gray-500 mb-1">Mode</label>
          <select id="focus-mode" bind:value={mode} class="w-full rounded-lg border px-2 py-2 text-sm">
            <option value="time">Time mode</option>
            <option value="goal">Goal mode</option>
          </select>
        </div>

        <div>
          <label for="focus-activity" class="block text-xs text-gray-500 mb-1">Activity</label>
          <select id="focus-activity" bind:value={activityType} class="w-full rounded-lg border px-2 py-2 text-sm">
            {#each activityTypes as activity}
              <option value={activity}>{activity.replace('_', ' ')}</option>
            {/each}
          </select>
        </div>

        {#if mode === 'time'}
          <div>
            <label for="focus-minutes" class="block text-xs text-gray-500 mb-1">Minutes</label>
            <input id="focus-minutes" type="number" min="1" bind:value={plannedMinutes} class="w-full rounded-lg border px-2 py-2 text-sm" />
          </div>
        {:else}
          <div>
            <label for="focus-goal" class="block text-xs text-gray-500 mb-1">Goal target</label>
            <input id="focus-goal" type="text" bind:value={goalText} placeholder="Finish lesson 3" class="w-full rounded-lg border px-2 py-2 text-sm" />
          </div>
        {/if}

        <div class="flex items-center gap-2">
          <button onclick={start} disabled={loading} class="flex-1 rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium disabled:opacity-50">
            {loading ? 'Starting...' : 'Start'}
          </button>
          <button onclick={() => (open = false)} class="rounded-lg border px-3 py-2 text-sm">Cancel</button>
        </div>
      </div>
    {/if}
  {/if}
</div>
