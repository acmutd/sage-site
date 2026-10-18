import { useState } from "react";
import { MapPin } from "lucide-react";
import { campusPoint, concept3dDestinationUrl } from "@/utils/campusMap";
import { floorLabel, mapsUrl, parseRooms, type ParsedRoom } from "@/utils/rooms";
import { RoomMapDialog } from "./RoomMapDialog";

export function RoomText({
    value,
    className = "text-xs",
    link = false,
}: {
    value: unknown;
    className?: string;
    link?: boolean;
}) {
    const rooms = parseRooms(value);
    const primary = rooms[0];
    const extra = rooms.length - 1;
    const floor = floorLabel(primary);
    const colour = primary.kind === "online" ? "text-[#5AED86] font-semibold" : "text-gray-600";
    const target = link ? campusPoint(primary) : null;
    const tooltip = rooms
        .map(r => [r.label, floorLabel(r), r.buildingName].filter(Boolean).join(" · "))
        .join("\n");

    return (
        <div className={`min-w-0 ${className} ${colour}`} title={tooltip}>
            <div className="truncate">
                {target ? (
                    <a
                        href={concept3dDestinationUrl(target)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="underline decoration-dotted underline-offset-2 hover:text-green-700"
                        title={`Walking route to ${primary.label} on the campus map`}
                    >
                        {primary.label}
                    </a>
                ) : (
                    primary.label
                )}
                {extra > 0 && <span className="text-gray-400 font-normal"> +{extra}</span>}
            </div>
            {floor && <div className="text-[10px] text-gray-400 font-normal truncate">{floor}</div>}
        </div>
    );
}

export function RoomDetails({ value }: { value: unknown }) {
    const rooms = parseRooms(value).filter(r => r.kind !== "tba");
    if (rooms.length === 0) return null;

    return (
        <div className="px-4 py-3 border-t border-border space-y-2">
            {rooms.map((room, i) => {
                const map = mapsUrl(room);
                const where = [floorLabel(room), room.buildingName].filter(Boolean).join(" · ");

                if (room.kind !== "room") {
                    return (
                        <p key={i} className="text-xs text-muted-foreground">
                            {room.kind === "online" ? "Online: no room to find." : room.label}
                        </p>
                    );
                }

                return (
                    <div key={i} className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                                {room.label}
                                {where && <span className="font-normal text-muted-foreground"> · {where}</span>}
                            </p>
                            {(campusPoint(room) || map) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs">
                                <WalkButton room={room} />
                                {map && (
                                    <a href={map} target="_blank" rel="noopener noreferrer" className={LINK}>
                                        Open in Maps
                                    </a>
                                )}
                            </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const LINK = "text-green-600 hover:text-green-700 font-medium";

function WalkButton({ room }: { room: ParsedRoom }) {
    const [open, setOpen] = useState(false);
    if (!campusPoint(room)) return null;
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={LINK}>
                Walking route
            </button>
            <RoomMapDialog open={open} onOpenChange={setOpen} to={room} />
        </>
    );
}
