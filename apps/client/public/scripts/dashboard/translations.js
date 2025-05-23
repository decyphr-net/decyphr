document.addEventListener('alpine:init', () => {
  Alpine.data('translationApp', () => ({
    text: '',
    loading: false,
    translations: [],
    page: 1,
    limit: 5,
    clientId: '',

    async init() {
      const sessionRes = await fetch('/auth/me');
      const session = await sessionRes.json();
      this.clientId = session.user?.clientId || '';

      const eventSource = new EventSource(`/translations/${this.clientId}`);
      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(message);
        this.translations = [message, ...this.translations];
      };

      eventSource.onerror = (err) => {
        console.error('❌ SSE error', err);
      };
    },

    get paginatedTranslations() {
      const start = (this.page - 1) * this.limit;
      return this.translations.slice(start, start + this.limit);
    },

    get totalPages() {
      return Math.ceil(this.translations.length / this.limit);
    },

    async submit() {
      if (!this.text.trim() || !this.clientId) return;

      this.loading = true;

      await fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: this.text,
          clientId: this.clientId
        }),
      });

      this.text = '';
      this.loading = false;
    },
  }));
});