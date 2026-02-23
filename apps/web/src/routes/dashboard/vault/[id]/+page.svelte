<script lang="ts">
  import { page } from '$app/stores';
</script>

<section class="max-w-6xl mx-auto py-6">
  <div class="bg-white rounded-2xl p-8 shadow border border-slate-100">
    <h1 class="text-3xl font-bold text-slate-800 mb-3">Vault Detail</h1>
    <p class="text-slate-600">Entry ID: {$page.params.id}</p>
  </div>
</section>
