<script lang="ts">
  export let summary: any = null;
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div class="rounded-xl bg-white border p-4">
    <p class="text-xs text-gray-500">Weekly minutes</p>
    <p class="text-2xl font-bold text-gray-800">{Math.round(summary?.weeklyMinutes || 0)}</p>
  </div>
  <div class="rounded-xl bg-white border p-4">
    <p class="text-xs text-gray-500">Monthly minutes</p>
    <p class="text-2xl font-bold text-gray-800">{Math.round(summary?.monthlyMinutes || 0)}</p>
  </div>
  <div class="rounded-xl bg-white border p-4">
    <p class="text-xs text-gray-500">Goals completed</p>
    <p class="text-2xl font-bold text-gray-800">{summary?.goals?.completed || 0} / {summary?.goals?.total || 0}</p>
  </div>
</div>
