<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { compareLessonsByHierarchy } from '$lib/course-order';

  type LessonItem = {
    lessonSlug: string;
    lessonTitle: string;
    moduleKey?: string;
    moduleName?: string;
    unitKey?: string;
    unitName?: string;
    group?: string;
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

  type GoalsSummary = {
    weeklyMinutes?: number;
    goals?: {
      active?: number;
      completed?: number;
    };
  };

  type PracticeDueItem = {
    phraseId?: number;
  };

  type NodeState = 'completed' | 'current' | 'review' | 'locked';

  type JourneyNode = {
    key: string;
    label: string;
    lessons: LessonItem[];
    totalMinutes: number;
    completed: number;
    total: number;
    percent: number;
    state: NodeState;
    anchorLesson: LessonItem;
  };

  type LessonKind = 'conversation' | 'breakdown' | 'recap' | 'challenge' | 'vocabulary' | 'bonus' | 'general';

  let loading = true;
  let error = '';

  let journeyCourses: CourseItem[] = [];
  let selectedCourseSlug = '';
  let journeyCourse: CourseItem | null = null;
  let journeyLessons: LessonItem[] = [];
  let nextLessonIndex = 0;
  let moduleOptions: Array<{ key: string; label: string; lessons: LessonItem[] }> = [];
  let selectedModuleKey = '';
  let displayedModuleLessons: LessonItem[] = [];
  let unitOptions: Array<{ key: string; label: string; lessons: LessonItem[] }> = [];
  let selectedUnitKey = '';
  let displayedJourneyLessons: LessonItem[] = [];
  let displayedNextLessonIndex = 0;
  let lessonIndexBySlug = new Map<string, number>();
  let displayedJourneyNodes: JourneyNode[] = [];
  let displayedCurrentNodeIndex = 0;

  let duePracticeCount = 0;
  let phrasebookCount = 0;
  let weeklyMinutes = 0;
  let activeGoalCount = 0;
  let completedGoalCount = 0;

  function lessonStarted(lesson: LessonItem) {
    return (
      lesson.progress.status !== 'not_started' ||
      lesson.progress.progressPercent > 0 ||
      Boolean(lesson.progress.lastSeenAt)
    );
  }

  function lessonHref(course: CourseItem, lesson: LessonItem) {
    const base = `/dashboard/courses/${course.courseSlug}/${lesson.lessonSlug}`;
    return lesson.progress.lastBlockId ? `${base}#${lesson.progress.lastBlockId}` : base;
  }

  function pickJourneyCourse(items: CourseItem[]) {
    if (!items.length) return null;

    const incomplete = items.filter((course) =>
      course.lessons.some((lesson) => lesson.progress.status !== 'completed'),
    );
    const pool = incomplete.length ? incomplete : items;
    const started = pool.filter((course) => course.lessons.some((lesson) => lessonStarted(lesson)));
    const candidates = started.length ? started : pool;

    return candidates
      .slice()
      .sort((a, b) => {
        const aSeen = Math.max(
          ...a.lessons.map((lesson) => Date.parse(lesson.progress.lastSeenAt || '') || 0),
        );
        const bSeen = Math.max(
          ...b.lessons.map((lesson) => Date.parse(lesson.progress.lastSeenAt || '') || 0),
        );
        if (aSeen !== bSeen) return bSeen - aSeen;
        return b.summaryProgress.percent - a.summaryProgress.percent;
      })[0];
  }

  function applySelectedCourse() {
    journeyCourse = journeyCourses.find((course) => course.courseSlug === selectedCourseSlug) ?? journeyCourses[0] ?? null;
    journeyLessons = (journeyCourse?.lessons ?? []).slice().sort(compareLessonsByHierarchy);
    lessonIndexBySlug = new Map(journeyLessons.map((lesson, index) => [lesson.lessonSlug, index]));
    nextLessonIndex = firstOpenLessonIndex(journeyLessons);
    moduleOptions = buildModuleOptions(journeyLessons, journeyCourse?.courseSlug || '');
    selectedModuleKey = moduleOptions.find((module) =>
      module.lessons.some((lesson) => lessonIndexBySlug.get(lesson.lessonSlug) === nextLessonIndex),
    )?.key ?? moduleOptions[0]?.key ?? '';
    applySelectedModule();
  }

  function firstOpenLessonIndex(lessons: LessonItem[]) {
    const idx = lessons.findIndex((lesson) => lesson.progress.status !== 'completed');
    return idx === -1 ? Math.max(0, lessons.length - 1) : idx;
  }

  function humanizeSlug(value: string) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function moduleKeyForLesson(lesson: LessonItem, courseSlug: string) {
    if (lesson.moduleKey) return lesson.moduleKey;
    const fromLessonSlug = lesson.lessonSlug.match(/^(.*)-lesson-\d+(?:-\d+)?(?:-|$)/)?.[1] || '';
    if (fromLessonSlug) {
      return fromLessonSlug.startsWith(`${courseSlug}-`)
        ? fromLessonSlug.slice(courseSlug.length + 1)
        : fromLessonSlug;
    }
    return 'module-1';
  }

  function moduleLabelForKey(key: string, index: number) {
    const label = humanizeSlug(key);
    return label || `Module ${index + 1}`;
  }

  function buildModuleOptions(lessons: LessonItem[], courseSlug: string) {
    if (!lessons.length) return [];
    const buckets = new Map<string, { label: string; lessons: LessonItem[] }>();
    const order: string[] = [];

    for (const lesson of lessons) {
      const key = moduleKeyForLesson(lesson, courseSlug);
      if (!buckets.has(key)) {
        const index = order.length;
        buckets.set(key, {
          label: lesson.moduleName || moduleLabelForKey(key, index),
          lessons: [],
        });
        order.push(key);
      }
      buckets.get(key)?.lessons.push(lesson);
    }

    return order.map((key) => ({
      key,
      label: buckets.get(key)?.label || moduleLabelForKey(key, 0),
      lessons: buckets.get(key)?.lessons || [],
    }));
  }

  function unitKeyForLesson(lesson: LessonItem) {
    if (lesson.unitKey) return lesson.unitKey;
    const match = lesson.lessonSlug.match(/-lesson-(\d+)(?:-|$)/);
    return match ? `unit-${match[1]}` : 'unit-1';
  }

  function unitLabelFromKey(key: string) {
    const numeric = key.replace('unit-', '');
    return Number.isFinite(Number(numeric)) ? `Unit ${Number(numeric)}` : 'Unit';
  }

  function buildUnitOptions(lessons: LessonItem[]) {
    const buckets = new Map<string, { label: string; lessons: LessonItem[] }>();
    for (const lesson of lessons) {
      const key = unitKeyForLesson(lesson);
      const existing = buckets.get(key);
      if (existing) {
        existing.lessons.push(lesson);
      } else {
        buckets.set(key, {
          label: lesson.unitName || unitLabelFromKey(key),
          lessons: [lesson],
        });
      }
    }
    return Array.from(buckets.entries())
      .map(([key, groupedLessons]) => ({
        key,
        label: groupedLessons.label,
        lessons: groupedLessons.lessons,
      }));
  }

  function applySelectedUnit() {
    const selected = unitOptions.find((option) => option.key === selectedUnitKey) ?? unitOptions[0];
    if (!selected) {
      displayedJourneyLessons = [];
      displayedNextLessonIndex = 0;
      displayedJourneyNodes = [];
      displayedCurrentNodeIndex = 0;
      return;
    }

    displayedJourneyLessons = selected.lessons;
    displayedNextLessonIndex = firstOpenLessonIndex(displayedJourneyLessons);
    const grouped = buildJourneyNodes(displayedJourneyLessons);
    displayedJourneyNodes = grouped.nodes;
    displayedCurrentNodeIndex = grouped.currentNodeIndex;
  }

  function applySelectedModule() {
    const selected = moduleOptions.find((option) => option.key === selectedModuleKey) ?? moduleOptions[0];
    if (!selected) {
      displayedModuleLessons = [];
      unitOptions = [];
      selectedUnitKey = '';
      displayedJourneyLessons = [];
      displayedNextLessonIndex = 0;
      displayedJourneyNodes = [];
      displayedCurrentNodeIndex = 0;
      return;
    }
    displayedModuleLessons = selected.lessons;
    unitOptions = buildUnitOptions(displayedModuleLessons);
    selectedUnitKey = unitOptions.find((unit) =>
      unit.lessons.some((lesson) => lessonIndexBySlug.get(lesson.lessonSlug) === nextLessonIndex),
    )?.key ?? unitOptions[0]?.key ?? '';
    applySelectedUnit();
  }

  function groupKeyForLesson(lesson: LessonItem) {
    const trimmedGroup = String(lesson.group || '').trim();
    return trimmedGroup ? trimmedGroup.toLowerCase() : lesson.lessonSlug;
  }

  function groupLabelForLesson(lesson: LessonItem) {
    const raw = String(lesson.group || '').trim();
    if (!raw) return lesson.lessonTitle;
    return raw
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function buildJourneyNodes(lessons: LessonItem[]) {
    const buckets = new Map<string, LessonItem[]>();
    const labels = new Map<string, string>();
    const order: string[] = [];

    for (const lesson of lessons) {
      const key = groupKeyForLesson(lesson);
      if (!buckets.has(key)) {
        buckets.set(key, []);
        labels.set(key, groupLabelForLesson(lesson));
        order.push(key);
      }
      buckets.get(key)?.push(lesson);
    }

    const nodes: JourneyNode[] = order.map((key) => {
      const groupedLessons = buckets.get(key) ?? [];
      const first = groupedLessons[0];
      if (!first) return null;
      const total = groupedLessons.length;
      const completed = groupedLessons.filter((lesson) => lesson.progress.status === 'completed').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const totalMinutes = groupedLessons.reduce((sum, lesson) => sum + Math.max(0, Number(lesson.estimatedMinutes || 0)), 0);
      const currentLesson = groupedLessons.find(
        (lesson) => (lessonIndexBySlug.get(lesson.lessonSlug) ?? -1) === nextLessonIndex,
      );
      const firstGlobalIndex = lessonIndexBySlug.get(first.lessonSlug) ?? Number.POSITIVE_INFINITY;
      const state: JourneyNode['state'] = completed === total
        ? 'completed'
        : currentLesson
          ? 'current'
          : firstGlobalIndex < nextLessonIndex
            ? 'review'
            : 'locked';
      const anchorLesson = currentLesson || groupedLessons.find((lesson) => lesson.progress.status !== 'completed') || first;

      return {
        key,
        label: labels.get(key) || first.lessonTitle || 'Lesson',
        lessons: groupedLessons,
        totalMinutes,
        completed,
        total,
        percent,
        state,
        anchorLesson,
      };
    }).filter((node): node is JourneyNode => node !== null);

    const currentNodeIndex = nodes.findIndex((node) => node.state === 'current');
    return { nodes, currentNodeIndex: currentNodeIndex >= 0 ? currentNodeIndex : Math.max(0, nodes.length - 1) };
  }

  function nodeClass(state: NodeState) {
    if (state === 'completed') return 'border-emerald-600 bg-emerald-500 text-white shadow-[0_12px_24px_-12px_rgba(5,150,105,0.6)]';
    if (state === 'current') return 'border-sky-600 bg-sky-500 text-white shadow-[0_12px_24px_-12px_rgba(2,132,199,0.6)] ring-4 ring-sky-100';
    if (state === 'review') return 'border-sky-500 bg-sky-400 text-sky-950 shadow-[0_10px_18px_-10px_rgba(14,116,144,0.55)]';
    return 'border-slate-300 bg-slate-100 text-slate-400';
  }

  function nodeRingColor(state: NodeState) {
    if (state === 'completed') return 'rgb(34 197 94)';
    if (state === 'current') return 'rgb(14 165 233)';
    if (state === 'review') return 'rgb(56 189 248)';
    return 'rgb(148 163 184)';
  }

  function statusIcon(state: NodeState) {
    if (state === 'completed') return 'badge-check';
    if (state === 'current') return 'play';
    if (state === 'review') return 'rotate-ccw';
    return 'lock';
  }

  function lessonKindFromTitle(title: string): LessonKind {
    const text = String(title || '').toLowerCase();
    if (text.includes('conversation')) return 'conversation';
    if (text.includes('breakdown')) return 'breakdown';
    if (text.includes('recap')) return 'recap';
    if (text.includes('challenge')) return 'challenge';
    if (text.includes('vocab')) return 'vocabulary';
    if (text.includes('bonus')) return 'bonus';
    return 'general';
  }

  function kindIcon(kind: LessonKind) {
    if (kind === 'conversation') return 'messages-square';
    if (kind === 'breakdown') return 'list-collapse';
    if (kind === 'recap') return 'refresh-cw';
    if (kind === 'challenge') return 'swords';
    if (kind === 'vocabulary') return 'book-open-text';
    if (kind === 'bonus') return 'sparkles';
    return 'book-open';
  }

  function nodeCenterIcon(node: JourneyNode, state: NodeState) {
    if (state === 'locked') return 'lock';
    const kind = lessonKindFromTitle(node.anchorLesson?.lessonTitle || node.label);
    return kindIcon(kind);
  }

  async function loadDashboard() {
    loading = true;
    error = '';

    try {
      const [catalogRes, practiceRes, phrasebookRes, goalsRes] = await Promise.all([
        fetch('/api/proxy/courses/catalog', { cache: 'no-store' }),
        fetch('/api/proxy/practice/due?limit=30', { cache: 'no-store' }),
        fetch('/api/proxy/phrasebook/list', { cache: 'no-store' }),
        fetch('/api/proxy/goals/progress/summary', { cache: 'no-store' }),
      ]);

      if (!catalogRes.ok) throw new Error('Failed to load your course journey.');

      const catalogPayload = await catalogRes.json();
      const catalogCourses = (catalogPayload?.courses ?? []) as CourseItem[];
      journeyCourses = catalogCourses.slice();
      selectedCourseSlug = pickJourneyCourse(journeyCourses)?.courseSlug ?? journeyCourses[0]?.courseSlug ?? '';
      applySelectedCourse();

      if (practiceRes.ok) {
        const practicePayload = await practiceRes.json();
        const dueItems = (Array.isArray(practicePayload?.items) ? practicePayload.items : []) as PracticeDueItem[];
        duePracticeCount = new Set(
          dueItems
            .map((item) => item?.phraseId)
            .filter((value): value is number => Number.isFinite(value)),
        ).size;
      } else {
        duePracticeCount = 0;
      }

      if (phrasebookRes.ok) {
        const phrasebookPayload = await phrasebookRes.json();
        phrasebookCount = Array.isArray(phrasebookPayload) ? phrasebookPayload.length : 0;
      } else {
        phrasebookCount = 0;
      }

      if (goalsRes.ok) {
        const goalsPayload = (await goalsRes.json()) as GoalsSummary;
        weeklyMinutes = Math.round(Number(goalsPayload?.weeklyMinutes || 0));
        activeGoalCount = Number(goalsPayload?.goals?.active || 0);
        completedGoalCount = Number(goalsPayload?.goals?.completed || 0);
      } else {
        weeklyMinutes = 0;
        activeGoalCount = 0;
        completedGoalCount = 0;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard data.';
      journeyCourse = null;
      journeyCourses = [];
      selectedCourseSlug = '';
      journeyLessons = [];
      nextLessonIndex = 0;
      lessonIndexBySlug = new Map();
      moduleOptions = [];
      selectedModuleKey = '';
      displayedModuleLessons = [];
      unitOptions = [];
      selectedUnitKey = '';
      displayedJourneyLessons = [];
      displayedNextLessonIndex = 0;
      displayedJourneyNodes = [];
      displayedCurrentNodeIndex = 0;
    } finally {
      loading = false;
    }
  }

  function renderIcons() {
    // @ts-ignore
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons();
  }

  onMount(async () => {
    await loadDashboard();
    renderIcons();
  });

  afterUpdate(renderIcons);
</script>

<section class="mx-auto max-w-6xl pb-6 pt-0 sm:py-6">
  {#if loading}
    <div class="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading your journey...</div>
  {:else if error}
    <div class="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">{error}</div>
  {:else}
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="space-y-6">
        <header class="-mx-4 -mt-4 overflow-hidden rounded-none border border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200 p-6 text-amber-950 shadow-sm sm:mx-0 sm:mt-0 sm:rounded-3xl">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/80">Journey</p>
          <h1 class="mt-2 text-3xl font-extrabold tracking-tight">{journeyCourse ? journeyCourse.courseTitle : 'Choose Your First Course'}</h1>
          {#if journeyCourse}
            <p class="mt-2 inline-flex items-center gap-1.5 text-sm text-amber-900/80">
              <i data-lucide="graduation-cap" class="h-4 w-4"></i>
              {journeyCourse.summaryProgress.completedLessons}/{journeyCourse.summaryProgress.totalLessons}
            </p>
            <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100/90">
              <div class="h-2 rounded-full bg-amber-700" style={`width: ${journeyCourse.summaryProgress.percent}%`}></div>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <a
                href={displayedJourneyLessons[displayedNextLessonIndex]
                  ? lessonHref(journeyCourse, displayedJourneyLessons[displayedNextLessonIndex])
                  : journeyLessons[nextLessonIndex]
                    ? lessonHref(journeyCourse, journeyLessons[nextLessonIndex])
                    : '/dashboard/courses?view=all'}
                class="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Continue lesson
              </a>
              <a href="/dashboard/courses?view=all" class="inline-flex items-center rounded-xl border border-amber-900/30 bg-white/60 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-white/80">
                Change course
              </a>
            </div>
          {:else}
            <p class="mt-2 text-sm text-amber-900/80">Select a course and we will map your journey here.</p>
            <a href="/dashboard/courses?view=all" class="mt-5 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
              Browse courses
            </a>
          {/if}
        </header>

        <section class="px-0 py-1">
          {#if !journeyCourse || journeyLessons.length === 0}
            <p class="text-sm text-slate-600">No lessons available yet for this course.</p>
          {:else}
            {#if journeyCourses.length > 1}
              <div class="mb-4">
                <label for="journey-course-select" class="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Course</label>
                <select
                  id="journey-course-select"
                  bind:value={selectedCourseSlug}
                  on:change={applySelectedCourse}
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-80"
                >
                  {#each journeyCourses as course}
                    <option value={course.courseSlug}>{course.courseTitle}</option>
                  {/each}
                </select>
              </div>
            {/if}
            {#if moduleOptions.length > 0}
              <div class="mb-4">
                <label for="journey-module-select" class="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module</label>
                <select
                  id="journey-module-select"
                  bind:value={selectedModuleKey}
                  on:change={applySelectedModule}
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-80"
                >
                  {#each moduleOptions as module}
                    <option value={module.key}>{module.label}</option>
                  {/each}
                </select>
              </div>
            {/if}
            {#if unitOptions.length > 0}
              <div class="mb-4">
                <label for="journey-unit-select" class="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unit</label>
                <select
                  id="journey-unit-select"
                  bind:value={selectedUnitKey}
                  on:change={applySelectedUnit}
                  class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-56"
                >
                  {#each unitOptions as option}
                    <option value={option.key}>{option.label}</option>
                  {/each}
                </select>
              </div>
            {/if}
            <div class="space-y-1">
              {#each displayedJourneyNodes as node, index}
                {@const state = node.state}
                {@const unlocked = state !== 'locked'}
                {@const showGroupRing = true}

                <div class={`flex ${index % 2 === 0 ? 'justify-start pl-2 sm:pl-12' : 'justify-end pr-2 sm:pr-12'}`}>
                  {#if unlocked}
                    <a
                      href={lessonHref(journeyCourse, node.anchorLesson)}
                      class="group flex w-48 max-w-[15rem] flex-col items-center gap-2 text-center"
                      aria-label={`Open ${node.label}`}
                    >
                      <div class={`relative flex ${showGroupRing ? 'h-24 w-24' : 'h-20 w-20'} shrink-0 items-center justify-center`}>
                        {#if showGroupRing}
                          <div
                            class="absolute inset-0 rounded-full border border-slate-200"
                            style={`background: conic-gradient(${nodeRingColor(state)} ${node.percent}%, rgb(203 213 225) 0);`}
                          ></div>
                          <div class="absolute inset-[5px] rounded-full bg-slate-100/90"></div>
                        {/if}
                        <div class={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition ${nodeClass(state)}`}>
                          <i data-lucide={nodeCenterIcon(node, state)} class="h-7 w-7"></i>
                          <span class="absolute -top-1.5 -left-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/80 bg-white text-slate-600 shadow">
                            <i data-lucide={statusIcon(state)} class="h-3.5 w-3.5"></i>
                          </span>
                          <span class="absolute -bottom-1.5 -right-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow">{index + 1}</span>
                        </div>
                      </div>
                      <div class="text-center">
                        <p class="h-10 overflow-hidden text-sm font-bold leading-tight text-slate-900">{node.label}</p>
                        <p class="mt-0.5 inline-flex h-4 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <i data-lucide="clock-3" class="h-3.5 w-3.5"></i>
                          {#if node.total > 1}
                            {node.completed}/{node.total} lessons • {node.totalMinutes} min
                          {:else}
                            {node.totalMinutes} min
                          {/if}
                        </p>
                      </div>
                    </a>
                  {:else}
                    <div class="flex w-48 max-w-[15rem] flex-col items-center gap-2 text-center opacity-75">
                      <div class={`relative flex ${showGroupRing ? 'h-24 w-24' : 'h-20 w-20'} shrink-0 items-center justify-center`}>
                        {#if showGroupRing}
                          <div
                            class="absolute inset-0 rounded-full border border-slate-200"
                            style={`background: conic-gradient(${nodeRingColor(state)} ${node.percent}%, rgb(203 213 225) 0);`}
                          ></div>
                          <div class="absolute inset-[5px] rounded-full bg-slate-100/90"></div>
                        {/if}
                        <div class={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition ${nodeClass(state)}`}>
                          <i data-lucide="lock" class="h-6 w-6"></i>
                          <span class="absolute -bottom-1.5 -right-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow">{index + 1}</span>
                        </div>
                      </div>
                      <div class="text-center">
                        <p class="h-10 overflow-hidden text-sm font-bold leading-tight text-slate-500">{node.label}</p>
                        <p class="mt-0.5 inline-flex h-4 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <i data-lucide="clock-3" class="h-3.5 w-3.5"></i>
                          {#if node.total > 1}
                            {node.completed}/{node.total} lessons • {node.totalMinutes} min
                          {:else}
                            {node.totalMinutes} min
                          {/if}
                        </p>
                      </div>
                    </div>
                  {/if}
                </div>

                {#if index < displayedJourneyNodes.length - 1}
                  <div class="flex justify-center py-1">
                    <div class={`h-6 w-1 rounded-full ${index < displayedCurrentNodeIndex ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <aside class="hidden space-y-4 lg:block">
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Goals</p>
          <div class="space-y-2">
            <a href="/dashboard/goals" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="target" class="h-4 w-4"></i>Goals</span>
              <span class="text-slate-500">{activeGoalCount}</span>
            </a>
            <a href="/dashboard/study" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="crosshair" class="h-4 w-4"></i>Focus</span>
              <i data-lucide="chevron-right" class="h-4 w-4 text-slate-400"></i>
            </a>
            <a href="/dashboard/pomodoro" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="timer" class="h-4 w-4"></i>Pomodoro</span>
              <span class="text-slate-500">{weeklyMinutes}m</span>
            </a>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Training</p>
          <div class="space-y-2">
            <a href="/dashboard/practice" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="brain" class="h-4 w-4"></i>Practice</span>
              <span class="text-slate-500">{duePracticeCount}</span>
            </a>
            <a href="/dashboard/practice#mistakes-hub" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="triangle-alert" class="h-4 w-4"></i>Mistakes</span>
              <i data-lucide="chevron-right" class="h-4 w-4 text-slate-400"></i>
            </a>
            <a href="/dashboard/flashcards/study" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="layers" class="h-4 w-4"></i>Flashcards</span>
              <i data-lucide="chevron-right" class="h-4 w-4 text-slate-400"></i>
            </a>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vocab</p>
          <div class="space-y-2">
            <a href="/dashboard/lexicon" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="book-open-check" class="h-4 w-4"></i>Lexicon</span>
              <i data-lucide="chevron-right" class="h-4 w-4 text-slate-400"></i>
            </a>
            <a href="/dashboard/phrasebook" class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <span class="inline-flex items-center gap-2"><i data-lucide="notebook-pen" class="h-4 w-4"></i>Phrasebook</span>
              <span class="text-slate-500">{phrasebookCount}</span>
            </a>
          </div>
        </section>
      </aside>
    </div>
  {/if}
</section>
