/* ============================================================
   layout.js – all Alpine stores, socket listeners, helpers
   ============================================================ */

/* ------------------------------------------------------------
   1️⃣  Dashboard Sidebar store (adds `practiceFlyoutOpen`)
   ------------------------------------------------------------ */
function dashboardSidebar() {
  return {
    sidebarOpen: true,
    languageFlyoutOpen: false,
    practiceFlyoutOpen: false,   // <-- NEW FLAG for the fly‑out

    navItems: [
      { id: 'chat', label: 'Practice', href: '#chat', icon: 'message-circle' },
      { id: 'translations', label: 'Translations', href: '#translations', icon: 'languages' },
      { id: 'lexicon', label: 'Lexicon', href: '#lexicon', icon: 'book-open' },
      { id: 'progress', label: 'Progress', href: '#progress', icon: 'bar-chart-2' }
    ],

    activeSection: '',
    scrollToSection(id) {
      this.activeSection = id;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    },

    init() {
      // -------------------------------------------------
      // Keep `activeSection` in sync with scrolling
      // -------------------------------------------------
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.activeSection = entry.target.id;
        });
      }, { threshold: 0.6 });

      this.navItems.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });

      // -------------------------------------------------
      // Language fly‑out positioning (unchanged)
      // -------------------------------------------------
      this.$watch('languageFlyoutOpen', open => {
        if (open) this.positionLanguageFlyout();
      });
      window.addEventListener('resize', () => {
        if (this.languageFlyoutOpen) this.positionLanguageFlyout();
      });
    },

    // -----------------------------------------------------------------
    // Language fly‑out positioning (exactly as you had it before)
    // -----------------------------------------------------------------
    positionLanguageFlyout() {
      const flyout = this.$refs.languageFlyout;
      const button = this.$refs.languageButton;
      if (!flyout || !button) return;
      const rect = button.getBoundingClientRect();

      const left = this.sidebarOpen ? rect.right + 4 : rect.left + 4;
      let top = rect.bottom + window.scrollY;
      const flyoutHeight = flyout.offsetHeight || 300;
      const viewportHeight = window.innerHeight;
      const viewportBottom = window.scrollY + viewportHeight;

      if (top + flyoutHeight > viewportBottom) {
        top = rect.top + window.scrollY - flyoutHeight;
      }
      if (top < window.scrollY) top = window.scrollY;

      flyout.style.top = `${top}px`;
      flyout.style.left = `${left}px`;
    },

    // -----------------------------------------------------------------
    // Dummy logout – keep your real implementation
    // -----------------------------------------------------------------
    async logout() {
      try {
        const resp = await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        if (!resp.ok) throw new Error('Logout failed');
        Alpine.store('auth').user = null;
        window.location.href = '/auth/login';
      } catch (e) {
        console.error(e);
      }
    }
  };
}

/* ------------------------------------------------------------
   2️⃣  Global Practice Store – accessible from ANY page
   ------------------------------------------------------------ */
