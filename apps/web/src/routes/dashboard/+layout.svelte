<script lang="ts">
  import { onMount } from 'svelte';
  import FocusWidget from '$lib/components/focus/FocusWidget.svelte';

  let { children } = $props();
  const themeModes: Record<string, 'light' | 'dark'> = {
    light: 'light',
    dark: 'dark',
  };

  const navItems = [
    { href: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { href: '/dashboard/pomodoro', icon: 'timer', label: 'Pomodoro' },
    { href: '/dashboard/goals', icon: 'target', label: 'Goals' },
    { href: '/dashboard/practice', icon: 'brain', label: 'Practice' },
    { href: '/dashboard/phrasebook', icon: 'notebook-pen', label: 'Phrasebook' },
  ];

  let theme = 'light';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/auth/login';
  }

  function setTheme(next: string) {
    theme = next;
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.toggle('dark', (themeModes[next] || 'light') === 'dark');
    localStorage.setItem('theme', next);
  }

  onMount(() => {
    const stored = localStorage.getItem('theme');
    if (stored && themeModes[stored]) {
      setTheme(stored);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  });
</script>

<div class="relative min-h-screen bg-slate-50 dark:bg-slate-900 lg:flex">
  <aside
    class="hidden w-72 flex-col border-0 bg-gradient-to-b from-teal-500 via-blue-500 to-indigo-600 text-white shadow-xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 lg:flex lg:shadow-none"
  >
    <div class="flex items-center justify-between border-b border-white/10 p-4">
      <a href="/dashboard" class="text-xl font-semibold">Misneach</a>
    </div>

    <nav class="flex-1 space-y-2 overflow-y-auto px-2 py-4">
      {#each navItems as item}
        <a href={item.href} class="flex items-center gap-3 rounded-lg p-3 transition hover:bg-white/10">
          <i data-lucide={item.icon} class="h-5 w-5"></i><span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="px-3 pb-3">
      <p class="mb-2 px-2 text-xs uppercase tracking-[0.12em] text-white/70">Theme</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          on:click={() => setTheme('light')}
          class={`rounded-lg border px-3 py-2 text-sm transition ${theme === 'light' ? 'border-white bg-white text-slate-900' : 'border-white/20 bg-white/10 text-white'}`}
        >
          Light
        </button>
        <button
          type="button"
          on:click={() => setTheme('dark')}
          class={`rounded-lg border px-3 py-2 text-sm transition ${theme === 'dark' ? 'border-white bg-white text-slate-900' : 'border-white/20 bg-white/10 text-white'}`}
        >
          Dark
        </button>
      </div>
    </div>

    <div class="border-t border-white/20 px-3 py-4">
      <button
        type="button"
        on:click={logout}
        class="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 transition hover:bg-white/15"
      >
        <i data-lucide="log-out" class="h-4 w-4 text-white"></i>
        <span>Log out</span>
      </button>
    </div>
  </aside>

  <div class="flex min-h-screen min-w-0 flex-1 flex-col">
    <header class="sticky top-0 z-[90] flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
      <a href="/dashboard" class="text-base font-semibold text-slate-900 dark:text-slate-100">Misneach</a>
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
        on:click={logout}
      >
        Log out
      </button>
    </header>

    <details class="sticky top-[57px] z-[85] border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
      <summary class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Menu
        <i data-lucide="chevron-down" class="h-4 w-4"></i>
      </summary>
      <nav class="grid grid-cols-1 gap-1 px-2 pb-3">
        {#each navItems as item}
          <a href={item.href} class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <i data-lucide={item.icon} class="h-4 w-4"></i>
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </details>

    <main class="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      {@render children()}
    </main>

    <footer class="mt-8 bg-gray-800 py-10 text-gray-300 dark:bg-slate-950">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
        <div>
          <h3 class="mb-4 text-xl font-semibold text-white">About</h3>
          <p>AI-powered Irish learning for English speakers.</p>
        </div>
        <div>
          <h3 class="mb-4 text-xl font-semibold text-white">Links</h3>
          <ul class="space-y-2">
            <li><a href="/auth/login" class="hover:text-white">Login</a></li>
            <li><a href="/privacy" class="hover:text-white">Privacy</a></li>
            <li><a href="/terms" class="hover:text-white">Terms</a></li>
          </ul>
        </div>
        <div>
          <h3 class="mb-4 text-xl font-semibold text-white">Contact</h3>
          <p>Email: support@decyphr.com</p>
          <p>Twitter: @decyphrapp</p>
        </div>
      </div>
      <div class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">© 2026 Misneach. All rights reserved.</div>
    </footer>
  </div>
</div>

<FocusWidget />
