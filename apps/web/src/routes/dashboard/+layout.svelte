<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import FocusWidget from '$lib/components/focus/FocusWidget.svelte';

  let { children } = $props();
  const themeModes: Record<string, 'light' | 'dark'> = {
    light: 'light',
    dark: 'dark',
  };

  const navGroups = [
    {
      label: 'Goals',
      items: [
        { href: '/dashboard/goals', icon: 'target', label: 'Goals' },
        { href: '/dashboard/study', icon: 'crosshair', label: 'Focus' },
        { href: '/dashboard/pomodoro', icon: 'timer', label: 'Pomodoro' },
      ],
    },
    {
      label: 'Training',
      items: [
        { href: '/dashboard/practice', icon: 'brain', label: 'Practice' },
        { href: '/dashboard/practice#mistakes-hub', icon: 'triangle-alert', label: 'Mistakes' },
        { href: '/dashboard/flashcards/study', icon: 'layers', label: 'Flashcards' },
      ],
    },
    {
      label: 'Vocab',
      items: [
        { href: '/dashboard/lexicon', icon: 'book-open-check', label: 'Lexicon' },
        { href: '/dashboard/phrasebook', icon: 'notebook-pen', label: 'Phrasebook' },
      ],
    },
  ];

  const mobileDockGroups = [
    { href: '/dashboard', icon: 'route', label: 'Journey' },
    { href: '/dashboard/goals', icon: 'target', label: 'Goals' },
    { href: '/dashboard/practice', icon: 'brain', label: 'Training' },
    { href: '/dashboard/lexicon', icon: 'book-open-check', label: 'Vocab' },
  ];

  let theme = 'light';

  function routeSlideX(pathname: string) {
    if (pathname === '/dashboard/phrasebook') return 22;
    if (pathname === '/dashboard/lexicon') return -22;
    return 14;
  }

  function isDockActive(href: string) {
    const pathname = page.url.pathname;
    const target = href.split('#')[0];
    if (target === '/dashboard') return pathname === '/dashboard';
    return pathname === target || pathname.startsWith(`${target}/`);
  }

  function dockTone(label: string) {
    if (label === 'Journey') return { active: 'from-amber-400 to-yellow-300', icon: 'bg-amber-500/20 text-amber-700' };
    if (label === 'Goals') return { active: 'from-emerald-500 to-teal-400', icon: 'bg-emerald-500/20 text-emerald-700' };
    if (label === 'Training') return { active: 'from-sky-500 to-cyan-400', icon: 'bg-sky-500/20 text-sky-700' };
    if (label === 'Vocab') return { active: 'from-indigo-500 to-blue-500', icon: 'bg-indigo-500/20 text-indigo-700' };
    return { active: 'from-slate-500 to-slate-400', icon: 'bg-slate-500/20 text-slate-700' };
  }

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

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {#each navGroups as group}
        <section class="space-y-1.5">
          <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">{group.label}</p>
          {#each group.items as item}
            <a href={item.href} class="flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-white/10">
              <i data-lucide={item.icon} class="h-4 w-4"></i><span>{item.label}</span>
            </a>
          {/each}
        </section>
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
    <main class="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
      {#key page.url.pathname}
        <div
          in:fly={{ x: routeSlideX(page.url.pathname), duration: 220, opacity: 0.2 }}
          out:fade={{ duration: 120 }}
        >
          {@render children()}
        </div>
      {/key}
    </main>

    <footer class="mt-8 bg-gray-800 py-10 pb-28 text-gray-300 dark:bg-slate-950 lg:pb-10">
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

<nav
  class="fixed inset-x-0 bottom-0 z-[95] border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
  aria-label="Dashboard mobile dock"
>
  <div class="mx-auto grid w-full max-w-xl grid-cols-5 gap-2">
    {#each mobileDockGroups as item}
      {@const active = isDockActive(item.href)}
      {@const tone = dockTone(item.label)}
      <a
        href={item.href}
        class={`inline-flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
          active
            ? `bg-gradient-to-br ${tone.active} text-slate-900 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.65)]`
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        <span class={`inline-flex h-7 w-7 items-center justify-center rounded-full ${active ? 'bg-white/80 text-slate-900' : tone.icon}`}>
          <i data-lucide={item.icon} class="h-4 w-4"></i>
        </span>
        <span class="text-[11px] font-semibold">{item.label}</span>
      </a>
    {/each}
    <button
      type="button"
      class="inline-flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      on:click={logout}
    >
      <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300">
        <i data-lucide="user" class="h-4 w-4"></i>
      </span>
      <span class="text-[11px] font-semibold">Log out</span>
    </button>
  </div>
</nav>

<FocusWidget />
