document.addEventListener('alpine:init', () => {
  Alpine.data('lexiconPage', () => ({
    // ---------------- State ----------------
    snapshot: [],
    loading: true,
    clientId: null,

    pageSize: 20,
    currentPage: 1,

    searchTerm: '',
    sortKey: 'lemma',
    sortDir: 'asc',

    showImport: false,
    importText: '',

    // ---------------- Counters ----------------
    get highCount() {
      return this.snapshot.filter(i => Number(i.stats?.score ?? 0) > 0.8).length;
    },
    get mediumCount() {
      return this.snapshot.filter(i => {
        const s = Number(i.stats?.score ?? 0);
        return s > 0.5 && s <= 0.8;
      }).length;
    },
    get lowCount() {
      return this.snapshot.filter(i => Number(i.stats?.score ?? 0) <= 0.5).length;
    },

    // ---------------- Filtering + Sorting ----------------
    get filteredData() {
      const term = this.searchTerm.trim().toLowerCase();
      let data = this.snapshot;

      if (term) {
        data = data.filter(i =>
          i.lemma?.toLowerCase().includes(term) ||
          i.normalised?.toLowerCase().includes(term)
        );
      }

      const dir = this.sortDir === 'asc' ? 1 : -1;
      const key = this.sortKey;

      return [...data].sort((a, b) => {
        if (key === 'score') {
          return (Number(a.stats?.score ?? 0) - Number(b.stats?.score ?? 0)) * dir;
        }

        if (key === 'cefr') {
          const levels = ['A1','A2','B1','B2','C1','C2'];
          const aIdx = levels.indexOf(a.cefr?.level ?? '') ?? -1;
          const bIdx = levels.indexOf(b.cefr?.level ?? '') ?? -1;
          return (aIdx - bIdx) * dir;
        }

        const aVal = (a[key] ?? '').toLowerCase();
        const bVal = (b[key] ?? '').toLowerCase();
        return aVal.localeCompare(bVal) * dir;
      });
    },

    setSort(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortDir = 'asc';
      }
      this.currentPage = 1;
    },

    // ---------------- Pagination ----------------
    get totalPages() {
      return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
    },
    get paginatedData() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredData.slice(start, start + this.pageSize);
    },
    get rangeLabel() {
      if (!this.filteredData.length) return '0 entries';
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, this.filteredData.length);
      return `${start}-${end} of ${this.filteredData.length}`;
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    },
    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    },

    // ---------------- Import ----------------
    get parsedWords() {
      return this.importText
        .split(/[\n,]+/)
        .map(w => w.trim())
        .filter(Boolean);
    },
    async submitImport() {
      if (!this.parsedWords.length) return;

      await fetch('/lexicon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: this.parsedWords })
      });

      this.showImport = false;
      this.importText = '';
      await this.loadSnapshot(this.clientId);
    },

    // ---------------- Load Snapshot ----------------
    async loadSnapshot(id) {
      try {
        const res = await fetch(`/snapshot/${id}`);
        const data = await res.json();

        this.snapshot = Array.isArray(data.snapshot) ? data.snapshot : [];
        this.cefr = data.cefr ?? { level: '-', confidence: 0 };
        this.currentPage = 1;
      } catch (err) {
        console.error('Failed to load snapshot:', err);
        this.snapshot = [];
        this.cefr = { level: '-', confidence: 0 };
      }
    },

    // ---------------- Init ----------------
    async init() {
      try {
        const res = await fetch('/auth/me');
        const sess = await res.json();
        this.clientId = sess.user?.clientId?.trim();

        if (!this.clientId) {
          console.warn('clientId missing');
          return;
        }

        await this.loadSnapshot(this.clientId);
      } finally {
        this.loading = false;
      }
    }
  }));
});
