document.addEventListener('alpine:init', () => {
  Alpine.data('lexiconPage', () => ({
    // ---------------- State ----------------
    snapshot: [],
    loading: true,
    clientId: null,
    cefr: { level: '-', confidence: 0 },

    pageSize: 20,
    currentPage: 1,

    searchTerm: '',
    sortKey: 'lemma',
    sortDir: 'asc',

    showImport: false,
    importText: '',
    flashcardModalOpen: false,
    flashcardModalLoading: false,
    flashcardDecks: [],
    flashcardForm: {
      deckId: '',
      newDeckName: '',
      front: '',
      back: '',
      notes: '',
    },

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

    goToPage(page) {
      const p = Number(page);
      if (!Number.isInteger(p)) return;

      if (p >= 1 && p <= this.totalPages) {
        this.currentPage = p;
      }
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

    async openCreateFlashcardModal(item) {
      try {
        const decksRes = await fetch('/flashcards/decks', { cache: 'no-store' });
        if (!decksRes.ok) throw new Error('Failed to load decks');
        const frontText = (item.word || item.lemma || '').trim();
        if (!frontText) {
          alert('This lexicon row has no word text to use as card front');
          return;
        }

        const notesParts = [];
        if (item.pos) notesParts.push(`POS: ${item.pos}`);
        if (item.stats?.score != null) {
          notesParts.push(`Lexicon confidence: ${Number(item.stats.score).toFixed(2)}`);
        }

        this.flashcardDecks = await decksRes.json();
        this.flashcardForm = {
          deckId: this.flashcardDecks[0] ? String(this.flashcardDecks[0].id) : '__new__',
          newDeckName: this.flashcardDecks[0] ? '' : 'Lexicon',
          front: frontText,
          back: '',
          notes: notesParts.join(' | '),
        };
        this.flashcardModalOpen = true;
      } catch (err) {
        console.error('Failed to open lexicon flashcard modal', err);
        alert('Failed to load decks');
      }
    },

    closeFlashcardModal() {
      this.flashcardModalOpen = false;
      this.flashcardModalLoading = false;
    },

    async submitFlashcardFromLexicon() {
      this.flashcardModalLoading = true;
      try {
        let deckId = this.flashcardForm.deckId;
        if (!deckId) throw new Error('Please select a deck');

        if (deckId === '__new__') {
          const newDeckName = (this.flashcardForm.newDeckName || '').trim();
          if (!newDeckName) throw new Error('New deck name is required');

          const createRes = await fetch('/flashcards/decks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newDeckName,
              description: 'Cards created from lexicon entries',
              language: 'ga',
            }),
          });
          if (!createRes.ok) throw new Error('Failed to create deck');
          const createdDeck = await createRes.json();
          deckId = String(createdDeck.id);
        }

        const front = (this.flashcardForm.front || '').trim();
        const back = (this.flashcardForm.back || '').trim();
        if (!front || !back) throw new Error('Front and back are required');

        const cardRes = await fetch(`/flashcards/decks/${deckId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            front,
            back,
            notes: this.flashcardForm.notes || undefined,
          }),
        });
        if (!cardRes.ok) throw new Error('Failed to create flashcard');

        this.closeFlashcardModal();
        alert('Flashcard created');
      } catch (err) {
        console.error('Failed to create flashcard from lexicon item', err);
        alert(err.message || 'Failed to create flashcard');
      } finally {
        this.flashcardModalLoading = false;
      }
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
      maybeStartLexiconTour();
    }
  }));
});

function startLexiconTour() {
  const tour = new tourguide.TourGuideClient({
    showProgress: true,
    showCloseButton: true,
    keyboardControls: true,
    overlayOpacity: 0.6,
    steps: [
      {
        target: "[data-tour='lexicon-hero']",
        title: t("lexicon.tour.hero.title"),
        content: t("lexicon.tour.hero.body"),
      },
      {
        target: "[data-tour='lexicon-stats']",
        title: t("lexicon.tour.stats.title"),
        content: t("lexicon.tour.stats.body"),
      },
      {
        target: "[data-tour='lexicon-cefr']",
        title: t("lexicon.tour.cefr.title"),
        content: t("lexicon.tour.cefr.body"),
      },
      {
        target: "[data-tour='lexicon-controls']",
        title: t("lexicon.tour.controls.title"),
        content: t("lexicon.tour.controls.body"),
      },
      {
        target: "[data-tour='lexicon-table']",
        title: t("lexicon.tour.table.title"),
        content: t("lexicon.tour.table.body"),
      },
      {
        target: "[data-tour='lexicon-pagination']",
        title: t("lexicon.tour.pagination.title"),
        content: t("lexicon.tour.pagination.body"),
      },
      {
        target: "[data-tour='lexicon-controls'] button",
        title: t("lexicon.tour.import.title"),
        content: t("lexicon.tour.import.body"),
      },
    ],
  });

  tour.start();
}

function maybeStartLexiconTour() {
  if (localStorage.getItem("lexiconTourSeen")) return;

  startLexiconTour();
  localStorage.setItem("lexiconTourSeen", "true");
}

function tooltip() {
  return {
    open: false,
    toggle() {
      this.open = !this.open;
    },
    close() {
      this.open = false;
    }
  };
}
