document.addEventListener('alpine:init', () => {
  Alpine.data('dashboard', () => ({
    stats: [],
    practiceDuration: 5,
    activeSection: '',

    init() {
      this.initStats();
      this.initScrollSpy();
      if (window.lucide) window.lucide.createIcons();
    },

    initStats() {
      const t = Alpine.store('i18n').t;
      const finalValues = [234, 17, 112, 86, 29, 10];

      this.stats = [
        { value: 0, label: t('dashboard.stats.chatMessages'), icon: 'lucide-message-circle' },
        { value: 0, label: t('dashboard.stats.wordsToPractice'), icon: 'lucide-book-open' },
        { value: 0, label: t('dashboard.stats.wordsMastered'), icon: 'lucide-award' },
        { value: 0, label: t('dashboard.stats.translations'), icon: 'lucide-translate' },
        { value: 0, label: t('dashboard.stats.conversations'), icon: 'lucide-bot' },
        { value: 0, label: t('dashboard.stats.books'), icon: 'lucide-book' },
      ];

      this.stats.forEach((stat, index) => {
        let count = 0;
        const interval = setInterval(() => {
          if (count >= finalValues[index]) {
            stat.value = finalValues[index];
            clearInterval(interval);
          } else {
            count += Math.ceil(finalValues[index] / 50);
            stat.value = count;
          }
        }, 20);
      });
    },

    initScrollSpy() {
      const sections = document.querySelectorAll('section[data-section]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.activeSection = entry.target.dataset.section;
          }
        });
      }, { threshold: 0.5 });

      sections.forEach(section => observer.observe(section));
    }
  }));
});

function dashboardState() {
  return {
    learningState: {
      vocab: 'Strong in A1–A2 vocabulary',
      comprehension: 'Developing B1 comprehension',
      production: 'Needs work on sentence production',
      lastActive: '2 hours ago',
    },

    continueHint: 'Review 7 weak words and practice 2 sentences',

    continuePractice() {
      // Temporary routing logic
      // Later this can be server-driven
      window.location.href = '/lexicon?mode=review';
    },
  }
}