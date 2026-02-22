export function dashboardSidebar() {
  return {
    /* ----- state ----- */
    sidebarOpen: false, // true = sidebar visible (overlay on mobile)

    /* ----- helpers ----- */
    isMobile() {
      return window.innerWidth < 768;
    },

    /* ----- toggle ----- */
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
      if (!this.isMobile()) {
        localStorage.setItem('sidebarOpen', this.sidebarOpen);
      }
    },
    toggle() {
      this.toggleSidebar();
    }, // Ctrl + B shortcut

    /* ----- init ----- */
    init() {
      const saved = localStorage.getItem('sidebarOpen');
      this.sidebarOpen = saved === 'true';
    },

    /* ----- navigation data ----- */
    navSections: [
      {
        title: 'Home',
        items: [
          { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
        ],
      },
      {
        title: 'Speaking & Writing',
        items: [
          { id: 'chat', label: 'Chat', href: '/chat', icon: 'bot' },
          { id: 'pomodoro', label: 'Pomodoro', href: '/pomodoro', icon: 'clock-3' },
        ],
      },
      {
        title: 'Vocabulary',
        items: [
          {
            id: 'lexicon',
            label: 'Lexicon',
            href: '/lexicon',
            icon: 'list',
          },
          {
            id: 'phrasebook',
            label: 'Phrasebook',
            href: '/phrasebook',
            icon: 'archive',
          },
          {
            id: 'flashcards',
            label: 'Flashcards',
            href: '/flashcards',
            icon: 'credit-card',
          },
        ],
      },
      {
        title: 'Tools',
        items: [
          {
            id: 'tools-translation',
            label: 'Translation Tool',
            href: '/translations',
            icon: 'languages',
          },
        ],
      },
    ],

    isActive(item) {
      const cur = window.location.pathname.replace(/\/+$/, '');
      const href = item.href.replace(/\/+$/, '');
      return cur === href;
    },

    async logout() {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      Alpine.store('auth').user = null;
      window.location.href = '/auth/login';
    },
  };
}
