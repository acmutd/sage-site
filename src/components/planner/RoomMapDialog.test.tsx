import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RoomMapDialog } from "./RoomMapDialog";
import { RoomDetails, RoomText } from "./RoomLabel";
import { parseRooms } from "@/utils/rooms";

const iframeSrc = () => document.querySelector("iframe")?.getAttribute("src") ?? "";

describe("RoomMapDialog", () => {
    const ecss = () => parseRooms("ECSS_2.306")[0];

    it("fills in only the destination by default, so nobody is assumed to start anywhere", () => {
        render(<RoomMapDialog open onOpenChange={() => {}} to={ecss()} />);
        expect(iframeSrc()).toContain("#!s/?d/to:32.98624,-96.75042,2");
        expect(iframeSrc()).not.toContain("from:");
        expect(document.querySelector("iframe")?.getAttribute("allow")).toContain("geolocation");
    });

    it("renders nothing for a building we have no coordinates for", () => {
        render(<RoomMapDialog open onOpenChange={() => {}} to={parseRooms("CD1_B.108")[0]} />);
        expect(document.querySelector("iframe")).toBeNull();
    });
});

describe("clickable room code", () => {
    it("links only when asked, and only for buildings with coordinates", () => {
        const plain = render(<RoomText value="ECSS_2.306" />);
        expect(plain.container.querySelectorAll("a")).toHaveLength(0);
        plain.unmount();

        const linked = render(<RoomText value="ECSS_2.306" link />);
        const a = linked.container.querySelector("a")!;
        expect(a.textContent).toBe("ECSS 2.306");
        expect(a.getAttribute("href")).toContain("map.concept3d.com");
        expect(a.getAttribute("href")).toContain("#!s/?d/to:32.98624,-96.75042,2");
        expect(a.getAttribute("href")).not.toContain("from:"); // we never guess where the student is
        expect(a.getAttribute("target")).toBe("_blank");
        linked.unmount();

        const none = render(<RoomText value="CD1_B.108" link />);
        expect(none.container.querySelectorAll("a")).toHaveLength(0);
    });
});

describe("RoomDetails walking route", () => {
    it("offers the walking route button only where coordinates exist", () => {
        const withCoords = render(<RoomDetails value="ECSS_2.306" />);
        expect(withCoords.getByText("Walking route")).toBeTruthy();
        withCoords.unmount();

        const without = render(<RoomDetails value="CD1_B.108" />);
        expect(without.queryByText("Walking route")).toBeNull();
    });

    it("opens the map when the button is clicked", () => {
        render(<RoomDetails value="ECSS_2.306" />);
        expect(document.querySelector("iframe")).toBeNull();
        fireEvent.click(screen.getByText("Walking route"));
        expect(document.querySelector("iframe")).not.toBeNull();
    });
});
