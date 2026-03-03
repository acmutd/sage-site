import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

interface DegreeProgressCardProps {
  title: string;
  coreCompleted: number;
  coreTotal: number;
  majorCompleted: number;
  majorTotal: number;
  electiveCompleted: number;
  electiveTotal: number;
  completed: number;
  total: number;
  percentage: number;
  active?: boolean;
  startDate?: string;
  endDate?: string;
}

function abbreviateDegree(title: string): string {
  return title
    .replace(/Associate of Arts/gi, "A.A.")
    .replace(/Associate of Science/gi, "A.S.")
    .replace(/Associate of Applied Science/gi, "A.A.S.")
    .replace(/Bachelor of Arts/gi, "B.A.")
    .replace(/Bachelor of Science/gi, "B.S.")
    .replace(/Bachelor of Engineering/gi, "B.E.")
    .replace(/Bachelor of Business Administration/gi, "B.B.A.")
    .replace(/Bachelor of Fine Arts/gi, "B.F.A.")
    .replace(/Bachelor of Music/gi, "B.M.")
    .replace(/Bachelor of Social Work/gi, "B.S.W.")
    .replace(/Bachelor of Nursing/gi, "B.S.N.")
    .replace(/Bachelor of Education/gi, "B.Ed.")
    .replace(/Bachelor of Architecture/gi, "B.Arch.")
    .replace(/Bachelor of Computer Science/gi, "B.C.S.")
    .replace(/Master of Business Administration/gi, "M.B.A.")
    .replace(/Master of Science/gi, "M.S.")
    .replace(/Master of Arts/gi, "M.A.")
    .replace(/Master of Engineering/gi, "M.Eng.")
    .replace(/Master of Education/gi, "M.Ed.")
    .replace(/Master of Fine Arts/gi, "M.F.A.")
    .replace(/Master of Public Health/gi, "M.P.H.")
    .replace(/Master of Public Administration/gi, "M.P.A.")
    .replace(/Master of Social Work/gi, "M.S.W.")
    .replace(/Master of Laws/gi, "LL.M.")
    .replace(/Master of Architecture/gi, "M.Arch.")
    .replace(/Master of Music/gi, "M.M.")
    .replace(/Doctor of Philosophy/gi, "Ph.D.")
    .replace(/Doctor of Medicine/gi, "M.D.")
    .replace(/Doctor of Dental Surgery/gi, "D.D.S.")
    .replace(/Doctor of Dental Medicine/gi, "D.M.D.")
    .replace(/Doctor of Veterinary Medicine/gi, "D.V.M.")
    .replace(/Doctor of Pharmacy/gi, "Pharm.D.")
    .replace(/Doctor of Audiology/gi, "Au.D.")
    .replace(/Doctor of Education/gi, "Ed.D.")
    .replace(/Doctor of Nursing Practice/gi, "D.N.P.")
    .replace(/Doctor of Physical Therapy/gi, "D.P.T.")
    .replace(/Doctor of Occupational Therapy/gi, "O.T.D.")
    .replace(/Doctor of Optometry/gi, "O.D.")
    .replace(/Doctor of Chiropractic/gi, "D.C.")
    .replace(/Doctor of Jurisprudence|Juris Doctor/gi, "J.D.")
    .replace(/Doctor of Science/gi, "D.Sc.")
    .replace(/Doctor of Divinity/gi, "D.D.")
    .replace(/Doctor of Business Administration/gi, "D.B.A.")
    .replace(/Doctor of Public Health/gi, "Dr.P.H.")
    .replace(/ in /gi, " ");
}

const DegreeProgressCard: React.FC<DegreeProgressCardProps> = ({
  title,
  coreCompleted,
  coreTotal,
  majorCompleted,
  majorTotal,
  electiveCompleted,
  electiveTotal,
  completed,
  total,
  percentage,
  startDate,
  endDate,
  active = false,
}) => {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const handleMouseEnter = () => {
    if (titleRef.current) {
      const rect = titleRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.top - 8 });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      {showTooltip && createPortal(
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translateY(-100%)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          className="px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-md whitespace-nowrap"
        >
          {title}
        </div>,
        document.body
      )}

      <div
        className={`flex flex-row justify-start items-stretch rounded-3xl py-6 px-6 shadow-sm transition-all duration-300 w-fit h-full gap-6
          ${active ? "bg-innercontainer border border-green-300" : "bg-innercontainer border border-border"}
        `}
      >
        {/* Left: Title + date + requirements */}
        <div className="flex flex-col gap-3">
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-fit max-w-[240px] cursor-default"
          >
            <h2 ref={titleRef} className="text-xl font-semibold text-gray-900 truncate max-w-[240px]">
              {abbreviateDegree(title)}
            </h2>
          </div>
          <p className="text-sm text-gray-400">{startDate ?? "—"} - {endDate ?? "Present"}</p>
          <div className="flex flex-col gap-2 h-full">
            <Requirement label="Core Requirements" completed={coreCompleted} total={coreTotal} />
            <Requirement label="Major Requirements" completed={majorCompleted} total={majorTotal} />
            <Requirement label="Elective Requirements" completed={electiveCompleted} total={electiveTotal} />
          </div>
        </div>

        {/* Right: White progress box */}
        <div className="relative border border-border bg-white rounded-3xl p-4 w-[220px] h-[180px] flex-shrink-0 self-end">
          <div className="absolute top-3 right-3">
            <ProgressCircle percentage={percentage} />
          </div>
          <div className="absolute bottom-4 left-5 flex flex-col gap-0.5">
            <p className="text-4xl font-semibold text-gray-900">{completed}</p>
            <p className="text-gray-700 text-sm font-medium">Credit Hours</p>
            <p className="text-green-500 text-sm">of {total} Completed</p>
          </div>
        </div>
      </div>
    </>
  );
};

interface RequirementProps {
  label: string;
  completed: number;
  total: number;
}

const Requirement: React.FC<RequirementProps> = ({ label, completed, total }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/planner")}
      className="flex justify-between items-center bg-white border border-border rounded-xl px-3 py-1.5 text-sm text-gray-700 gap-6 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
    >
      <span>{label}</span>
      <span className="flex items-center gap-2 font-medium">
        {completed}/{total}
        <div className="w-4 h-5 bg-gray-200 rounded overflow-hidden flex flex-col-reverse">
          <div
            className="w-full bg-green-500 rounded transition-all duration-300"
            style={{ height: `${(completed / total) * 100}%` }}
          />
        </div>
      </span>
    </div>
  );
};

interface ProgressCircleProps {
  percentage: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ percentage }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="text-green-400"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-green-500 font-semibold text-lg">
        {percentage}%
      </div>
    </div>
  );
};

export default DegreeProgressCard;