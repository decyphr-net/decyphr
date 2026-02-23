<script lang="ts">
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
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load courses';
      courses = [];
    } finally {
      loading = false;
    }
  }

  function resumeHref(course: CourseItem) {
    const target = course.resumeTarget;
    if (!target) return '#';

    const base = `/dashboard/courses/${target.courseSlug}/${target.lessonSlug}`;
    return target.lastBlockId ? `${base}#${target.lastBlockId}` : base;
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

            <ul class="mt-5 space-y-2">
              {#each course.lessons as lesson}
                <li class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <a href={`/dashboard/courses/${course.courseSlug}/${lesson.lessonSlug}`} class="font-medium text-slate-800 hover:text-emerald-700">
                    {lesson.order}. {lesson.lessonTitle}
                  </a>
                  <span class="text-xs text-slate-500">{lesson.progress.progressPercent}%</span>
                </li>
              {/each}
            </ul>

            {#if course.resumeTarget}
              <a href={resumeHref(course)} class="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Resume learning
              </a>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
