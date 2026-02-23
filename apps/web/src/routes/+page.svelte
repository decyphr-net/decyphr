<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Optional icon hydration when Lucide is loaded from CDN.
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });
</script>

<nav class="border-b bg-white">
  <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <a href="/" class="text-2xl font-bold bg-blue-500 bg-clip-text text-transparent">Misneach</a>
    <div class="flex items-center space-x-4">
      <a href="/auth/login" class="text-sm font-medium text-slate-700 hover:text-blue-600">Sign in</a>
    </div>
  </div>
</nav>

<section class="relative py-24 bg-gradient-to-r from-teal-400 to-blue-500 text-white text-center overflow-hidden">
  <div class="max-w-4xl mx-auto px-4 space-y-6 animate-fade-in">
    <h1 class="text-4xl md:text-6xl font-extrabold leading-tight bg-white/20 backdrop-blur-md rounded-lg p-4">
      A practical Irish course for English speakers working in local business
    </h1>
    <p class="text-xl md:text-2xl text-white/90">
      Build real phrases for shops, hospitality, services, and customer conversations across Ireland.
    </p>
    <a
      href="/auth/login"
      class="inline-flex items-center justify-center px-8 py-4 mt-6 rounded-md bg-white text-blue-600 font-semibold text-lg hover:scale-105 transform transition shadow-lg"
    >
      Start the course
    </a>
  </div>
</section>

<section class="py-20 bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 text-center mb-12">
    <h2 class="text-3xl md:text-4xl font-bold">Course Features</h2>
  </div>
  <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
    <div class="bg-white p-6 rounded-lg shadow-lg animate-slide-in">
      <div class="mb-4"><i data-lucide="languages" class="w-12 h-12 mx-auto text-blue-500"></i></div>
      <h3 class="text-xl font-semibold mb-2">Business Irish Phrase Sets</h3>
      <p class="text-gray-600">Learn high-frequency phrases for greeting, service, pricing, bookings, and support.</p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-lg animate-slide-in">
      <div class="mb-4"><i data-lucide="message-circle" class="w-12 h-12 mx-auto text-green-500"></i></div>
      <h3 class="text-xl font-semibold mb-2">Roleplay for Local Commerce</h3>
      <p class="text-gray-600">Practice real interactions like shop-floor help, front desk check-in, and cafe ordering.</p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-lg animate-slide-in">
      <div class="mb-4"><i data-lucide="bar-chart-2" class="w-12 h-12 mx-auto text-yellow-500"></i></div>
      <h3 class="text-xl font-semibold mb-2">Confidence Tracking</h3>
      <p class="text-gray-600">Track your speaking confidence by business context, not just by vocabulary count.</p>
    </div>
  </div>
</section>

<section class="py-20">
  <div class="max-w-6xl mx-auto px-4 text-center mb-12">
    <h2 class="text-3xl md:text-4xl font-bold">How It Works</h2>
  </div>
  <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 text-left">
    <div class="p-6 animate-fade-in">
      <h3 class="text-2xl font-semibold mb-2">1. Pick Your Business Context</h3>
      <p class="text-gray-600">Choose a path such as retail, hospitality, tourism, or public-facing services.</p>
    </div>
    <div class="p-6 animate-fade-in">
      <h3 class="text-2xl font-semibold mb-2">2. Train With Guided Scenarios</h3>
      <p class="text-gray-600">Work through realistic customer dialogues and service moments in Irish.</p>
    </div>
    <div class="p-6 animate-fade-in">
      <h3 class="text-2xl font-semibold mb-2">3. Rehearse for Real Use</h3>
      <p class="text-gray-600">Use flashcards, phrasebook review, and repeated drills until responses feel natural.</p>
    </div>
  </div>
</section>

<section class="py-20 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center">
  <div class="max-w-6xl mx-auto px-4">
    <h2 class="text-3xl md:text-4xl font-bold mb-12">Why This Course</h2>
    <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
      <div class="p-6 bg-white/10 rounded-lg shadow-lg animate-slide-in">
        <i data-lucide="store" class="w-10 h-10 mx-auto mb-4"></i>
        <p class="font-semibold">Designed for local business interactions</p>
      </div>
      <div class="p-6 bg-white/10 rounded-lg shadow-lg animate-slide-in">
        <i data-lucide="users" class="w-10 h-10 mx-auto mb-4"></i>
        <p class="font-semibold">Built for English speakers starting from practical needs</p>
      </div>
      <div class="p-6 bg-white/10 rounded-lg shadow-lg animate-slide-in">
        <i data-lucide="message-square-more" class="w-10 h-10 mx-auto mb-4"></i>
        <p class="font-semibold">Focuses on speaking fluently in short, real exchanges</p>
      </div>
    </div>
  </div>
</section>

<section class="py-20 bg-gray-100 text-center">
  <div class="max-w-6xl mx-auto px-4 mb-12">
    <h2 class="text-3xl md:text-4xl font-bold mb-6">What Learners Say</h2>
  </div>
  <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
    <div class="p-6">
      <p class="italic text-gray-600 mb-4">“I can now greet and help customers in Irish without freezing.”</p>
      <h4 class="font-semibold text-gray-700">Retail assistant, Galway</h4>
    </div>
    <div class="p-6">
      <p class="italic text-gray-600 mb-4">“The roleplays felt exactly like my front-desk conversations.”</p>
      <h4 class="font-semibold text-gray-700">Hotel receptionist, Kerry</h4>
    </div>
    <div class="p-6">
      <p class="italic text-gray-600 mb-4">“Finally a course that teaches the Irish I need at work.”</p>
      <h4 class="font-semibold text-gray-700">Cafe owner, Donegal</h4>
    </div>
  </div>
</section>

<section class="py-20 bg-gradient-to-r from-teal-400 to-blue-500 text-white text-center">
  <div class="max-w-4xl mx-auto px-4">
    <h2 class="text-4xl font-bold mb-4">Bring Irish into your daily business conversations</h2>
    <p class="text-lg mb-8">Practical, scenario-based, and built for English speakers.</p>
    <a href="/auth/login" class="inline-flex items-center justify-center px-8 py-4 mt-6 rounded-md bg-white text-blue-600 font-semibold text-lg hover:scale-105 transform transition shadow-lg">
      Get your magic link
    </a>
  </div>
</section>
