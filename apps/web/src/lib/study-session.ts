export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export type StudyCatalogLesson = {
  lessonSlug: string;
  lessonTitle: string;
  order: number;
  estimatedMinutes: number;
  progress: {
    status: LessonStatus;
    progressPercent: number;
    lastBlockId: string | null;
    lastSeenAt?: string | null;
  };
};

export type StudyCatalogCourse = {
  courseSlug: string;
  courseTitle: string;
  lessons: StudyCatalogLesson[];
  summaryProgress?: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
};

export type StudyDeck = {
  id: number;
  name: string;
  dueCount?: number;
};

export type StudySessionStatus = 'active' | 'completed' | 'ended';
export type StudyStep = 'lessons' | 'practice' | 'flashcards';

export type StudySession = {
  id: string;
  ownerClientId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  endedAt: string | null;
  status: StudySessionStatus;
  minutes: number;
  targets: {
    lessons: number;
    practice: number;
    flashcards: number;
  };
  progress: {
    lessonsCompleted: number;
    practiceCompleted: number;
    flashcardsCompleted: number;
    lessonsSkipped: boolean;
    practiceSkipped: boolean;
    flashcardsSkipped: boolean;
  };
  activeCourse: {
    courseSlug: string;
    courseTitle: string;
  } | null;
  lessonPlan: {
    lessonSlugs: string[];
    baselineCompletedLessons: number;
  };
  scope: {
    flashcards: {
      scopedPackIds: number[];
      globalFill: boolean;
    };
  };
  dueSnapshot: {
    practice: number;
    flashcards: number;
  };
};

export type CreateStudySessionInput = {
  minutes: number;
  courses: StudyCatalogCourse[];
  decks: StudyDeck[];
  duePracticeCount: number;
  dueFlashcardsCount: number;
  ownerClientId?: string | null;
};

export type CreateStudySessionOutput = {
  session: StudySession;
  initialHref: string;
  warning: string | null;
};

const STORAGE_PREFIX = 'decyphr.studySession.v1';
const CURRENT_POINTER_KEY = 'decyphr.studySession.current';

function nowIso() {
  return new Date().toISOString();
}

function normalizeOwnerClientId(value?: string | null) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function sessionStorageKey(id: string) {
  return `${STORAGE_PREFIX}:${id}`;
}

function generateStudySessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampStudyMinutes(raw: number) {
  const value = Number.isFinite(raw) ? Math.round(raw) : 20;
  return Math.max(5, Math.min(90, value));
}

export function getStudyTargetsForMinutes(minutes: number) {
  const clamped = clampStudyMinutes(minutes);
  if (clamped < 10) return { lessons: 0, practice: 4, flashcards: 4 };
  if (clamped < 20) return { lessons: 1, practice: 6, flashcards: 6 };
  if (clamped < 30) return { lessons: 1, practice: 8, flashcards: 8 };
  if (clamped < 45) return { lessons: 2, practice: 10, flashcards: 10 };
  return { lessons: 3, practice: 12, flashcards: 12 };
}

function isLessonStarted(lesson: StudyCatalogLesson) {
  return (
    lesson.progress.status !== 'not_started' ||
    lesson.progress.progressPercent > 0 ||
    Boolean(lesson.progress.lastSeenAt)
  );
}

function timestampSafe(value?: string | null) {
  return Date.parse(value || '') || 0;
}

export function pickActiveCourse(courses: StudyCatalogCourse[]) {
  const startedCourses = courses.filter((course) => course.lessons.some((lesson) => isLessonStarted(lesson)));
  if (startedCourses.length === 0) return null;

  return startedCourses
    .slice()
    .sort((a, b) => {
      const aLastSeen = Math.max(...a.lessons.map((lesson) => timestampSafe(lesson.progress.lastSeenAt)));
      const bLastSeen = Math.max(...b.lessons.map((lesson) => timestampSafe(lesson.progress.lastSeenAt)));
      if (aLastSeen !== bLastSeen) return bLastSeen - aLastSeen;
      const aPercent = a.summaryProgress?.percent ?? 0;
      const bPercent = b.summaryProgress?.percent ?? 0;
      return bPercent - aPercent;
    })[0];
}

function completedLessonCount(course: StudyCatalogCourse) {
  return course.lessons.filter((lesson) => lesson.progress.status === 'completed').length;
}

