import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { SemesterDateRange } from '@/utils/scheduleExports';

interface SemesterDatePickerPopoverProps {
    onConfirm: (range: SemesterDateRange) => void;
    onCancel: () => void;
    // Future: pass this in when session data is available to skip the picker entirely
    prefillRange?: SemesterDateRange;
}

const toInputValue = (d: Date) => d.toISOString().slice(0, 10);

const getDefaultRange = (): SemesterDateRange => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const start = new Date(now);
    start.setDate(now.getDate() + daysUntilMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 16 * 7);
    return { start, end };
};

const SemesterDatePickerPopover: React.FC<SemesterDatePickerPopoverProps> = ({ onConfirm, onCancel, prefillRange }) => {
    const defaults = prefillRange ?? getDefaultRange();
    const [startVal, setStartVal] = useState(toInputValue(defaults.start));
    const [endVal, setEndVal] = useState(toInputValue(defaults.end));

    const handleConfirm = () => {
        const start = new Date(startVal);
        const end = new Date(endVal);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;
        onConfirm({ start, end });
    };

    return (
        <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 w-64"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-gray-700">Semester Date Range</span>
            </div>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                Set your semester start and end so recurring events are scoped correctly.
            </p>
            <div className="space-y-2 mb-3">
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Start</label>
                    <input
                        type="date"
                        value={startVal}
                        onChange={e => setStartVal(e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 w-full"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">End</label>
                    <input
                        type="date"
                        value={endVal}
                        onChange={e => setEndVal(e.target.value)}
                        min={startVal}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 w-full"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handleConfirm}
                    className="flex-1 text-xs px-3 py-1.5 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium transition-colors">
                    Export
                </button>
                <button onClick={onCancel}
                    className="flex-1 text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default SemesterDatePickerPopover;