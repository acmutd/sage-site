import { Course } from "@/types/course";
import { Warning } from "@/types/warning";
import { getCreditsFromCourseCode } from "@/utils/plannerCredits";

export const validateCourseLoad = (
    semesterCourses: Course[], 
    studentType: 'undergrad' | 'grad',
    catalogYear: number,
    isSummer: boolean
): Warning[] => {
    const totalCredits = semesterCourses.reduce(
        (sum, c) => sum + getCreditsFromCourseCode(c.course_code ?? (c as any).code),
        0
    );
    const warnings: Warning[] = [];
    
    if (studentType === 'undergrad') {
        const limit = catalogYear >= 2021 ? 19 : 18;
        const maxWithPermission = catalogYear >= 2021 ? 21 : (isSummer ? 15 : 18);
        
        if (totalCredits > maxWithPermission) {
            warnings.push({
                type: 'credit_limit',
                severity: 'error',
                message: `Exceeds maximum credit hours (${maxWithPermission})`,
                details: [`Total: ${totalCredits} credits`, 'Not permitted even with approval']
            });
        } else if (totalCredits > limit) {
            warnings.push({
                type: 'credit_limit',
                severity: 'warning',
                message: `Requires Associate Dean permission`,
                details: [
                    `Taking ${totalCredits} credits (limit: ${limit})`,
                    'Cannot withdraw from classes without permission'
                ]
            });
        }
    } else if (studentType === 'grad') {
        if (totalCredits > 18) {
            warnings.push({
                type: 'credit_limit',
                severity: 'error',
                message: `Exceeds graduate maximum (18 credits)`,
                details: [`Total: ${totalCredits} credits`, 'Requires exceptional circumstances approval']
            });
        }
    }
    
    return warnings;
};