function nextIncompleteLessons(course: StudyCatalogCourse) {
  return course.lessons
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((lesson) => lesson.progress.status !== 'completed');
}

function lessonWithinFeasibility(minutes: number, lesson: StudyCatalogLesson | undefined) {
  if (!lesson) return false;
  return lesson.estimatedMinutes <= Math.floor(clampStudyMinutes(minutes) * 0.6);
}

function scopedDeckIds(courseTitle: string | null, decks: StudyDeck[]) {
  if (!courseTitle) return [];
  const prefix = `Unit: ${courseTitle} •`;
  return decks.filter((deck) => deck.name.startsWith(prefix)).map((deck) => deck.id);
}

export function appendStudySessionQuery(href: string, studySessionId: string | null | undefined) {
  if (!studySessionId) return href;
  if (!href) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(query);
  params.set('studySession', studySessionId);
  const nextQuery = params.toString();
  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash}`;
}

export function studyCoordinatorHref(sessionId: string) {
  return `/dashboard/study?session=${encodeURIComponent(sessionId)}`;
}

export function studyLessonHref(session: StudySession, lessonSlug: string) {
  if (!session.activeCourse) return studyCoordinatorHref(session.id);
  const base = `/dashboard/courses/${encodeURIComponent(session.activeCourse.courseSlug)}/${encodeURIComponent(lessonSlug)}`;
  return appendStudySessionQuery(base, session.id);
}

export function studyPracticeHref(session: StudySession, returnTo?: string) {
  const params = new URLSearchParams();
  params.set('studySession', session.id);
  params.set('sessionLimit', String(Math.max(1, session.targets.practice)));
  params.set('autoStart', 'due');
  params.set('returnTo', returnTo || studyCoordinatorHref(session.id));
  return `/dashboard/practice?${params.toString()}`;
}

export function studyFlashcardsHref(session: StudySession, returnTo?: string) {
  const params = new URLSearchParams();
  params.set('studySession', session.id);
  params.set('sessionLimit', String(Math.max(1, session.targets.flashcards)));
  params.set('globalFill', session.scope.flashcards.globalFill ? '1' : '0');
  if (session.scope.flashcards.scopedPackIds.length > 0) {
    params.set('scopePackIds', session.scope.flashcards.scopedPackIds.join(','));
  }
  params.set('returnTo', returnTo || studyCoordinatorHref(session.id));
  return `/dashboard/flashcards/study?${params.toString()}`;
}

function stepDone(session: StudySession, step: StudyStep) {
  if (step === 'lessons') {
    if (session.targets.lessons <= 0) return true;
    return session.progress.lessonsSkipped || session.progress.lessonsCompleted >= session.targets.lessons;
  }
  if (step === 'practice') {
    if (session.targets.practice <= 0) return true;
    return session.progress.practiceSkipped || session.progress.practiceCompleted >= session.targets.practice;
  }
  if (session.targets.flashcards <= 0) return true;
  return session.progress.flashcardsSkipped || session.progress.flashcardsCompleted >= session.targets.flashcards;
}

export function refreshStudyCompletionStatus(session: StudySession) {
  const complete = stepDone(session, 'lessons') && stepDone(session, 'practice') && stepDone(session, 'flashcards');
  if (complete && session.status === 'active') {
    session.status = 'completed';
    session.completedAt = nowIso();
    session.updatedAt = nowIso();
  }
  return session;
}

export function recommendedStudyStep(session: StudySession): StudyStep | null {
  if (!stepDone(session, 'lessons')) return 'lessons';
  if (!stepDone(session, 'practice')) return 'practice';
  if (!stepDone(session, 'flashcards')) return 'flashcards';
  return null;
}

export function recommendedStudyHref(session: StudySession) {
  const step = recommendedStudyStep(session);
  if (step === 'lessons') {
    const lessonIndex = Math.min(
      session.progress.lessonsCompleted,
      Math.max(0, session.lessonPlan.lessonSlugs.length - 1),
    );
    const lessonSlug = session.lessonPlan.lessonSlugs[lessonIndex];
    if (lessonSlug) return studyLessonHref(session, lessonSlug);
    return studyCoordinatorHref(session.id);
  }
  if (step === 'practice') {
    return studyPracticeHref(session, studyCoordinatorHref(session.id));
  }
  if (step === 'flashcards') {
    return studyFlashcardsHref(session, studyCoordinatorHref(session.id));
  }
  return studyCoordinatorHref(session.id);
}

export function createStudySession(input: CreateStudySessionInput): CreateStudySessionOutput {
  const minutes = clampStudyMinutes(input.minutes);
  const activeCourse = pickActiveCourse(input.courses);
  const baseTargets = getStudyTargetsForMinutes(minutes);
  const incomplete = activeCourse ? nextIncompleteLessons(activeCourse) : [];
  const firstIncomplete = incomplete[0];

  const targets = { ...baseTargets };
  let lessonSlugs: string[] = [];
  const warningParts: string[] = [];

  const feasibleLessons =
    activeCourse &&
    firstIncomplete &&
    lessonWithinFeasibility(minutes, firstIncomplete) &&
    targets.lessons > 0;

  if (feasibleLessons) {
    lessonSlugs = incomplete.slice(0, targets.lessons).map((lesson) => lesson.lessonSlug);
  } else {
    if (targets.lessons > 0) {
      warningParts.push('No feasible lesson block for this session length, so this run is review-focused.');
    }
    targets.lessons = 0;
    targets.practice = Math.min(15, targets.practice + 2);
    targets.flashcards = Math.min(15, targets.flashcards + 2);
  }

  const noLessonPath = targets.lessons <= 0 || lessonSlugs.length === 0;
  const noDuePractice = input.duePracticeCount <= 0;
  const noDueFlashcards = input.dueFlashcardsCount <= 0;
  const skipPracticeForNoDue = noDuePractice && targets.practice > 0;
  const skipFlashcardsForNoDue = noDueFlashcards && targets.flashcards > 0;

  if (noLessonPath && noDuePractice && noDueFlashcards) {
    warningParts.push('Nothing is due right now. You can still run a quick review.');
  } else if (noLessonPath && noDuePractice) {
    warningParts.push('No feasible lesson or due practice, so this run starts with flashcards.');
  } else if (noLessonPath && noDueFlashcards) {
    warningParts.push('No feasible lesson or due flashcards, so this run starts with practice.');
  }

  const now = nowIso();
  const session: StudySession = {
    id: generateStudySessionId(),
    ownerClientId: normalizeOwnerClientId(input.ownerClientId),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    endedAt: null,
    status: 'active',
    minutes,
    targets,
    progress: {
      lessonsCompleted: 0,
      practiceCompleted: 0,
      flashcardsCompleted: 0,
      lessonsSkipped: false,
      practiceSkipped: skipPracticeForNoDue,
      flashcardsSkipped: skipFlashcardsForNoDue,
    },
    activeCourse: activeCourse
      ? {
          courseSlug: activeCourse.courseSlug,
          courseTitle: activeCourse.courseTitle,
        }
      : null,
    lessonPlan: {
      lessonSlugs,
      baselineCompletedLessons: activeCourse ? completedLessonCount(activeCourse) : 0,
    },
    scope: {
      flashcards: {
        scopedPackIds: scopedDeckIds(activeCourse?.courseTitle ?? null, input.decks),
        globalFill: true,
      },
    },
    dueSnapshot: {
      practice: Math.max(0, input.duePracticeCount),
      flashcards: Math.max(0, input.dueFlashcardsCount),
    },
  };

  refreshStudyCompletionStatus(session);
  let initialHref = recommendedStudyHref(session);
  if (noLessonPath && noDuePractice && noDueFlashcards) {
    initialHref = studyCoordinatorHref(session.id);
  } else if (noLessonPath && noDueFlashcards) {
    initialHref = studyPracticeHref(session, studyCoordinatorHref(session.id));
  }

  return {
    session,
    initialHref,
    warning: warningParts.length > 0 ? warningParts.join(' ') : null,
  };
}

export function setCurrentStudySessionId(id: string | null) {
  if (!canUseStorage()) return;
  try {
    if (id) {
      window.sessionStorage.setItem(CURRENT_POINTER_KEY, id);
    } else {
      window.sessionStorage.removeItem(CURRENT_POINTER_KEY);
    }
  } catch {
    // Best effort.
  }
}

export function getCurrentStudySessionId() {
  if (!canUseStorage()) return null;
  try {
    return window.sessionStorage.getItem(CURRENT_POINTER_KEY);
  } catch {
    return null;
  }
}

function isStudySessionShape(value: any): value is StudySession {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    value.targets &&
    value.progress
  );
}

function sessionOwnedBy(session: StudySession, ownerClientId?: string | null) {
  const expected = normalizeOwnerClientId(ownerClientId);
  if (!expected) return true;
  const actual = normalizeOwnerClientId(session.ownerClientId);
  return Boolean(actual && actual === expected);
}

export function saveStudySession(session: StudySession) {
  if (!canUseStorage()) return false;
  try {
    session.updatedAt = nowIso();
    refreshStudyCompletionStatus(session);
    window.sessionStorage.setItem(sessionStorageKey(session.id), JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function loadStudySession(id: string | null | undefined, ownerClientId?: string | null) {
  if (!id || !canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(sessionStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isStudySessionShape(parsed)) {
      window.sessionStorage.removeItem(sessionStorageKey(id));
      return null;
    }
    const session = parsed as StudySession;
    if (!sessionOwnedBy(session, ownerClientId)) {
      window.sessionStorage.removeItem(sessionStorageKey(id));
      return null;
    }
    refreshStudyCompletionStatus(session);
    return session;
  } catch {
    try {
      window.sessionStorage.removeItem(sessionStorageKey(id));
    } catch {
      // Best effort.
    }
    return null;
  }
}

export function loadCurrentStudySession(ownerClientId?: string | null) {
  const id = getCurrentStudySessionId();
  if (!id) return null;
  const session = loadStudySession(id, ownerClientId);
  if (!session) {
    setCurrentStudySessionId(null);
  }
  return session;
}

export function clearStudySession(id: string) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(sessionStorageKey(id));
    if (getCurrentStudySessionId() === id) {
      setCurrentStudySessionId(null);
    }
  } catch {
    // Best effort.
  }
}

export function applyLessonProgressFromCatalog(session: StudySession, courses: StudyCatalogCourse[]) {
  if (!session.activeCourse) return session;
  const course = courses.find((item) => item.courseSlug === session.activeCourse?.courseSlug);
  if (!course) return session;

  const completedNow = completedLessonCount(course);
  const lessonDelta = Math.max(0, completedNow - session.lessonPlan.baselineCompletedLessons);
  session.progress.lessonsCompleted = Math.min(session.targets.lessons, lessonDelta);
  refreshStudyCompletionStatus(session);
  return session;
}

export function setPracticeProgress(session: StudySession, count: number) {
  session.progress.practiceCompleted = Math.max(
    session.progress.practiceCompleted,
    Math.min(session.targets.practice, Math.max(0, Math.round(count))),
  );
  refreshStudyCompletionStatus(session);
  return session;
}

export function incrementPracticeProgress(session: StudySession, delta: number) {
  session.progress.practiceCompleted = Math.min(
    session.targets.practice,
    Math.max(0, session.progress.practiceCompleted + Math.max(0, Math.round(delta))),
  );
  refreshStudyCompletionStatus(session);
  return session;
}

export function setFlashcardsProgress(session: StudySession, count: number) {
  session.progress.flashcardsCompleted = Math.max(
    session.progress.flashcardsCompleted,
    Math.min(session.targets.flashcards, Math.max(0, Math.round(count))),
  );
  refreshStudyCompletionStatus(session);
  return session;
}

export function incrementFlashcardsProgress(session: StudySession, delta: number) {
  session.progress.flashcardsCompleted = Math.min(
    session.targets.flashcards,
    Math.max(0, session.progress.flashcardsCompleted + Math.max(0, Math.round(delta))),
  );
  refreshStudyCompletionStatus(session);
  return session;
}

export function setStepSkipped(session: StudySession, step: StudyStep, skipped = true) {
  if (step === 'lessons') session.progress.lessonsSkipped = skipped;
  if (step === 'practice') session.progress.practiceSkipped = skipped;
  if (step === 'flashcards') session.progress.flashcardsSkipped = skipped;
  refreshStudyCompletionStatus(session);
  return session;
}

export function endStudySession(session: StudySession) {
  if (session.status !== 'ended') {
    session.status = 'ended';
    session.endedAt = nowIso();
    session.updatedAt = nowIso();
  }
  return session;
}
