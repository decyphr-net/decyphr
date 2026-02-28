<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    clampStudyMinutes,
    createStudySession,
    loadCurrentStudySession,
    saveStudySession,
    setCurrentStudySessionId,
    studyCoordinatorHref,
    type StudySession,
  } from '$lib/study-session';

  type LessonItem = {
    lessonSlug: string;
    lessonTitle: string;
    order: number;
    estimatedMinutes: number;
    progress: {
      status: 'not_started' | 'in_progress' | 'completed';
      progressPercent: number;
      lastBlockId: string | null;
      lastSeenAt?: string | null;
    };
  };

  type CourseItem = {
    courseSlug: string;
    courseTitle: string;
    lang: string;
    summary?: string;
    lessons: LessonItem[];
    summaryProgress: {
      completedLessons: number;
      totalLessons: number;
      percent: number;
    };
    resumeTarget: {
      courseSlug: string;
      lessonSlug: string;
      lastBlockId: string | null;
    } | null;
  };

  type PracticeQueueItem = {
    exerciseId: string;
    phraseId: number;
  };

  type PracticeHistoryAttempt = {
    isCorrect: boolean;
  };

  type FlashcardDeck = {
    id: number;
    name: string;
    dueCount?: number;
  };

  type DashboardChallenge = {
    id: string;
    key: string;
    type: string;
    title: string;
    description?: string | null;
    status: 'active' | 'completed';
    completedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    source?: {
      courseSlug: string;
      courseTitle: string;
      lessonSlug: string;
      lessonTitle: string;
    } | null;
  };

  let courses: CourseItem[] = [];
  let courseReady = false;
  let practiceHubReady = false;

  let activeCourse: CourseItem | null = null;
  let activeCourseResumeHref = '/dashboard/courses?view=all';
  let activeCourseMinutesLeft = 0;

  const practiceSessionTarget = 15;
  const mistakesTarget = 10;
  const flashcardsTarget = 20;
  let practiceReadyCount = 0;
  let practiceReadinessPercent = 0;
  let mistakesReadyCount = 0;
  let mistakesReadinessPercent = 0;
  let flashcardsDueCount = 0;
  let flashcardsReadinessPercent = 0;
  let flashcardDecks: FlashcardDeck[] = [];
  let challenges: DashboardChallenge[] = [];
  let challengesReady = false;
  let challengeUpdateError = '';
  let challengeUpdatingId: string | null = null;

  let showStudyPicker = false;
  let studyMinutesInput = '20';
  let studyStartError = '';
  let studyStartWarning = '';
  let studyStarting = false;
  let activeStudySession: StudySession | null = null;
  let canStartStudy = false;
  let guidedStudyAvailable = false;
  let studyStartUnavailableReason = '';
  let authClientId = '';
  let activeChallengeCount = 0;
  let completedChallengeCount = 0;

  function startDashboardTour() {
    const TourGuideClient = (window as any).tourguide?.TourGuideClient;
    if (!TourGuideClient) return false;

    const steps = [
      {
        target: "[data-tour='dashboard-hero']",
        title: 'Dashboard overview',
        content: 'This page is split between Guided Flow and Freestyle Study.',
      },
      {
        target: "[data-tour='dashboard-guided-card']",
        title: 'Guided flow',
        content: 'Start My Study runs a balanced Misneach session across lessons, practice, and flashcards.',
      },
      {
        target: "[data-tour='dashboard-courses-card']",
        title: 'Freestyle anchor',
        content: 'Use Courses as your anchor when building your own session sequence.',
      },
      {
        target: "[data-tour='dashboard-practice-card']",
        title: 'Practice queue',
        content: 'Pick this when you want quick due prompts and active recall reps.',
      },
      {
        target: "[data-tour='dashboard-mistakes-card']",
        title: 'Mistakes review',
        content: 'Use this to revisit recent mistakes and close your weak spots.',
      },
      {
        target: "[data-tour='dashboard-flashcards-card']",
        title: 'Flashcard review',
        content: 'Jump straight into due flashcards to reinforce retention.',
      },
      {
        target: "[data-tour='dashboard-review']",
        title: 'Review and vocabulary',
        content: 'Use this freestyle section to retain vocabulary and save useful phrases.',
      },
      {
        target: "[data-tour='dashboard-review-lexicon']",
        title: 'Track your words',
        content: 'Open Lexicon to see your known words and monitor long-term vocabulary growth.',
      },
      {
        target: "[data-tour='dashboard-review-phrasebook']",
        title: 'Save useful phrases',
        content: 'Use Phrasebook to store expressions you want ready in real conversations.',
      },
    ];

    const tour = new TourGuideClient({
      showProgress: true,
      showCloseButton: true,
      keyboardControls: true,
      overlayOpacity: 0.6,
      steps,
    });

    tour.start();
    return true;
  }

  function maybeStartDashboardTour() {
    if (localStorage.getItem('dashboardTourSeen')) return;
    const started = startDashboardTour();
    if (started) {
      localStorage.setItem('dashboardTourSeen', 'true');
    }
  }

  function resumeHref(course: CourseItem) {
    const target = course.resumeTarget;
    if (!target) return '/dashboard/courses?view=all';
    const base = `/dashboard/courses/${target.courseSlug}/${target.lessonSlug}`;
    return target.lastBlockId ? `${base}#${target.lastBlockId}` : base;
  }

  function isLessonStarted(lesson: LessonItem) {
    return lesson.progress.status !== 'not_started' || lesson.progress.progressPercent > 0;
  }

  function minutesLeftForCourse(course: CourseItem) {
    return course.lessons.reduce((total, lesson) => {
      if (lesson.progress.status === 'completed') return total;
      if (lesson.progress.status === 'in_progress') {
        const remaining = Math.ceil(
          lesson.estimatedMinutes * Math.max(0, 1 - lesson.progress.progressPercent / 100),
        );
        return total + Math.max(1, remaining);
      }
      return total + lesson.estimatedMinutes;
    }, 0);
  }

  function activeCourseFromCatalog(items: CourseItem[]) {
    const candidates = items.filter((course) => course.lessons.some(isLessonStarted));
    if (candidates.length === 0) return null;

    return candidates
      .slice()
      .sort((a, b) => {
        const aLastSeen = Math.max(
          ...a.lessons.map((lesson) => Date.parse(lesson.progress.lastSeenAt || '') || 0),
        );
        const bLastSeen = Math.max(
          ...b.lessons.map((lesson) => Date.parse(lesson.progress.lastSeenAt || '') || 0),
        );
        if (aLastSeen !== bLastSeen) return bLastSeen - aLastSeen;
        return b.summaryProgress.percent - a.summaryProgress.percent;
      })[0];
  }

  async function loadCourses() {
    try {
      const res = await fetch('/api/proxy/courses/catalog', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      courses = payload?.courses ?? [];

      activeCourse = activeCourseFromCatalog(courses);
      if (activeCourse) {
        activeCourseResumeHref = resumeHref(activeCourse);
        activeCourseMinutesLeft = minutesLeftForCourse(activeCourse);
      } else {
        activeCourseResumeHref = '/dashboard/courses?view=all';
        activeCourseMinutesLeft = 0;
      }
    } catch {
      courses = [];
      activeCourse = null;
      activeCourseResumeHref = '/dashboard/courses?view=all';
      activeCourseMinutesLeft = 0;
    } finally {
      courseReady = true;
    }
  }

  async function loadPracticeHub() {
    try {
      const [dueRes, historyRes, decksRes] = await Promise.all([
        fetch('/api/proxy/practice/due?limit=30', { cache: 'no-store' }),
        fetch('/api/proxy/practice/history?page=1&pageSize=40', { cache: 'no-store' }),
        fetch('/api/proxy/flashcards/decks', { cache: 'no-store' }),
      ]);

      if (!dueRes.ok || !historyRes.ok || !decksRes.ok) {
        throw new Error('Failed to load practice hub data');
      }

      const duePayload = await dueRes.json();
      const historyPayload = await historyRes.json();
      const decksPayload = await decksRes.json();

      const dueItems = (duePayload?.items ?? []) as PracticeQueueItem[];
      const uniqueDuePhrases = new Set(dueItems.map((item) => item.phraseId));
      practiceReadyCount = uniqueDuePhrases.size;
      practiceReadinessPercent = Math.min(
        100,
        Math.round((practiceReadyCount / Math.max(1, practiceSessionTarget)) * 100),
      );

      const recentAttempts = (historyPayload?.data ?? []) as PracticeHistoryAttempt[];
      mistakesReadyCount = recentAttempts.filter((attempt) => attempt.isCorrect === false).length;
      mistakesReadinessPercent = Math.min(
        100,
        Math.round((mistakesReadyCount / Math.max(1, mistakesTarget)) * 100),
      );

      const decks = (decksPayload ?? []) as FlashcardDeck[];
      flashcardDecks = decks;
      flashcardsDueCount = decks.reduce((sum, deck) => sum + Math.max(0, Number(deck.dueCount || 0)), 0);
      flashcardsReadinessPercent = Math.min(
        100,
        Math.round((flashcardsDueCount / Math.max(1, flashcardsTarget)) * 100),
      );
    } catch {
      practiceReadyCount = 0;
      practiceReadinessPercent = 0;
      mistakesReadyCount = 0;
      mistakesReadinessPercent = 0;
      flashcardsDueCount = 0;
      flashcardsReadinessPercent = 0;
      flashcardDecks = [];
    } finally {
      practiceHubReady = true;
    }
  }

  function sortedChallenges(items: DashboardChallenge[]) {
    return items
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'active' ? -1 : 1;
        }
        const aTime = Date.parse(a.createdAt || '') || 0;
        const bTime = Date.parse(b.createdAt || '') || 0;
        return bTime - aTime;
      });
  }

  async function loadChallenges() {
    try {
      const res = await fetch('/api/proxy/challenges', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      challenges = sortedChallenges((payload?.items ?? []) as DashboardChallenge[]);
    } catch {
      challenges = [];
    } finally {
      challengesReady = true;
    }
  }

  async function toggleChallenge(challenge: DashboardChallenge) {
    if (challengeUpdatingId === challenge.id) return;
    challengeUpdateError = '';
    challengeUpdatingId = challenge.id;

    const nextCompleted = challenge.status !== 'completed';
    const previousStatus = challenge.status;
    const previousCompletedAt = challenge.completedAt || null;

    challenges = sortedChallenges(
      challenges.map((item) =>
        item.id === challenge.id
          ? {
              ...item,
              status: nextCompleted ? 'completed' : 'active',
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : item,
      ),
    );

    try {
      const res = await fetch(`/api/proxy/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as DashboardChallenge;

      challenges = sortedChallenges(
        challenges.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      challenges = sortedChallenges(
        challenges.map((item) =>
          item.id === challenge.id
            ? { ...item, status: previousStatus, completedAt: previousCompletedAt }
            : item,
        ),
      );
      challengeUpdateError = 'Could not update this challenge. Please try again.';
    } finally {
      challengeUpdatingId = null;
    }
  }

  async function loadAuthContext() {
    authClientId = '';
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!res.ok) return;
      const payload = await res.json();
      authClientId = String(payload?.clientId || '').trim();
    } catch {
      authClientId = '';
    }
  }

  function refreshActiveStudySession() {
    if (!authClientId) {
      activeStudySession = null;
      setCurrentStudySessionId(null);
      return;
    }

    const current = loadCurrentStudySession(authClientId || null);
    if (!current || current.status !== 'active') {
      activeStudySession = null;
      if (current && current.status !== 'active') {
        setCurrentStudySessionId(null);
      }
      return;
    }
    activeStudySession = current;
  }

  function openStudyPicker(minutesPreset = 20) {
    if (!canStartStudy) {
      if (studyStartUnavailableReason) {
        studyStartError = studyStartUnavailableReason;
      }
      return;
    }
    studyMinutesInput = String(clampStudyMinutes(minutesPreset));
    studyStartError = '';
    showStudyPicker = true;
  }

  function closeStudyPicker() {
    showStudyPicker = false;
  }

  async function startStudySession() {
    if (!canStartStudy) {
      studyStartError = studyStartUnavailableReason || 'Guided study is unavailable right now.';
      return;
    }
    if (studyStarting) return;
    studyStartError = '';
    studyStartWarning = '';
    studyStarting = true;

    try {
      const minutes = clampStudyMinutes(Number(studyMinutesInput || 20));
      studyMinutesInput = String(minutes);

      const { session, initialHref, warning } = createStudySession({
        minutes,
        courses,
        decks: flashcardDecks,
        duePracticeCount: practiceReadyCount,
        dueFlashcardsCount: flashcardsDueCount,
        ownerClientId: authClientId || null,
      });

      if (!saveStudySession(session)) {
        throw new Error('Could not save your study session in browser storage.');
      }

      setCurrentStudySessionId(session.id);
      activeStudySession = session;
      studyStartWarning = warning || '';
      closeStudyPicker();
      await goto(initialHref);
    } catch (error) {
      studyStartError = error instanceof Error ? error.message : 'Failed to start study session.';
    } finally {
      studyStarting = false;
    }
  }

  async function resumeStudySession() {
    if (!activeStudySession) return;
    await goto(studyCoordinatorHref(activeStudySession.id));
  }

  onMount(async () => {
    await Promise.allSettled([loadAuthContext(), loadCourses(), loadPracticeHub(), loadChallenges()]);
    refreshActiveStudySession();
    setTimeout(maybeStartDashboardTour, 120);
  });

  $: {
    activeChallengeCount = challenges.filter((challenge) => challenge.status === 'active').length;
    completedChallengeCount = challenges.length - activeChallengeCount;
  }

  $: {
    const hasStartedCourse = Boolean(activeCourse);
    const hasPracticePhrases = practiceReadyCount > 0;
    canStartStudy = hasStartedCourse && hasPracticePhrases;
    guidedStudyAvailable = Boolean(activeStudySession) || canStartStudy;

    if (!courseReady || !practiceHubReady) {
      studyStartUnavailableReason = '';
    } else if (!hasStartedCourse && !hasPracticePhrases) {
      studyStartUnavailableReason = 'Start a course and add at least one phrase to unlock guided study.';
    } else if (!hasStartedCourse) {
      studyStartUnavailableReason = 'Start a course first to unlock guided study.';
    } else if (!hasPracticePhrases) {
      studyStartUnavailableReason = 'Add at least one phrase to your phrasebook to unlock guided study.';
    } else {
      studyStartUnavailableReason = '';
    }
  }
</script>

<section class="py-6">
  <div class="max-w-6xl mx-auto space-y-10">
    <div data-tour="dashboard-hero">
      <h1 class="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Dashboard</h1>
    </div>

    <section class="space-y-4">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Guided Flow</h2>
        <p class="text-slate-600 dark:text-slate-300 mt-1">Use the Misneach pathway: lessons, practice, and flashcards in one focused session.</p>
      </div>

      <section
        data-tour="dashboard-guided-card"
        class={`rounded-2xl p-6 shadow border transition ${
          guidedStudyAvailable
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-slate-200 border-slate-300 text-slate-600'
        }`}
      >
        <p class={`text-xs uppercase tracking-[0.12em] ${guidedStudyAvailable ? 'text-slate-300' : 'text-slate-500'}`}>Balanced Path</p>
        <h3 class="text-2xl font-bold mt-2 mb-2">Start My Study</h3>
        <p class={guidedStudyAvailable ? 'text-slate-200' : 'text-slate-600'}>
          Get a structured study run sized to your available time.
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              canStartStudy ? 'bg-emerald-500 hover:bg-emerald-400' : 'cursor-not-allowed bg-slate-400'
            }`}
            disabled={!canStartStudy}
            onclick={() => openStudyPicker(20)}
          >
            Start My Study
          </button>
          {#if activeStudySession}
            <button
              type="button"
              class={`inline-flex rounded-lg border px-4 py-2 text-sm font-semibold ${
                guidedStudyAvailable
                  ? 'border-slate-500 text-slate-100 hover:bg-slate-800'
                  : 'border-slate-400 text-slate-600'
              }`}
              onclick={resumeStudySession}
            >
              Resume Session
            </button>
          {/if}
        </div>

        {#if !guidedStudyAvailable}
          <p class="mt-3 text-sm text-slate-600">
            {studyStartUnavailableReason || "Guided study unlocks once you've started a course."}
          </p>
        {/if}
        {#if activeStudySession}
          <p class="mt-3 text-sm text-slate-300">
            Session in progress: {activeStudySession.progress.lessonsCompleted}/{activeStudySession.targets.lessons}
            lessons, {activeStudySession.progress.practiceCompleted}/{activeStudySession.targets.practice}
            practice, {activeStudySession.progress.flashcardsCompleted}/{activeStudySession.targets.flashcards}
            flashcards.
          </p>
        {/if}
        {#if studyStartWarning}
          <p class="mt-3 text-sm text-amber-300">{studyStartWarning}</p>
        {/if}
        {#if studyStartError}
          <p class="mt-3 text-sm text-rose-300">{studyStartError}</p>
        {/if}
      </section>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Real World Challenges</h2>
        <p class="text-slate-600 dark:text-slate-300 mt-1">Action reminders generated from challenge lessons so you can tick them off.</p>
      </div>

      <section class="rounded-2xl p-6 shadow border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700">
        <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span><span class="font-semibold">{activeChallengeCount}</span> active</span>
          <span aria-hidden="true">•</span>
          <span><span class="font-semibold">{completedChallengeCount}</span> completed</span>
        </div>

        {#if !challengesReady}
          <p class="mt-3 text-slate-500 dark:text-slate-300">Loading challenges...</p>
        {:else if challenges.length === 0}
          <p class="mt-3 text-slate-500 dark:text-slate-300">
            No real-world challenges yet. Start a lesson named "Real World Challenge" to generate one.
          </p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each challenges as challenge (challenge.id)}
              <div
                class={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${
                  challenge.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'
                }`}
              >
                <div class="min-w-0">
                  <p
                    class={`text-sm font-semibold ${
                      challenge.status === 'completed'
                        ? 'text-emerald-800 dark:text-emerald-100'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {challenge.title}
                  </p>
                  {#if challenge.description}
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{challenge.description}</p>
                  {/if}
                  {#if challenge.source}
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {challenge.source.courseTitle} • {challenge.source.lessonTitle}
                    </p>
                  {/if}
                </div>

                <button
                  type="button"
                  class={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                    challenge.status === 'completed'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  disabled={challengeUpdatingId === challenge.id}
                  onclick={() => toggleChallenge(challenge)}
                >
                  {#if challengeUpdatingId === challenge.id}
                    Saving...
                  {:else if challenge.status === 'completed'}
                    Mark Active
                  {:else}
                    Mark Done
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}

        {#if challengeUpdateError}
          <p class="mt-3 text-sm text-rose-600">{challengeUpdateError}</p>
        {/if}
      </section>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Freestyle Study</h2>
        <p class="text-slate-600 dark:text-slate-300 mt-1">Pick your own order and pace across courses, practice, and review.</p>
      </div>

      <a
        href={activeCourseResumeHref}
        data-tour="dashboard-courses-card"
        class="block rounded-2xl p-6 shadow border transition bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 border-emerald-500 text-white hover:shadow-lg"
      >
        <p class="text-xs uppercase tracking-[0.12em] text-emerald-100">Primary Path</p>
        <h3 class="text-2xl font-bold mt-2 mb-2">Courses</h3>

        {#if !courseReady}
          <p class="text-emerald-50">Loading your module progress...</p>
        {:else if activeCourse}
          <p class="text-emerald-50">
            Continue <span class="font-semibold">{activeCourse.courseTitle}</span> ({activeCourse.summaryProgress.percent}% complete).
          </p>
          <p class="text-emerald-100 text-sm mt-2">
            About {activeCourseMinutesLeft} min of reading left in this unit.
          </p>
          <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-900/40">
            <div class="h-2 rounded-full bg-emerald-100" style={`width: ${activeCourse.summaryProgress.percent}%`}></div>
          </div>
        {:else}
          <p class="text-emerald-50">Choose a module to begin your first unit.</p>
        {/if}
      </a>
    </section>

    <section class="space-y-4">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Freestyle Practice Hub</h2>
        <p class="text-slate-600 dark:text-slate-300 mt-1">Build reps your way: due practice, mistake repair, and flashcards in any order.</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <a
          href="/dashboard/practice"
          data-tour="dashboard-practice-card"
          class="rounded-2xl p-6 shadow border transition bg-slate-900 border-slate-800 text-white hover:shadow-lg"
        >
          <p class="text-xs uppercase tracking-[0.12em] text-slate-300">Practice Queue</p>
          <h3 class="text-2xl font-bold mt-2 mb-2">Practice</h3>

          {#if !practiceHubReady}
            <p class="text-slate-200">Loading...</p>
          {:else if practiceReadyCount > 0}
            <p class="text-slate-200">Practice from your saved phrase pool anytime.</p>
            <p class="text-slate-300 text-sm mt-2">
              {practiceReadyCount} ready now • start anytime.
            </p>
            <p class="text-slate-300 text-sm mt-2">
              Session target: {practiceSessionTarget}. Add more phrases by continuing course lessons.
            </p>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700/70">
              <div class="h-2 rounded-full bg-cyan-300" style={`width: ${practiceReadinessPercent}%`}></div>
            </div>
          {:else}
            <p class="text-slate-200">No practice phrases are available yet.</p>
            <p class="text-slate-300 text-sm mt-2">Continue your course to unlock phrases, then come back here to practice them.</p>
          {/if}
        </a>

        <a
          href="/dashboard/practice"
          data-tour="dashboard-mistakes-card"
          class="rounded-2xl p-6 shadow border transition bg-amber-600 border-amber-500 text-white hover:shadow-lg"
        >
          <p class="text-xs uppercase tracking-[0.12em] text-amber-100">Targeted Review</p>
          <h3 class="text-2xl font-bold mt-2 mb-2">Mistakes</h3>

          {#if !practiceHubReady}
            <p class="text-amber-50">Loading...</p>
          {:else if mistakesReadyCount > 0}
            <p class="text-amber-50">You made <span class="font-semibold">{mistakesReadyCount}</span> recent mistakes to revisit.</p>
            <p class="text-amber-100 text-sm mt-2">
              {mistakesReadyCount} of {mistakesTarget} in your current review set
            </p>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-900/35">
              <div class="h-2 rounded-full bg-amber-100" style={`width: ${mistakesReadinessPercent}%`}></div>
            </div>
          {:else}
            <p class="text-amber-50">No recent mistakes detected. Nice work.</p>
          {/if}
        </a>

        <a
          href="/dashboard/flashcards/study"
          data-tour="dashboard-flashcards-card"
          class="rounded-2xl p-6 shadow border transition bg-indigo-700 border-indigo-600 text-white hover:shadow-lg"
        >
          <p class="text-xs uppercase tracking-[0.12em] text-indigo-100">Memory Review</p>
          <h3 class="text-2xl font-bold mt-2 mb-2">Flashcards</h3>

          {#if !practiceHubReady}
            <p class="text-indigo-50">Loading...</p>
          {:else if flashcardsDueCount > 0}
            <p class="text-indigo-50"><span class="font-semibold">{flashcardsDueCount}</span> flashcards are due now.</p>
            <p class="text-indigo-100 text-sm mt-2">
              {flashcardsDueCount} of {flashcardsTarget} queued for review depth
            </p>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-indigo-950/35">
              <div class="h-2 rounded-full bg-indigo-100" style={`width: ${flashcardsReadinessPercent}%`}></div>
            </div>
          {:else}
            <p class="text-indigo-50">No flashcards due right now.</p>
          {/if}
        </a>
      </div>
    </section>

    <section class="space-y-4" data-tour="dashboard-review">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Freestyle Review & Vocabulary</h2>
        <p class="text-slate-600 dark:text-slate-300 mt-1">Top up retention and expression with your own review loop.</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <a
          href="/dashboard/lexicon"
          data-tour="dashboard-review-lexicon"
          class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow hover:shadow-lg transition border border-slate-100 dark:border-slate-700"
        >
          <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Lexicon</h3>
          <p class="text-slate-600 dark:text-slate-300">Track known words and growth over time.</p>
        </a>
        <a
          href="/dashboard/phrasebook"
          data-tour="dashboard-review-phrasebook"
          class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow hover:shadow-lg transition border border-slate-100 dark:border-slate-700"
        >
          <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Phrasebook</h3>
          <p class="text-slate-600 dark:text-slate-300">Store reusable phrases and notes.</p>
        </a>
      </div>
    </section>
  </div>
</section>

{#if showStudyPicker}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    onclick={closeStudyPicker}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      onclick={(event) => event.stopPropagation()}
    >
      <h2 class="text-2xl font-bold text-slate-900">Start My Study</h2>
      <p class="mt-2 text-sm text-slate-600">Pick your time and we will build a guided balanced session.</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm font-semibold" onclick={() => (studyMinutesInput = '5')}>5 min</button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm font-semibold" onclick={() => (studyMinutesInput = '20')}>20 min</button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm font-semibold" onclick={() => (studyMinutesInput = '35')}>35 min</button>
      </div>

      <label for="study-minutes" class="mt-4 block text-sm font-semibold text-slate-700">Custom minutes (5-90)</label>
      <input
        id="study-minutes"
        type="number"
        min="5"
        max="90"
        bind:value={studyMinutesInput}
        class="mt-1 w-full rounded-lg border px-3 py-2"
      />

      {#if studyStartError}
        <p class="mt-3 text-sm text-rose-600">{studyStartError}</p>
      {/if}

      <div class="mt-5 flex items-center justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm font-semibold" onclick={closeStudyPicker}>Cancel</button>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          disabled={studyStarting}
          onclick={startStudySession}
        >
          {studyStarting ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </div>
  </div>
{/if}
