function translationApp() {
  return {
    /* ============================
       STATE
    ============================ */
    text: '',
    loading: false,
    pendingTranslation: false,
    translations: [],
    page: 1,
    limit: 5,
    clientId: '',
    eventSource: null,
    translationCache: {}, // NEW: stores merged translation+nlp by requestId

    /* ============================
       INITIALISATION
    ============================ */
    async init() {
      try {
        this.limit = Number(this.limit) || 5;

        const sessRes = await fetch('/auth/me');
        const sess = await sessRes.json();

        this.clientId = sess.user?.clientId?.trim();
        if (!this.clientId) throw new Error('clientId missing');

        await this.loadExistingTranslations();
        this.openSSE();
      } catch (e) {
        console.error('❌ init error:', e);
        this.pendingTranslation = false;
      }
    },

    /* ============================
       LOAD HISTORIC LIST
    ============================ */
    async loadExistingTranslations() {
      this.loading = true;
      try {
        const res = await fetch('/translations/list');
        if (!res.ok) throw new Error('Failed to fetch list');

        const payload = await res.json();
        const list = payload?.data ?? payload;

        if (!Array.isArray(list)) throw new Error('List payload not an array');

        // merge into cache
        list.forEach(item => {
          const id = item.id || item.requestId;
          this.translationCache[id] = { ...this.translationCache[id], ...item };
        });

        this.translations = Object.values(this.translationCache).map(item => this.normalizePayload(item));
        this.sortTranslations();
        console.log(this.translations)
      } catch (e) {
        console.error('❌ error loading list:', e);
        this.translations = [];
      } finally {
        this.loading = false;
      }
    },

    /* ============================
       SUBMIT NEW TRANSLATION
    ============================ */
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
          })
        });
        this.text = '';
      } catch (e) {
        console.error('❌ submit error:', e);
        this.pendingTranslation = false;
      } finally {
        this.loading = false;
      }
    },

    /* ============================
       SSE HANDLER
    ============================ */
    openSSE() {
      if (this.eventSource) {
        console.warn('SSE already open, skipping');
        return;
      }

      const url = `/translations/events/${this.clientId}`;
      console.info('🔗 Opening SSE →', url);

      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = ev => {
        try {
          const raw = JSON.parse(ev.data);
          console.log('raw:', raw);

          // Use backend ID or requestId, no fallback generation for backend translations
          const id = raw.translation?.id || raw.id || raw.requestId;
          if (!id) {
            console.warn('❌ Skipping event with no ID', raw);
            return;
          }
          console.log('id:', id);

          // Initialize cache if first time
          if (!this.translationCache[id]) {
            this.translationCache[id] = {
              id,
              originalText: '',
              translated: '',
              sentences: []
            };
          }

          const cached = this.translationCache[id];

          // Merge translation
          if (raw.translation) {
            cached.originalText = raw.translation.originalText || cached.originalText;
            cached.translated = raw.translation.translated || cached.translated;
            cached.createdAt = raw.translation.createdAt || cached.createdAt;
          }

          // Merge NLP sentences safely
          if (raw.nlp?.sentences) {
            cached.sentences = raw.nlp.sentences.map(s => ({
              ...s,
              tokens: Array.isArray(s.tokens) ? s.tokens : []
            }));
          }

          // Guarantee sentences is always an array
          if (!Array.isArray(cached.sentences)) cached.sentences = [];

          // Normalize for template
          const entry = this.normalizePayload(cached);

          Alpine.nextTick(() => {
            const idx = this.translations.findIndex(t => t.id === entry.id);
            if (idx >= 0) {
              Object.assign(this.translations[idx], entry);
            } else {
              this.translations.unshift(entry);
            }

            this.sortTranslations();

            // Show spinner only if any translation missing
            this.pendingTranslation = Object.values(this.translationCache).some(t => !t.translated);
          });

        } catch (err) {
          console.error('❌ SSE parsing error:', err);
        }
      };

      this.eventSource.onerror = err => {
        console.error('❌ SSE error →', err);
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Retry after 5s
        setTimeout(() => this.openSSE(), 5000);
      };
    },

    /* ============================
       NORMALISATION
    ============================ */
    normalizePayload(raw) {
      const tr = raw.translation || raw;

      const sentences = Array.isArray(raw.sentences)
        ? raw.sentences.map(s => ({ ...s, tokens: Array.isArray(s.tokens) ? s.tokens : [] }))
        : [];

      // Flatten all tokens for easy template use
      const flatTokens = sentences.flatMap(s => s.tokens);

      return {
        id: tr.id || tr.requestId,
        originalText: tr.originalText || '',
        translated: tr.translated || '',
        createdAt: tr.createdAt || new Date().toISOString(),
        sentences,
        flatTokens
      };
    },

    sortTranslations() {
      this.translations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    generateUniqueId() {
      return `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /* ============================
       PAGINATION
    ============================ */
    get paginatedTranslations() {
      const start = (this.page - 1) * this.limit;
      const end = start + this.limit;
      return this.translations.slice(start, end);
    },

    get totalPages() {
      return Math.max(1, Math.ceil(this.translations.length / this.limit));
    },

    /* ============================
       CLEANUP
    ============================ */
    destroy() {
      if (this.eventSource) this.eventSource.close();
    }
  };
}
