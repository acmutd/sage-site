import { MapPin } from "lucide-react";
import { directionsUrl, floorLabel, mapsUrl, parseRooms } from "@/utils/rooms";

/**
 * Compact room text for dense lists (section rows, tooltips). Not interactive,
 * so it is safe inside buttons and hover cards.
 *
 *   GR 2.530
 *   Floor 2 · Cecil H. Green Hall
 */
export function RoomText({
    value,
    className = "text-xs text-gray-600",
}: {
    value: unknown;
    className?: string;
}) {
    const rooms = parseRooms(value);
    const primary = rooms[0];
    const extra = rooms.length - 1;
    const detail = [floorLabel(primary), primary.buildingName].filter(Boolean).join(" · ");
    const colour = primary.kind === "online" ? "text-[#5AED86] font-semibold" : "";

    return (
        <div className={`${className} ${colour}`.trim()}>
            <div title={rooms.map(r => r.label).join(" / ")}>
                {primary.label}
                {extra > 0 && <span className="text-gray-400 font-normal"> +{extra}</span>}
            </div>
            {detail && (
                <div className="text-[10px] text-gray-400 font-normal truncate" title={detail}>
                    {detail}
                </div>
            )}
        </div>
    );
}

/**
 * Room details with map links, for expanded views. Contains links, so do not
 * render it inside a <button>.
 */
export function RoomDetails({ value }: { value: unknown }) {
    const rooms = parseRooms(value).filter(r => r.kind !== "tba");
    if (rooms.length === 0) return null;

    return (
        <div className="px-4 py-3 border-t border-border space-y-2">
            {rooms.map((room, i) => {
                const map = mapsUrl(room);
                const directions = directionsUrl(room);
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
                            {map && directions && (
                                <div className="flex gap-3 mt-1 text-xs">
                                    <a
                                        href={map}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-700 font-medium"
                                    >
                                        Open in Maps
                                    </a>
                                    <a
                                        href={directions}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:text-green-700 font-medium"
                                    >
                                        Get directions
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
