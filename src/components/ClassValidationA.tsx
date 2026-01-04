import { EditIcon, Trash2Icon, SaveIcon } from "lucide-react";
import React, { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";

interface ClassValidationAProps {
  onNext: () => void;
  onBack: () => void;
  transcriptData: any;
}

const ClassValidationA: React.FC<ClassValidationAProps> = ({ onNext, onBack, transcriptData }) => {
  const courses = transcriptData?.courses || {};
  const [editingSemester, setEditingSemester] = useState<string | null>(null);
  const [editedCourses, setEditedCourses] = useState<any>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleEdit = (semester: string) => {
    setEditingSemester(semester);
    if (semester === "Transferred Credits") {
      setEditedCourses(courses.transfer_credits || []);
    } else if (semester === "Test Credits") {
      setEditedCourses(courses.test_credits || []);
    } else {
      setEditedCourses(courses.utd_classes[semester] || []);
    }
  };

  const handleSave = () => {
    if (editingSemester) {
      if (editingSemester === "Transferred Credits") {
        transcriptData.courses.transfer_credits = editedCourses;
      } else if (editingSemester === "Test Credits") {
        transcriptData.courses.test_credits = editedCourses;
      } else {
        transcriptData.courses.utd_classes[editingSemester] = editedCourses;
      }

      console.log("Updated transcriptData:", transcriptData);
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
    const allCourses = [
      ...(courses.transfer_credits || []),
      ...(courses.test_credits || []),
      ...Object.values(courses.utd_classes || {}).flat(),
    ];

    return allCourses.map((course: any, index: number) => (
      <option key={index} value={`${course.course_code} - ${course.course_name}`}>
        {course.course_code} - {course.course_name}
      </option>
    ));
  };

  const renderCourseSection = (title: string, coursesArray: any[]) => (
    <Card
      key={title}
      className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full bg-white rounded-lg overflow-hidden border border-solid border-slate-300 mb-4"
    >
      <CardContent className="p-0 w-full">
        <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto] mb-2">
          <h2 className="relative w-fit mt-[-1.00px] font-semibold text-gray-900 text-base">
            {title}
          </h2>
          {editingSemester === title ? (
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
              onClick={handleSave}
            >
              <SaveIcon className="relative w-4 h-4" />
              <span className="relative w-fit font-normal text-gray-900 text-sm">
                Save
              </span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
              onClick={() => handleEdit(title)}
            >
              <EditIcon className="relative w-4 h-4" />
              <span className="relative w-fit font-normal text-gray-900 text-sm">
                Edit
              </span>
            </Button>
          )}
        </div>
        <Separator className="relative w-full h-px bg-gray-200 mb-3" />
        {editingSemester === title ? (
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
          coursesArray.map((course, index) => (
            <div
              key={index}
              className="flex items-start gap-8 relative self-stretch w-full flex-[0_0_auto] mb-2 last:mb-0"
            >
              <div className="relative w-20 mt-[-1.00px] font-normal text-gray-900 text-sm whitespace-nowrap flex-shrink-0">
                {course.course_code}
              </div>
              <div className="relative flex-1 mt-[-1.00px] font-normal text-gray-600 text-sm">
                {course.course_name}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="relative w-full max-w-4xl">
      <div ref={scrollRef} className="overflow-y-auto max-h-[90vh] custom-scrollbar rounded-lg bg-gray-50" style={{ paddingRight: '20px' }}>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #86efac, #4ade80);
            border-radius: 999px;
          }
        `}</style>

        <div className="bg-gray-50 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col items-start mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Are these classes right?</h3>
            <p className="text-gray-600 text-sm">
              We detected these classes on your transcript — do these look right?
            </p>
          </div>
    
          {/* Transferred Credits Container */}
          {courses.transfer_credits && courses.transfer_credits.length > 0 && 
            renderCourseSection("Transferred Credits", courses.transfer_credits)
          }
    
          {/* Test Credits Container */}
          {courses.test_credits && courses.test_credits.length > 0 && 
            renderCourseSection("Test Credits", courses.test_credits)
          }
    
          {/* UTD Classes by Semester */}
          {courses.utd_classes && Object.keys(courses.utd_classes).length > 0 && (
            Object.entries(courses.utd_classes).map(([semester, semesterCourses]) => 
              renderCourseSection(semester, semesterCourses as any[])
            )
          )}
    
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={onBack}
              className="px-8 py-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
            >
              Back
            </button>
    
            <button
              className="px-8 py-2 bg-green-400 text-gray-900 font-medium rounded-lg hover:bg-green-500 transition"
              onClick={onNext}
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassValidationA;