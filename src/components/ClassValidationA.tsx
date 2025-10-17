import { EditIcon, Trash2Icon, SaveIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";

interface ClassValidationAProps {
  onNext: () => void;
  transcriptData: any;
}

const ClassValidationA: React.FC<ClassValidationAProps> = ({ onNext, transcriptData }) => {
  const courses = transcriptData?.courses || {};
  const [editingSemester, setEditingSemester] = useState<string | null>(null); // Track which semester is being edited
  const [editedCourses, setEditedCourses] = useState<any>({}); // Track changes to courses

  const handleEdit = (semester: string) => {
    setEditingSemester(semester);
    setEditedCourses(courses.utd_classes[semester] || []); // Initialize edited courses for the semester
  };

  const handleSave = () => {
    if (editingSemester) {
      // Update the respective semester in transcriptData
      transcriptData.courses.utd_classes[editingSemester] = editedCourses;

      // Log the updated transcriptData for debugging
      console.log("Updated transcriptData:", transcriptData);

      // Exit editing mode
      setEditingSemester(null);
    }
  };

  const handleAddCourse = () => {
    setEditedCourses((prev: any[]) => [
      ...prev,
      { course_code: "", course_name: "", credits_attempted: 0, credits_earned: 0, grade: "" },
    ]);
  };

  const handleRemoveCourse = (index: number) => {
    setEditedCourses((prev: any[]) => prev.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index: number, value: string) => {
    const [course_code, course_name] = value.split(" - ");
    setEditedCourses((prev: any[]) =>
      prev.map((course, i) =>
        i === index ? { ...course, course_code, course_name } : course
      )
    );
  };

  const renderDropdownOptions = () => {
    // Combine all courses into dropdown options
    const allCourses = [
      ...(courses.transfer_credits || []),
      ...(courses.test_credits || []),
      ...Object.values(courses.utd_classes).flat(),
    ];

    return allCourses.map((course: any, index: number) => (
      <option key={index} value={`${course.course_code} - ${course.course_name}`}>
        {course.course_code} - {course.course_name}
      </option>
    ));
  };

  const renderUTDClasses = (utdClasses: any) => (
    Object.keys(utdClasses).length > 0 ? (
      (Object.entries(utdClasses) as [string, any[]][]).map(([semester, courses]) => (
        <Card
          key={semester}
          className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full bg-redesign-stylesbg-light rounded-lg overflow-hidden border border-solid border-slate-300 mb-4"
        >
          <CardContent className="p-0 w-full">
            <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto] mb-2">
              <h2 className="relative w-fit mt-[-1.00px] font-body-semibold font-[number:var(--body-semibold-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-semibold-font-size)] tracking-[var(--body-semibold-letter-spacing)] leading-[var(--body-semibold-line-height)] [font-style:var(--body-semibold-font-style)]">
                {semester}
              </h2>
              {editingSemester === semester ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
                  onClick={handleSave}
                >
                  <SaveIcon className="relative w-4 h-4" />
                  <span className="relative w-fit [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap">
                    Save
                  </span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
                  onClick={() => handleEdit(semester)}
                >
                  <EditIcon className="relative w-4 h-4" />
                  <span className="relative w-fit [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap">
                    Edit
                  </span>
                </Button>
              )}
            </div>
            <Separator className="relative w-[87px] h-px bg-redesign-stylescard-border mb-2" />
            {editingSemester === semester ? (
              <>
                {editedCourses.map((course: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 mb-4"
                  >
                    <select
                      value={`${course.course_code} - ${course.course_name}`}
                      onChange={(e) => handleCourseChange(index, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 flex-1"
                    >
                      <option value="">Select a course</option>
                      {renderDropdownOptions()}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleRemoveCourse(index)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-500"
                  onClick={handleAddCourse}
                >
                  Add Course
                </Button>
              </>
            ) : (
              courses.map((course, index) => (
                <div
                  key={index}
                  className="flex items-center gap-8 relative self-stretch w-full flex-[0_0_auto] mb-1 last:mb-0"
                >
                  <div className="relative w-fit mt-[-1.00px] font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] whitespace-nowrap [font-style:var(--body-regular-font-style)]">
                    {course.course_code}
                  </div>
                  <div className="relative flex-1 mt-[-1.00px] font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesplaceholder-secondary-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] [font-style:var(--body-regular-font-style)]">
                    {course.course_name}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))
    ) : (
      <p className="text-gray-500">No UTD classes available.</p>
    )
  );

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl relative overflow-y-auto max-h-[90vh]"
    >
      <div className="flex flex-col items-start mb-6">
        <h3>Are these classes right?</h3>
        <p>
          We detected these classes on your transcript — do these look right?
        </p>
      </div>
      {renderUTDClasses(courses.utd_classes || {})}
      <div className="flex justify-end mt-8">
        <button
          className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
          onClick={onNext}
        >
          Finish
        </button>
      </div>
    </div>
  );
};

export default ClassValidationA;