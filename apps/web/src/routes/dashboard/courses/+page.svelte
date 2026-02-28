<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

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

  let loading = true;
  let error = '';
  let courses: CourseItem[] = [];

  function latestStartedLessonHref(items: CourseItem[]) {
    const candidates = items
      .flatMap((course) =>
        course.lessons.map((lesson) => {
          const started =
            lesson.progress.status !== 'not_started' ||
            lesson.progress.progressPercent > 0 ||
            Boolean(lesson.progress.lastSeenAt);
          if (!started) return null;

          const seenAt = lesson.progress.lastSeenAt ? Date.parse(lesson.progress.lastSeenAt) : 0;
          return {
            href: (() => {
              const base = `/dashboard/courses/${course.courseSlug}/${lesson.lessonSlug}`;
              return lesson.progress.lastBlockId ? `${base}#${lesson.progress.lastBlockId}` : base;
            })(),
            seenAt: Number.isFinite(seenAt) ? seenAt : 0,
            progressPercent: lesson.progress.progressPercent,
          };
        }),
      )
      .filter(Boolean) as Array<{ href: string; seenAt: number; progressPercent: number }>;

    if (!candidates.length) return '';
    candidates.sort((a, b) => b.seenAt - a.seenAt || b.progressPercent - a.progressPercent);
    return candidates[0].href;
  }

  async function loadCatalog() {
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/proxy/courses/catalog', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const payload = await res.json();
      courses = payload?.courses ?? [];

      const forceAllModulesView = new URLSearchParams(window.location.search).get('view') === 'all';
      if (!forceAllModulesView) {
        const resumeHref = latestStartedLessonHref(courses);
        if (resumeHref) {
          await goto(resumeHref, { replaceState: true });
          return;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load courses';
      courses = [];
    } finally {
      loading = false;
    }
  }

  function resumeHref(course: CourseItem) {
    const latest = course.lessons
      .filter((lesson) => lessonStarted(lesson))
      .sort((a, b) => {
        const seenA = a.progress.lastSeenAt ? Date.parse(a.progress.lastSeenAt) : 0;
        const seenB = b.progress.lastSeenAt ? Date.parse(b.progress.lastSeenAt) : 0;
        const safeSeenA = Number.isFinite(seenA) ? seenA : 0;
        const safeSeenB = Number.isFinite(seenB) ? seenB : 0;
        if (safeSeenB !== safeSeenA) return safeSeenB - safeSeenA;
        if (b.progress.progressPercent !== a.progress.progressPercent) {
          return b.progress.progressPercent - a.progress.progressPercent;
        }
        return a.order - b.order;
      })[0];

    if (!latest) return startHref(course);
    const base = `/dashboard/courses/${course.courseSlug}/${latest.lessonSlug}`;
    return latest.progress.lastBlockId ? `${base}#${latest.progress.lastBlockId}` : base;
  }

  function lessonStarted(lesson: LessonItem) {
    return (
      lesson.progress.status !== 'not_started' ||
      lesson.progress.progressPercent > 0 ||
      Boolean(lesson.progress.lastSeenAt)
    );
  }

  function courseStarted(course: CourseItem) {
    return course.lessons.some((lesson) => lessonStarted(lesson));
  }

  function startHref(course: CourseItem) {
    const firstLesson = course.lessons.slice().sort((a, b) => a.order - b.order)[0];
    if (!firstLesson) return '/dashboard/courses?view=all';
    return `/dashboard/courses/${course.courseSlug}/${firstLesson.lessonSlug}`;
  }

  onMount(() => {
    loadCatalog();
  });
</script>

<section class="py-8">
  <div class="mx-auto max-w-6xl space-y-6">
    <div>
      <h1 class="text-4xl font-extrabold tracking-tight">Courses</h1>
      <p class="mt-2 text-slate-600">Markdown-authored modules with synced progress and lexicon tracking.</p>
    </div>

    {#if loading}
      <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading courses...</div>
    {:else if error}
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
    {:else if courses.length === 0}
      <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No course content has been synced yet.</div>
    {:else}
      <div class="grid gap-6 md:grid-cols-2">
        {#each courses as course}
          <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-2xl font-bold text-slate-900">{course.courseTitle}</h2>
                <p class="mt-1 text-sm uppercase tracking-wide text-slate-500">{course.lang}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">Progress</p>
                <p class="text-lg font-semibold text-slate-800">{course.summaryProgress.completedLessons}/{course.summaryProgress.totalLessons}</p>
              </div>
            </div>

            {#if course.summary}
              <p class="mt-3 text-slate-600">{course.summary}</p>
            {/if}

            <div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div class="h-2 bg-emerald-500 transition-all" style={`width: ${course.summaryProgress.percent}%`}></div>
            </div>

            <div class="mt-5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {course.summaryProgress.totalLessons} lesson{course.summaryProgress.totalLessons === 1 ? '' : 's'} in this module
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <a
                href={courseStarted(course) ? resumeHref(course) : startHref(course)}
                class="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {courseStarted(course) ? 'Resume lesson' : 'Start lesson'}
              </a>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
