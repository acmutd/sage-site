export function hasCompletion(category: any): boolean {
  if (category.progress > 0) return true;
  if (category.classes?.some((c: any) => c.status === "completed" || c.status === "in progress")) return true;
  if (category.suggested?.length > 0) return true;
  if (category.prereq_blocked?.length > 0) return true;
  return category.categories?.some((sub: any) => hasCompletion(sub)) ?? false;
}

export function filterCategories(categories: any[]): any[] {
  return categories.filter((category) => {
    const name = category.name?.toUpperCase() || '';
    if (name === 'AND' && !hasCompletion(category)) return false;
    if (name === 'OR' && category.categories?.length > 0 && !category.categories.some((child: any) => hasCompletion(child))) return false;
    return true;
  });
}

export function collectAllSuggestedCourses(requirements: any[]): any[] {
  const courses: any[] = [];
  const collect = (categories: any[], parentPath: string[]) => {
    categories?.forEach((category) => {
      const currentPath = [...parentPath, category.name];
      if (category.suggested?.length > 0) {
        courses.push(...category.suggested.map((course: any) => ({ ...course, categoryPath: currentPath.join(' > ') })));
      }
      if (category.categories?.length > 0) collect(category.categories, currentPath);
    });
  };
  requirements.forEach((req) => {
    if (req.categories) collect(req.categories, [req.degree]);
  });
  return courses;
}
