export const determineStudentType = (transcriptData: any): 'undergrad' | 'grad' => {
    // Check if graduate keys exist
    if (transcriptData?.credit_hours?.graduate || transcriptData?.gpa?.graduate) {
      return 'grad';
    }
    return 'undergrad';
};
  
  export const calculateCatalogYear = (semester: string): number => {
    const [year, season] = semester.split(" ");
    return season === "Fall" ? parseInt(year) : parseInt(year) - 1;
};