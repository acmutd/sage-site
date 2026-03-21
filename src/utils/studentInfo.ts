export const determineStudentType = (transcriptData: any): 'undergrad' | 'grad' => {
    // Check if graduate keys exist
    if (transcriptData?.credit_hours?.graduate || transcriptData?.gpa?.graduate) {
      return 'grad';
    }
    return 'undergrad';
};
  
export const calculateCatalogYear = (semester: string): number => {
    if (!semester) return calculateLatestYear();
    const [year, season] = semester.split(" ");
    return season === "Fall" ? parseInt(year) : parseInt(year) - 1;
};

export const calculateLatestYear = (): number => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const season = month >= 8 ? "Fall" : month >= 5 ? "Summer" : "Spring";
  return calculateCatalogYear(`${year} ${season}`);
};

export const isCurrentSemester = (title: string) => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  const season = month >= 8 ? 'Fall' : month >= 5 ? 'Summer' : 'Spring';
  return title === `${season} ${year}`;
};

export const getCurrentCatalogYear = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  return currentMonth >= 8 ? currentYear.toString() : (currentYear - 1).toString();
};