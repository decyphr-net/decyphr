<script lang="ts">
  import { onMount } from 'svelte';
  import FocusWidget from '$lib/components/focus/FocusWidget.svelte';
  let { children } = $props();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/auth/login';
  }

  onMount(() => {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });
</script>

<div class="relative flex min-h-screen">
  <aside class="w-64 bg-gradient-to-b from-teal-500 via-blue-500 to-indigo-600 text-white flex flex-col border-0">
    <div class="flex items-center justify-between p-4 border-b border-white/10">
      <a href="/dashboard" class="text-xl font-semibold">Misneach</a>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 py-4 space-y-2">
      <a href="/dashboard" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="layout-dashboard" class="w-5 h-5"></i><span>Dashboard</span></a>
      <a href="/dashboard/chat" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="message-circle" class="w-5 h-5"></i><span>Chat</span></a>
      <a href="/dashboard/translations" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="languages" class="w-5 h-5"></i><span>Translations</span></a>
      <a href="/dashboard/lexicon" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="book-open" class="w-5 h-5"></i><span>Lexicon</span></a>
      <a href="/dashboard/vault" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="archive" class="w-5 h-5"></i><span>Vault</span></a>
      <a href="/dashboard/pomodoro" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="timer" class="w-5 h-5"></i><span>Pomodoro</span></a>
      <a href="/dashboard/practice" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="brain" class="w-5 h-5"></i><span>Practice</span></a>
      <a href="/dashboard/phrasebook" class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition"><i data-lucide="notebook-pen" class="w-5 h-5"></i><span>Phrasebook</span></a>
    </nav>

    <div class="px-3 py-4 border-t border-white/20">
      <button onclick={logout} class="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition">
        <i data-lucide="log-out" class="w-4 h-4 text-white"></i>
        <span>Log out</span>
      </button>
    </div>
  </aside>

  <div class="flex flex-col flex-1 min-h-screen bg-slate-50">
    <main class="flex-1 min-w-0 p-8">
      {@render children()}
    </main>

    <footer class="bg-gray-800 text-gray-300 py-10 mt-8">
      <div class="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-white text-xl font-semibold mb-4">About</h3>
          <p>AI-powered Irish learning for English speakers.</p>
        </div>
        <div>
          <h3 class="text-white text-xl font-semibold mb-4">Links</h3>
          <ul class="space-y-2">
            <li><a href="/auth/login" class="hover:text-white">Login</a></li>
            <li><a href="/privacy" class="hover:text-white">Privacy</a></li>
            <li><a href="/terms" class="hover:text-white">Terms</a></li>
          </ul>
        </div>
        <div>
          <h3 class="text-white text-xl font-semibold mb-4">Contact</h3>
          <p>Email: support@decyphr.com</p>
          <p>Twitter: @decyphrapp</p>
        </div>
      </div>
      <div class="mt-8 text-center text-gray-500 text-sm">© 2026 Misneach. All rights reserved.</div>
    </footer>
  </div>
</div>

<FocusWidget />
