<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();

  type PeriodType = 'weekly' | 'monthly' | 'yearly' | 'custom';
  type TargetType = 'time_minutes' | 'session_count' | 'unit_count';
  type ActivityType =
    | ''
    | 'reading'
    | 'course_material'
    | 'listening'
    | 'conversation'
    | 'writing'
    | 'review'
    | 'other';

  const activityOptions: Array<{ value: ActivityType; label: string }> = [
    { value: '', label: 'Any activity' },
    { value: 'course_material', label: 'Course material' },
    { value: 'reading', label: 'Reading' },
    { value: 'listening', label: 'Listening' },
    { value: 'conversation', label: 'Conversation' },
    { value: 'writing', label: 'Writing' },
    { value: 'review', label: 'Review' },
    { value: 'other', label: 'Other' },
  ];

  let title = '';
  let description = '';
  let periodType: PeriodType = 'weekly';
  let periodStart = '';
  let periodEnd = '';
  let targetType: TargetType = 'unit_count';
  let targetValue = 3;
  let activityType: ActivityType = '';

  let wasOpen = false;

  function formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatDateInput(date);
  }

  function suggestedDueDate(nextPeriodType: PeriodType, startDate: string): string {
    if (nextPeriodType === 'weekly') return addDays(startDate, 6);
    if (nextPeriodType === 'monthly') return addDays(startDate, 29);
    if (nextPeriodType === 'yearly') return addDays(startDate, 364);
    return addDays(startDate, 6);
  }

  function syncDefaults(nextPeriodType: PeriodType) {
    if (targetValue <= 0 || targetValue === 120) targetValue = 3;

    if (periodStart) {
      periodEnd = suggestedDueDate(nextPeriodType, periodStart);
    }
  }

  function resetForm() {
    const today = formatDateInput(new Date());

    title = '';
    description = '';
    periodType = 'weekly';
    periodStart = today;
    periodEnd = suggestedDueDate('weekly', today);
    targetType = 'unit_count';
    targetValue = 3;
    activityType = '';
  }

  $: if (open && !wasOpen) {
    resetForm();
    wasOpen = true;
  } else if (!open && wasOpen) {
    wasOpen = false;
  }

  function close() {
    dispatch('close');
  }

  function onStartDateChange() {
    if (!periodStart) return;
    periodEnd = suggestedDueDate(periodType, periodStart);
  }

  function resolveTargetLabel(currentTargetType: TargetType, currentPeriodType: PeriodType): string {
    if (currentTargetType === 'time_minutes') {
      return currentPeriodType === 'weekly' ? 'Minutes per week' : 'Target minutes';
    }
    if (currentTargetType === 'session_count') {
      return currentPeriodType === 'weekly' ? 'Sessions per week' : 'Target sessions';
    }
    return currentPeriodType === 'weekly' ? 'Items per week' : 'Target units';
  }

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      alert('Goal title is required.');
      return;
    }

    if (!periodStart || !periodEnd) {
      alert('Please select both start and due dates.');
      return;
    }

    if (targetValue <= 0) {
      alert('Target value must be greater than zero.');
      return;
    }

    dispatch('create', {
      title: trimmedTitle,
      description: description.trim() || undefined,
      periodType,
      periodStart: `${periodStart}T00:00:00`,
      periodEnd: `${periodEnd}T23:59:59`,
      targetType,
      targetValue: Number(targetValue),
      activityType: activityType || undefined,
    });
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={(e) => e.target === e.currentTarget && close()}>
    <div class="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
      <div>
        <h3 class="text-xl font-semibold">Create goal</h3>
        <p class="mt-1 text-sm text-gray-500">Set a clear target for a specific time window.</p>
      </div>

      <div class="space-y-2">
        <label for="goal-title" class="text-sm font-medium text-gray-700">Goal title</label>
        <input id="goal-title" bind:value={title} placeholder="e.g. Complete 5 speaking sessions" class="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div class="space-y-2">
        <label for="goal-description" class="text-sm font-medium text-gray-700">Description (optional)</label>
        <textarea id="goal-description" bind:value={description} placeholder="Add context for this goal" class="w-full rounded border px-3 py-2 text-sm"></textarea>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="goal-period-type" class="text-sm font-medium text-gray-700">Time frame</label>
          <select
            id="goal-period-type"
            bind:value={periodType}
            class="w-full rounded border px-3 py-2 text-sm"
            onchange={() => syncDefaults(periodType)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="goal-activity" class="text-sm font-medium text-gray-700">Activity focus</label>
          <select id="goal-activity" bind:value={activityType} class="w-full rounded border px-3 py-2 text-sm">
            {#each activityOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="goal-start" class="text-sm font-medium text-gray-700">Start date</label>
          <input
            id="goal-start"
            type="date"
            bind:value={periodStart}
            class="w-full rounded border px-3 py-2 text-sm"
            onchange={onStartDateChange}
          />
        </div>
        <div class="space-y-2">
          <label for="goal-due" class="text-sm font-medium text-gray-700">Due date</label>
          <input id="goal-due" type="date" bind:value={periodEnd} class="w-full rounded border px-3 py-2 text-sm" />
        </div>
      </div>

      <div class="space-y-2">
        <label for="goal-target-type" class="text-sm font-medium text-gray-700">Target metric</label>
        <select id="goal-target-type" bind:value={targetType} class="w-full rounded border px-3 py-2 text-sm">
          <option value="time_minutes">Minutes</option>
          <option value="session_count">Sessions</option>
          <option value="unit_count">Units (episodes, lessons, podcasts)</option>
        </select>
      </div>

      <div class="space-y-2">
        <label for="goal-target-value" class="text-sm font-medium text-gray-700">
          {resolveTargetLabel(targetType, periodType)}
        </label>
        <input id="goal-target-value" type="number" min="1" bind:value={targetValue} class="w-full rounded border px-3 py-2 text-sm" />
        {#if targetType === 'unit_count'}
          <p class="text-xs text-gray-500">Use units for countable items like episodes, podcasts, or lessons.</p>
        {/if}
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button onclick={close} class="rounded border px-4 py-2">Cancel</button>
        <button onclick={submit} class="rounded bg-emerald-600 px-4 py-2 text-white">Create</button>
      </div>
    </div>
  </div>
{/if}
