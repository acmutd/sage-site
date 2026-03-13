import {
    Bar,
  } from "react-chartjs-2";
  import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    ChartOptions,
    LinearScale,
    Tooltip,
  } from "chart.js";
  import { getColors } from "@/utils/grades";
  import type { UserFriendlyGrades } from "@/utils/grades";
  
  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);
  
  interface GradeChartProps {
    grades: UserFriendlyGrades;
    totalStudents: number;
    height?: number;
  }
  
  const chartOptions = (totalStudents: number): ChartOptions<"bar"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        enabled: true,
        mode: "nearest",
        intersect: true,
        callbacks: {
          label: (ctx) => {
            const count = ctx.parsed.y ?? 0;
            return [
              `Students: ${count}`,
              `Percentage: ${((count / totalStudents) * 100).toFixed(1)}%`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(135,135,135,0.15)" },
        ticks: { color: "#868686" },
        border: { color: "rgba(135,135,135,0.15)" },
      },
      y: {
        grid: { color: "rgba(135,135,135,0.15)" },
        ticks: { color: "#868686", precision: 0 },
        border: { color: "rgba(135,135,135,0.15)" },
      },
    },
  });
  
  export default function GradeChart({ grades, totalStudents, height = 200 }: GradeChartProps) {
    const keys = Object.keys(grades) as (keyof UserFriendlyGrades)[];
    const values = Object.values(grades);
  
    const data = {
      labels: keys,
      datasets: [
        {
          backgroundColor: getColors(keys),
          data: values,
          borderRadius: 3,
        },
      ],
    };
  
    return (
      <div style={{ height }}>
        <Bar options={chartOptions(totalStudents)} data={data} />
      </div>
    );
  }