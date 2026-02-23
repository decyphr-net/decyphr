<script lang="ts">
  import { goto } from '$app/navigation';

  async function continueFlow() {
    await goto('/dashboard');
  }
</script>

<nav class="border-b bg-white">
  <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <a href="/" class="text-2xl font-bold bg-blue-500 bg-clip-text text-transparent">Misneach</a>
  </div>
</nav>

<div class="min-h-screen flex items-center justify-center p-8 bg-gray-50">
  <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 animate-slide-in transition-all duration-500 hover:shadow-2xl">
    <h1 class="text-3xl font-bold mb-4">Welcome</h1>
    <p class="text-gray-600 mb-6">Your profile is ready with course defaults for English speakers learning Irish.</p>

    <div class="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 mb-6">
      <p><strong>First language:</strong> English</p>
      <p><strong>Target language:</strong> Irish</p>
      <p><strong>Immersion:</strong> Normal</p>
    </div>

    <button
      onclick={continueFlow}
      class="w-full px-4 py-2 rounded-md bg-gradient-to-r from-teal-400 to-blue-500 text-white font-semibold hover:from-teal-500 hover:to-blue-600 hover:scale-105 transform transition-all duration-300"
    >
      Continue to dashboard
    </button>
  </div>
</div>
