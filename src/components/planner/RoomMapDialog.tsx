import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import { campusPoint, concept3dDestinationUrl } from "@/utils/campusMap";
import type { ParsedRoom } from "@/utils/rooms";

const OVERLAY_Z = "z-[10100]";
const CONTENT_Z = "z-[10101]";

export function RoomMapDialog({
    open,
    onOpenChange,
    to,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    to: ParsedRoom;
}) {
    const destination = campusPoint(to);
    if (!destination) return null;
    const url = concept3dDestinationUrl(destination);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className={`fixed inset-0 ${OVERLAY_Z} bg-black/60`} />
                <DialogPrimitive.Content
                    className={`fixed left-1/2 top-1/2 ${CONTENT_Z} w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] bg-white shadow-2xl focus:outline-none`}
                >
                    <div className="flex items-start gap-3 border-b border-border px-5 pb-3 pt-5 pr-12">
                        <div className="min-w-0 flex-1 space-y-1">
                            <DialogPrimitive.Title className="text-base font-semibold leading-none tracking-tight">
                                Walk to {to.label}
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="text-xs text-muted-foreground">
                                {to.buildingName ?? to.building}
                                {to.floor !== undefined ? ` · Floor ${to.floor}` : ""}
                            </DialogPrimitive.Description>
                        </div>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                        >
                            Open in new tab <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                    <DialogPrimitive.Close
                        className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </DialogPrimitive.Close>

                    <iframe
                        src={url}
                        title={`Walking route to ${to.label}`}
                        className="h-[65vh] w-full border-0"
                        allow="geolocation; gyroscope; accelerometer"
                    />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
