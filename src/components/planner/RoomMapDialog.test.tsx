import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RoomMapDialog } from "./RoomMapDialog";
import { parseRooms } from "@/utils/rooms";

const ecss = () => parseRooms("ECSS_2.306")[0];
const ROUTE = "https://map.concept3d.com/?id=1772#!s/?d/to:1,2,2;endName:ECSS%202.306";

describe("RoomMapDialog", () => {
    it("loads exactly the route the server gave, and offers it in a new tab", () => {
        render(<RoomMapDialog open onOpenChange={() => {}} to={ecss()} url={ROUTE} />);
        const frame = document.querySelector("iframe")!;
        expect(frame.getAttribute("src")).toBe(ROUTE);
        expect(frame.getAttribute("allow")).toContain("geolocation");
        expect(screen.getByText("Open in new tab").closest("a")?.getAttribute("href")).toBe(ROUTE);
        expect(screen.getByText("Walk to ECSS 2.306")).toBeTruthy();
    });

    it("renders nothing without a route", () => {
        render(<RoomMapDialog open onOpenChange={() => {}} to={ecss()} />);
        expect(document.querySelector("iframe")).toBeNull();
    });

    it("closes from the X button", () => {
        let open = true;
        render(<RoomMapDialog open onOpenChange={v => { open = v; }} to={ecss()} url={ROUTE} />);
        fireEvent.click(screen.getByLabelText("Close"));
        expect(open).toBe(false);
    });
});
