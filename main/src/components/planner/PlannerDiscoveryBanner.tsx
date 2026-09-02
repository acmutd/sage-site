import { Compass, ChevronRight } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";

interface PlannerDiscoveryBannerProps {
  onOpenDiscovery?: () => void;
}

const PlannerDiscoveryBanner: React.FC<PlannerDiscoveryBannerProps> = ({ onOpenDiscovery }) => {
  const stagedCount = usePlannerStore((s) => s.stagedCourses.length);
  return (
    <button
      onClick={onOpenDiscovery}
      className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-green-300 bg-green-50 hover:bg-green-100 transition-colors text-left mb-4 group"
    >
      <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
        <Compass className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-green-800">
          {stagedCount > 0 ? 'Shop more courses' : 'Discover Courses'}
        </div>
        <div className="text-xs text-green-600">Browse &amp; add to your plan</div>
      </div>
      <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
};

export default PlannerDiscoveryBanner;
