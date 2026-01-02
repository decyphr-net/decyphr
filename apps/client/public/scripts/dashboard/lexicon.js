document.addEventListener('alpine:init', () => {
  Alpine.data('lexiconPage', () => ({
    snapshot: [],
    loading: true,

    pageSize: 20,
    currentPage: 1,

    searchTerm: '',
    sortKey: 'lemma',
    sortDir: 'asc',

    // ---------------- Counters ----------------
    get highCount() {
      return this.snapshot.filter(i => Number(i.stats?.score) > 0.8).length;
    },
    get mediumCount() {
      return this.snapshot.filter(i => {
        const s = Number(i.stats?.score);
        return s > 0.5 && s <= 0.8;
      }).length;
    },
    get lowCount() {
      return this.snapshot.filter(i => Number(i.stats?.score) <= 0.5).length;
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

        const aVal = (a[key] ?? '').toLowerCase();
        const bVal = (b[key] ?? '').toLowerCase();
        return aVal.localeCompare(bVal) * dir;
      });
    },

    setSort(key) {
      this.sortDir = this.sortKey === key
        ? (this.sortDir === 'asc' ? 'desc' : 'asc')
        : 'asc';

      this.sortKey = key;
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
      const end = Math.min(
        this.currentPage * this.pageSize,
        this.filteredData.length
      );
      return `${start}-${end} of ${this.filteredData.length}`;
    },

    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    },
    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    },

    scrollToSection(id) {
      const el = document.getElementById(id);
      if (!el) return;

      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    },

    // ---------------- Init ----------------
    async init() {
      try {
        const res = await fetch('/auth/me');
        const sess = await res.json();
        this.clientId = sess.user?.clientId?.trim();

        if (!this.clientId) {
          console.warn('clientId missing');
          this.loading = false;
          return;
        }

        await this.loadSnapshot(this.clientId);
      } finally {
        this.loading = false;
      }
    },

    async loadSnapshot(id) {
      try {
        const res = await fetch(`/snapshot/${id}`);
        this.snapshot = await res.json();
        this.currentPage = 1;
      } catch (err) {
        console.error('Failed to load snapshot:', err);
        this.snapshot = [];
      }
    }
  }));
});
