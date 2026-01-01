window.firstLoginForm = function () {
  return {
    languages: [
      { value: 'en', label: 'English' },
      { value: 'ga', label: 'Gaeilge' },
      { value: 'pt', label: 'Português' },
    ],

    firstLanguage: localStorage.getItem('language') || 'en',
    targetLanguage: '',
    immersionLevel: 'normal',

    get filteredLanguages() {
      return this.languages.filter(
        lang => lang.value !== this.firstLanguage
      );
    },

    init() {
      // Validate first language
      if (!this.languages.some(l => l.value === this.firstLanguage)) {
        this.firstLanguage = 'en';
      }

      // Initial target language
      this.updateTargetLanguage(this.firstLanguage);

      // React to changes
      this.$watch('firstLanguage', (value) => {
        this.updateTargetLanguage(value);
      });
    },

    updateTargetLanguage(firstLang) {
      const available = this.languages.filter(
        lang => lang.value !== firstLang
      );

      this.targetLanguage = available.length
        ? available[0].value
        : '';
    },

    async submit() {
      const body = {
        firstLanguage: this.firstLanguage,
        targetLanguage: this.targetLanguage,
        immersionLevel: this.immersionLevel,
      };

      const res = await fetch('/auth/first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.redirect) {
        window.location.href = data.redirect;
      }
    },
  };
};
