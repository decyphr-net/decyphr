window.firstLoginForm = function () {
  return {
    languages: [
      { value: 'en', label: 'English' },
      { value: 'ga', label: 'Gaeilge' },
      { value: 'pt', label: 'Português' },
    ],

    firstLanguage: '',
    targetLanguage: '',
    immersionLevel: 'normal',

    get filteredLanguages() {
      return this.languages.filter(
        (lang) => lang.value !== this.firstLanguage
      );
    },

    init() {
      // If UI language exists, *suggest* it — don't force it
      const uiLang = localStorage.getItem('language');
      if (uiLang && this.languages.some(l => l.value === uiLang)) {
        this.firstLanguage = uiLang;
      }
    },

    $watch: {
      firstLanguage(value) {
        const available = this.languages.filter(
          (lang) => lang.value !== value
        );
        this.targetLanguage = available.length ? available[0].value : '';
      }
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
