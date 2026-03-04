type LessonLike = {
  lessonSlug: string;
  order?: number;
};

type ParsedHierarchy = {
  moduleKey: string;
  moduleOrder: number;
  unitOrder: number;
  lessonOrder: number;
};

function parsePositiveInt(raw: string | undefined) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function parseLessonHierarchy(lessonSlug: string): ParsedHierarchy {
  const slug = String(lessonSlug || '').toLowerCase();
  const lessonMatch = slug.match(/-lesson-(\d+)(?:-(\d+))?(?:-|$)/);
  const moduleKey = lessonMatch && typeof lessonMatch.index === 'number'
    ? slug.slice(0, lessonMatch.index)
    : slug;
  const moduleOrderMatch = moduleKey.match(/-module-(\d+)(?:-|$)/);

  return {
    moduleKey,
    moduleOrder: parsePositiveInt(moduleOrderMatch?.[1]),
    unitOrder: parsePositiveInt(lessonMatch?.[1]),
    lessonOrder: parsePositiveInt(lessonMatch?.[2]),
  };
}

export function compareLessonsByHierarchy<T extends LessonLike>(a: T, b: T) {
  const left = parseLessonHierarchy(a.lessonSlug);
  const right = parseLessonHierarchy(b.lessonSlug);

  if (left.moduleOrder !== right.moduleOrder) return left.moduleOrder - right.moduleOrder;
  const moduleCompare = left.moduleKey.localeCompare(right.moduleKey);
  if (moduleCompare !== 0) return moduleCompare;

  if (left.unitOrder !== right.unitOrder) return left.unitOrder - right.unitOrder;
  if (left.lessonOrder !== right.lessonOrder) return left.lessonOrder - right.lessonOrder;

  const fallbackOrderA = Number.isFinite(a.order) ? Number(a.order) : Number.POSITIVE_INFINITY;
  const fallbackOrderB = Number.isFinite(b.order) ? Number(b.order) : Number.POSITIVE_INFINITY;
  if (fallbackOrderA !== fallbackOrderB) return fallbackOrderA - fallbackOrderB;

  return String(a.lessonSlug || '').localeCompare(String(b.lessonSlug || ''));
}
