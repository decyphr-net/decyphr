export const load = async ({ params }) => {
  return {
    courseSlug: params.courseSlug,
    lessonSlug: params.lessonSlug,
  };
};
