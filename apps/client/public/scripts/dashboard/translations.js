document.addEventListener('alpine:init', () => {
  Alpine.data('translationApp', () => ({
    text: '',
    loading: false,
    translations: [],
    pendingTranslation: false,
    page: 1,
    limit: 5,
    clientId: '',
    initialized: false,

    async init() {
      try {
        const sessionRes = await fetch('/auth/me');
        const session = await sessionRes.json();
        this.clientId = session.user?.clientId || '';

        await this.loadExistingTranslations();

        this.setupEventSource();

        this.initialized = true;
      } catch (error) {
        console.error('Initialization error:', error);
      }
    },

    // Load existing translations from server
    async loadExistingTranslations() {
      try {
        const response = await fetch(`/translations/list`);

        if (!response.ok) {
          throw new Error('Failed to load translations');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          this.translations = data.data.map(t => {
            return this.normalizeTranslation(t);
          });
        } else {
          this.translations = [];
        }
      } catch (error) {
        console.error('Error loading existing translations:', error);
        this.translations = [];
      }
    },

    normalizeTranslation(translation) {
      return {
        id: translation.id || this.generateUniqueId(),
        originalText: String(translation.originalText || ''),
        translatedText: String(translation.translatedText || ''),
        breakdown: Array.isArray(translation.breakdown) ? translation.breakdown : []
      };
    },

    setupEventSource() {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(`/translations/events/${this.clientId}`);

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (!message) return;

          this.$nextTick(() => {
            this.translations = [this.normalizeTranslation(message), ...this.translations];
            this.pendingTranslation = false;
          });
        } catch (error) {
          console.error('Error processing SSE message:', error);
          this.pendingTranslation = false;
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.pendingTranslation = false;
        setTimeout(() => this.setupEventSource(), 5000);
      };
    },

    generateUniqueId() {
      return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Safe paginated translations getter
    get paginatedTranslations() {
      if (!Array.isArray(this.translations)) {
        console.warn('Translations is not an array');
        return [];
      }

      const start = (this.page - 1) * this.limit;
      const end = start + this.limit;

      return this.translations
        .slice(start, end)
        .filter(t => t && typeof t === 'object');
    },

    get totalPages() {
      const length = Array.isArray(this.translations) ? this.translations.length : 0;
      return Math.max(1, Math.ceil(length / this.limit));
    },

    async submit() {
      if (!this.text.trim() || !this.clientId) return;

      this.loading = true;
      this.pendingTranslation = true;

      try {
        await fetch('/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.text,
            clientId: this.clientId
          }),
        });
        this.text = '';
      } catch (error) {
        console.error('Translation error:', error);
        this.pendingTranslation = false;
      } finally {
        this.loading = false;
      }
    },

    // Cleanup when component is removed
    destroy() {
      if (this.eventSource) {
        this.eventSource.close();
      }
    }
  }));
});