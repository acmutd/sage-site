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
      className={`flex flex-col md:flex-row justify-between items-center rounded-3xl py-6 px-6 shadow-sm transition-all duration-300 w-full h-full
        ${
          active
            ? "bg-innercontainer border border-green-300"
            : "bg-innercontainer border border-border"
        }
      `}
    >
      {/* Left side */}
      <div className="flex flex-col w-full gap-4">
        <div className="flex flex-col space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>

          <div className="flex flex-col gap-3">
            <Requirement label="Core Requirements" value={core} />
            <Requirement label="Major Requirements" value={major} />
            <Requirement label="Elective Requirements" value={elective} />
          </div>
        </div>

        {/* {inner container} */}

        <div className="flex flex-row items-center border p-4 gap-4 border-border bg-white rounded-md justify-center">
            <div className="text-center">
              <p className="text-4xl font-semibold text-gray-900">{completed}</p>
              {/* <p className="text-gray-700 font-medium">Credit Hours</p> */}
              <p className="text-green-500 text-sm">of {total} Credit Hours</p>
              <p className="text-green-500 text-sm"> Completed</p>
            </div>

            <ProgressCircle percentage={percentage} />
          </div>
      </div>

      {/* Right side */}
      {/* <div className="flex flex-row items-center mt-6 md:mt-0 border border-border bg-white">

        <div className="mt-4 text-center">
          <p className="text-4xl font-semibold text-gray-900">{completed}</p>
          <p className="text-gray-700 font-medium">Credit Hours</p>
          <p className="text-green-500 font-medium">of {total} Completed</p>
        </div>

        <ProgressCircle percentage={percentage} />
      </div> */}
    </div>
  );
};

interface RequirementProps {
  label: string;
  value: string | number;
}

const Requirement: React.FC<RequirementProps> = ({ label, value }) => (
  <div className="flex justify-between items-center bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 gap-4">
    <span>{label}</span>
    <span className="flex items-center gap-4 font-medium">
      {value} / {value}
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