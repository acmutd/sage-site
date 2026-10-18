import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const links = vi.hoisted(() => ({ value: {} as Record<string, any> }));
vi.mock("@/hooks/useCampusLinks", () => ({ useCampusLinks: () => links.value }));

import { RoomDetails, RoomText } from "./RoomLabel";

describe("RoomDetails with server links", () => {
    it("uses the server's room, maps and route links", () => {
        links.value = { "ECSS_2.306": { roomUrl: "https://srv/room", mapsUrl: "https://srv/maps", wayfinderUrl: "https://srv/route" } };
        const { container } = render(<RoomDetails value="ECSS_2.306" />);
        const hrefs = [...container.querySelectorAll("a")].map(a => a.getAttribute("href"));
        expect(hrefs).toEqual(["https://srv/room", "https://srv/maps"]);
        fireEvent.click(screen.getByText("Walking route"));
        expect(document.querySelector("iframe")?.getAttribute("src")).toBe("https://srv/route");
    });

    it("works for a room only the server knows", () => {
        links.value = { "CD1_B.108": { wayfinderUrl: "https://srv/route" } };
        render(<RoomDetails value="CD1_B.108" />);
        expect(screen.getByText("Walking route")).toBeTruthy();
        expect(screen.queryByText("View room")).toBeNull();
    });

    it("shows no campus buttons when the server has nothing", () => {
        links.value = {};
        render(<RoomDetails value="CD1_B.108" />);
        expect(screen.queryByText("Walking route")).toBeNull();
        expect(screen.queryByText("View room")).toBeNull();
    });
});

describe("RoomText link", () => {
    it("links the room code to the room itself, not the route", () => {
        links.value = { "ECSS_2.306": { roomUrl: "https://srv/room", wayfinderUrl: "https://srv/route" } };
        const linked = render(<RoomText value="ECSS_2.306" link />);
        const a = linked.container.querySelector("a")!;
        expect(a.textContent).toBe("ECSS 2.306");
        expect(a.getAttribute("href")).toBe("https://srv/room");
        expect(a.getAttribute("target")).toBe("_blank");
        linked.unmount();

        const plain = render(<RoomText value="ECSS_2.306" />);
        expect(plain.container.querySelectorAll("a")).toHaveLength(0);
    });

    it("falls back to the route for a room with no marker", () => {
        links.value = { "ECSS_2.999": { wayfinderUrl: "https://srv/route" } };
        const { container } = render(<RoomText value="ECSS_2.999" link />);
        expect(container.querySelector("a")?.getAttribute("href")).toBe("https://srv/route");
    });

    it("stays plain text when the server has nothing", () => {
        links.value = {};
        const { container } = render(<RoomText value="CD1_B.108" link />);
        expect(container.querySelectorAll("a")).toHaveLength(0);
    });
});