Alpine.store('practice', {
  // -------------------  State -------------------
  timerRunning: false,
  elapsedSec: 0,
  paused: false,
  canAdvance: true,          // you can tighten this later

  // Private timer ID (not exposed)
  _timerId: null,

  // -------------------  Public API -------------------
  /**
   * Start a practice session.
   * `info` should contain:
   *   {
   *     steps:          ['chat','translate','quiz'],
   *     currentIdx:     0,
   *     maxSecondsPerStep: 45   // optional, omit for untimed steps
   *   }
   */
  start(info) {
    this.timerRunning = !!info.maxSecondsPerStep;
    this.elapsedSec = 0;
    this.paused = false;
    this.canAdvance = true;
    // Store the meta data we need for UI (steps, currentIdx, timer)
    this.steps = info.steps || [];
    this.currentIdx = info.currentIdx || 0;
    this.maxSecondsPerStep = info.maxSecondsPerStep || null;
    this._startTimer(this.maxSecondsPerStep);
  },

  /** End the current session (finished or aborted) */
  stop() {
    this._stopTimer();
    this.timerRunning = false;
    this.elapsedSec = 0;
    this.paused = false;
    this.canAdvance = false;
    this.steps = [];
    this.currentIdx = 0;
    this.maxSecondsPerStep = null;
  },

  /** Pause / resume the timer */
  togglePause() {
    if (!this.timerRunning) return;
    this.paused = !this.paused;
    if (this.paused) this._stopTimer();
    else this._startTimer(this.maxSecondsPerStep);
  },

  /** Advance to the next step (user clicks “Next”) */
  next() {
    if (!this.canAdvance) return;
    this._stopTimer();          // stop current timer

    // -------------------------------------------------
    // Tell the back‑end we want the next step.
    // Adjust the event name / payload to match your API.
    // -------------------------------------------------
    const socket = io('http://127.0.0.1:8000'); // same endpoint you already use
    socket.emit('practice-next', {
      // You may want to include a sessionId, currentIdx, etc.
      // For a generic example we just send an action flag:
      action: 'next',
      currentIdx: this.currentIdx
    });

    // UI will be refreshed when the server sends back the new step
    // (see the socket listener further down).
  },

  // -------------------  Internal timer helpers -------------------
  _startTimer(maxSeconds) {
    if (!maxSeconds) return;          // untimed step
    this._stopTimer();                 // safety net
    this._timerId = setInterval(() => {
      if (this.paused) return;
      this.elapsedSec++;
      // Auto‑advance when the limit is reached (optional)
      if (this.elapsedSec >= maxSeconds) {
        this.next();                  // move forward automatically
      }
    }, 1000);
  },

  _stopTimer() {
    clearInterval(this._timerId);
    this._timerId = null;
  }
});

/* ------------------------------------------------------------
   3️⃣  Socket listener – receives the next‑step payload
   ------------------------------------------------------------ */
document.addEventListener('alpine:init', () => {
  const socket = io('http://127.0.0.1:8000');

  // Expected payload from the server:
  // {
  //   steps: ['chat','translate','quiz'],
  //   currentIdx: 1,
  //   maxSecondsPerStep: 30   // optional
  // }
  socket.off('practice-next');
  socket.on('practice-next', data => {
    const practice = Alpine.store('practice');

    // Replace the steps array if the server sent a new one
    if (Array.isArray(data.steps)) practice.steps = data.steps;

    // Update the current index (fallback to 0 if undefined)
    practice.currentIdx = data.currentIdx ?? 0;

    // Update timer for the new step
    if (data.maxSecondsPerStep) {
      practice.timerRunning = true;
      practice.maxSecondsPerStep = data.maxSecondsPerStep;
      practice._startTimer(data.maxSecondsPerStep);
    } else {
      practice.timerRunning = false;
      practice.maxSecondsPerStep = null;
      practice._stopTimer();
    }

    // Reset elapsed seconds and pause flag for the new step
    practice.elapsedSec = 0;
    practice.paused = false;
    practice.canAdvance = true;
  });
});

/* ------------------------------------------------------------
   4️⃣  Helper API – expose methods for any page component
   ------------------------------------------------------------ */
window.practiceAPI = {
  /**
   * Call from any page component to start a session.
   * `info` must match the shape expected by the store.start():
   *   {
   *     steps: ['chat','translate','quiz'],
   *     currentIdx: 0,
   *     maxSecondsPerStep: 45   // optional
   *   }
   */
  startSession(info) {
    Alpine.store('practice').start(info);
  },

  /** Stop the current session */
  stopSession() {
    Alpine.store('practice').stop();
  },

  /** Toggle pause / resume */
  togglePause() {
    Alpine.store('practice').togglePause();
  },

  /** Advance to the next step */
  nextStep() {
    Alpine.store('practice').next();
  }
};