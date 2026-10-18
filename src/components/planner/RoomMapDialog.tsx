import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { campusPoint, concept3dDirectionsUrl, PARKING_STRUCTURE_4, pointFromText, type CampusPoint } from "@/utils/campusMap";
import type { ParsedRoom } from "@/utils/rooms";

type StartMode = "default" | "typed";

/**
 * The UT Dallas campus map (Concept3D, embedded) showing the walking route to a
 * room. The start defaults to `from` (e.g. the room of the previous class) or,
 * without one, to Parking Structure 4; the person can also type a room code.
 * The map has its own "use my location" button for everything else.
 */
export function RoomMapDialog({
    open,
    onOpenChange,
    to,
    from,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    to: ParsedRoom;
    /** Optional starting room, such as the room of the class before this one. */
    from?: ParsedRoom;
}) {
    const [mode, setMode] = useState<StartMode>("default");
    const [typed, setTyped] = useState("");

    const destination = campusPoint(to);
    const defaultStart: CampusPoint = (from && campusPoint(from)) || PARKING_STRUCTURE_4;
    const typedPoint = mode === "typed" && typed.trim() ? pointFromText(typed) : null;
    const start = typedPoint ?? defaultStart;
    const typedInvalid = mode === "typed" && typed.trim() !== "" && !typedPoint;

    if (!destination) return null;
    const url = concept3dDirectionsUrl(start, destination);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-4xl gap-0 overflow-hidden rounded-[10px] bg-white p-0 sm:rounded-[10px]">
                <DialogHeader className="space-y-1 px-5 pb-3 pt-5 pr-12">
                    <DialogTitle className="text-base">Walk to {to.label}</DialogTitle>
                    <DialogDescription className="text-xs">
                        {to.buildingName ?? to.building}
                        {to.floor !== undefined ? ` · Floor ${to.floor}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-2 border-y border-border px-5 py-2 text-xs">
                    <label className="text-muted-foreground" htmlFor="room-map-start">
                        Start from
                    </label>
                    <select
                        id="room-map-start"
                        className="rounded-md border border-border bg-white px-2 py-1"
                        value={mode}
                        onChange={e => setMode(e.target.value as StartMode)}
                    >
                        <option value="default">{from && campusPoint(from) ? `Previous class (${from.label})` : PARKING_STRUCTURE_4.name}</option>
                        <option value="typed">A room I type…</option>
                    </select>
                    {mode === "typed" && (
                        <input
                            aria-label="Starting room"
                            className="w-32 rounded-md border border-border px-2 py-1"
                            placeholder="ECSS 2.201"
                            value={typed}
                            onChange={e => setTyped(e.target.value)}
                        />
                    )}
                    {typedInvalid && (
                        <span className="text-red-600">Not found. Try a room like ECSS 2.201.</span>
                    )}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 font-medium text-green-600 hover:text-green-700"
                    >
                        Open in new tab <ExternalLink className="h-3 w-3" />
                    </a>
                </div>

                {/* key: a hash-only change would not reliably re-route the embedded map */}
                <iframe
                    key={url}
                    src={url}
                    title={`Walking route to ${to.label}`}
                    className="h-[60vh] w-full border-0"
                    allow="geolocation; gyroscope; accelerometer"
                />
            </DialogContent>
        </Dialog>
    );
}
