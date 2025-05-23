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
      return this.languages.filter((lang) => lang.value !== this.firstLanguage);
    },

    init() {
      const filtered = this.languages.filter(
        (lang) => lang.value !== this.firstLanguage,
      );
      if (filtered.length > 0) {
        this.targetLanguage = filtered[0].value;
      }

      const params = new URLSearchParams(window.location.search);
      const prefill = params.get('email');
      if (prefill) this.email = prefill;
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

      if (res.redirected) {
        window.location.href = res.url;
      }
    },
  };
};
