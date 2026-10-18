import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import {
    campusPoint,
    concept3dDestinationUrl,
    concept3dDirectionsUrl,
    PARKING_STRUCTURE_4,
    pointFromText,
    type CampusPoint,
} from "@/utils/campusMap";
import type { ParsedRoom } from "@/utils/rooms";

const OVERLAY_Z = "z-[10100]";
const CONTENT_Z = "z-[10101]";
type StartMode = "pick" | "preset" | "typed";

export function RoomMapDialog({
    open,
    onOpenChange,
    to,
    from,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    to: ParsedRoom;
    from?: ParsedRoom;
}) {
    const [mode, setMode] = useState<StartMode>("pick");
    const [typed, setTyped] = useState("");

    const destination = campusPoint(to);
    const fromPoint = from ? campusPoint(from) : null;
    const preset: CampusPoint = fromPoint ?? PARKING_STRUCTURE_4;
    const typedPoint = mode === "typed" && typed.trim() ? pointFromText(typed) : null;
    const typedInvalid = mode === "typed" && typed.trim() !== "" && !typedPoint;
    // A start we do not have (nothing typed yet, or an unknown room) leaves it to the map.
    const start: CampusPoint | null = mode === "preset" ? preset : typedPoint;

    if (!destination) return null;
    const url = start ? concept3dDirectionsUrl(start, destination) : concept3dDestinationUrl(destination);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={`fixed inset-0 ${OVERLAY_Z} bg-black/60`} />
                <DialogPrimitive.Content
                    className={`fixed left-1/2 top-1/2 ${CONTENT_Z} w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] bg-white shadow-2xl focus:outline-none`}
                >
                    <div className="space-y-1 px-5 pb-3 pt-5 pr-12">
                        <DialogPrimitive.Title className="text-base font-semibold leading-none tracking-tight">
                            Walk to {to.label}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-xs text-muted-foreground">
                            {to.buildingName ?? to.building}
                            {to.floor !== undefined ? ` · Floor ${to.floor}` : ""}
                        </DialogPrimitive.Description>
                    </div>
                    <DialogPrimitive.Close
                        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </DialogPrimitive.Close>

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
                        <option value="pick">Choose on the map</option>
                        <option value="preset">{fromPoint && from ? `Previous class (${from.label})` : PARKING_STRUCTURE_4.name}</option>
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
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
