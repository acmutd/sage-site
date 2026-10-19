import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface FilterDropdownProps {
    label: string;
    options: string[];
    optionLabels?: Record<string, string>;
    selected: string[];
    onChange: (vals: string[]) => void;
    single?: boolean;
    allLabel?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
    label, options, optionLabels, selected, onChange, single = false, allLabel,
}) => {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 0);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };

    useEffect(() => {
        if (open) setTimeout(checkScroll, 50);
    }, [open, options]);

    const scroll = (dir: 'up' | 'down') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ top: dir === 'up' ? -80 : 80, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const buttonWrapper = buttonRef.current?.closest('[data-filter-dropdown]');
            const portalMenu = document.querySelector('[data-filter-menu]');
            if (!buttonWrapper?.contains(target) && !portalMenu?.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
                zIndex: 99999,
            });
        }
        setOpen(p => !p);
    };

    const toggle = (val: string) => {
        if (single) {
            onChange(selected[0] === val ? [] : [val]);
            setOpen(false);
        } else {
            onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);
        }
    };

    const displayLabel = selected.length === 0
        ? (allLabel ?? label)
        : selected.length === 1
            ? (optionLabels?.[selected[0]] ?? selected[0])
            : `${optionLabels?.[selected[0]] ?? selected[0]} +${selected.length - 1}`;

    const isActive = selected.length > 0;

    return (
        <div data-filter-dropdown>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap max-w-[180px]
                    ${isActive
                        ? 'bg-green-500 border-green-500 text-white font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {open && ReactDOM.createPortal(
                <div
                    style={menuStyle}
                    data-filter-menu
                    className="bg-white border border-gray-200 rounded-2xl shadow-lg py-1 min-w-[140px]"
                >
                    {canScrollUp && (
                        <button
                            onClick={() => scroll('up')}
                            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {isActive && (
                        <>
                            <button
                                onClick={() => { onChange([]); setOpen(false); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50"
                            >
                                Clear
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                        </>
                    )}

                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'none' }}
                        className="px-1 [&::-webkit-scrollbar]:hidden"
                    >
                        {options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => toggle(opt)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                                <span className="font-medium">{optionLabels?.[opt] ?? opt}</span>
                                {selected.includes(opt) && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>

                    {canScrollDown && (
                        <button
                            onClick={() => scroll('down')}
                            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};