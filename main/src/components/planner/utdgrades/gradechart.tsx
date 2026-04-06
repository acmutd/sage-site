import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { GradeDistribution } from "@/types/grades";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const GRADE_KEYS = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F","W"] as const;
const GRADE_COLORS = [
  "#22c55e","#4ade80","#86efac","#bef264","#fde047",
  "#fb923c","#f97316","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d","#450a0a",
  "#94a3b8"
];

interface GradeChartProps {
  grades: GradeDistribution;
  totalStudents: number;
  height?: number;
}

export default function GradeChart({ grades, totalStudents, height = 200 }: GradeChartProps) {
  const values = GRADE_KEYS.map(k => grades[k] ?? 0);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        enabled: true,
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
  };

  const data = {
    labels: [...GRADE_KEYS],
    datasets: [{ backgroundColor: GRADE_COLORS, data: values }],
  };

  return (
    <div style={{ height }}>
      <Bar options={options} data={data} />
    </div>
  );
}