export type TranslationDict = {
  global: {
    loading: string;
    themeToggle: string;
    light: string;
    dark: string;
    system: string;
    settings: string;
  };
  nav: {
    home: string;
    features: string;
    practice: string;
    pricing: string;
    chat: string;
    translate: string;
    lexicon: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  features: {
    translation: {
      title: string;
      description: string;
    };
    practice: {
      title: string;
      description: string;
    };
    tracking: {
      title: string;
      description: string;
    };
  };
  auth: {
    title: string;
    emailPlaceholder: string;
    signIn: string;
    sending: string;
    sent: string;
    error: string;
    signOut: string;
    loggedInAs: string;
    verifyRequestTitle: string;
    verifyRequestText: string;
    verifyRequestWaiting: string;
    magicLoginVerifying: string;
    magicLoginInvalidLinkError: string;
    magicLoginExpiredLinkError: string;
    firstTimeLoginTitle: string;
    firstLanguage: string;
    targetLanguage: string;
    immersionLevel: string;
    immersionNormal: string;
    immersionFull: string;
    saveSettings: string;
    selectLanguage: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    chat: {
      title: string;
      description: string;
      cta: string;
    };
    translation: {
      title: string;
      description: string;
      cta: string;
    };
    lexicon: {
      title: string;
      description: string;
      cta: string;
    };
  };
  translate: {
    title: string;
    inputPlaceholer: string;
    translateButton: string;
    translateButtonLoading: string;
    translateNoTranslations: string;
    translatePaginationPrev: string;
    translatePaginationNext: string;
    translatePaginationText: string;
  };
  lexicon: {
    title: string;
    table: {
      word: string;
      type: string;
      family: string;
      familiarity: string;
      revise: string;
      action: string;
    };
    noWords: string;
  };
};
