document.addEventListener('alpine:init', () => {
  Alpine.data('dashboard', () => ({
    stats: [],

    init() {
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
    }
  }))
});