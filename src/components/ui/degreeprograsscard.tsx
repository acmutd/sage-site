import React from "react";

interface DegreeProgressCardProps {
  title: string;
  core: string | number;
  major: string | number;
  elective: string | number;
  completed: number;
  total: number;
  percentage: number;
  active?: boolean;
}

const DegreeProgressCard: React.FC<DegreeProgressCardProps> = ({
  title,
  core,
  major,
  elective,
  completed,
  total,
  percentage,
  active = false,
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row justify-between items-center rounded-3xl p-8 shadow-sm transition-all duration-300
        ${
          active
            ? "bg-white border border-green-300"
            : "bg-gray-50 border border-gray-200"
        }
      `}
    >
      {/* Left side */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

        <div className="flex flex-col gap-3">
          <Requirement label="Core Requirements" value={core} />
          <Requirement label="Major Requirements" value={major} />
          <Requirement label="Elective Requirements" value={elective} />
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-center mt-6 md:mt-0">
        <ProgressCircle percentage={percentage} />

        <div className="mt-4 text-center">
          <p className="text-4xl font-semibold text-gray-900">{completed}</p>
          <p className="text-gray-700 font-medium">Credit Hours</p>
          <p className="text-green-500 font-medium">of {total} Completed</p>
        </div>
      </div>
    </div>
  );
};

interface RequirementProps {
  label: string;
  value: string | number;
}

const Requirement: React.FC<RequirementProps> = ({ label, value }) => (
  <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700">
    <span>{label}</span>
    <span className="flex items-center gap-2 font-medium">
      {value}
      <span className="w-2.5 h-2.5 bg-green-400 rounded-sm"></span>
    </span>
  </div>
);

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