import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RoomDetails, RoomText } from "./RoomLabel";

describe("RoomText", () => {
    it("shows the room and floor, with the building name in the tooltip", () => {
        const { container } = render(<RoomText value="GR_2.530" />);
        expect(container.textContent).toContain("GR 2.530");
        expect(container.textContent).toContain("Floor 2");
        // the long name is deliberately not in the row text: it stretched the grid column
        expect(container.textContent).not.toContain("Cecil H. Green Hall");
        expect((container.firstChild as HTMLElement).getAttribute("title")).toContain("Cecil H. Green Hall");
    });

    it("can shrink inside a grid (min-w-0) so it never stretches its column", () => {
        const { container } = render(<RoomText value="ATC_2.602" />);
        expect((container.firstChild as HTMLElement).className).toContain("min-w-0");
    });

    it("shows no floor line when the floor is unknown", () => {
        const { container } = render(<RoomText value="SOM_12.218" />);
        expect(container.textContent).toBe("SOM 12.218");
    });

    it("shows +N when a section has several rooms", () => {
        const { container } = render(<RoomText value="ECSW_1.315; HH_2.402" />);
        expect(container.textContent).toContain("ECSW 1.315");
        expect(container.textContent).toContain("+1");
    });

    it("styles ONLINE (upper-case, as in the data) as online", () => {
        const { container } = render(<RoomText value="ONLINE" />);
        expect(container.textContent).toContain("Online");
        const cls = (container.firstChild as HTMLElement).className;
        expect(cls).toContain("text-[#5AED86]");
        expect(cls).not.toContain("text-gray-600"); // conflicting colour classes: gray used to win
    });

    it("shows TBA when the location is missing", () => {
        const { container } = render(<RoomText value={undefined} />);
        expect(container.textContent).toContain("TBA");
    });

    it("does not throw when the location is an array", () => {
        const { container } = render(<RoomText value={["GR_2.530"]} />);
        expect(container.textContent).toContain("GR 2.530");
    });

    it("renders no links", () => {
        const { container } = render(<RoomText value="GR_2.530" />);
        expect(container.querySelectorAll("a")).toHaveLength(0);
    });
});

describe("RoomDetails", () => {
    it("links to maps and walking directions for a known building", () => {
        const { container } = render(<RoomDetails value="GR_2.530" />);
        const links = Array.from(container.querySelectorAll("a"));
        expect(links.map(a => a.textContent)).toEqual(["Open in Maps", "Get directions"]);
        expect(links[0].getAttribute("href")).toContain("google.com/maps/search");
        expect(links[1].getAttribute("href")).toContain("travelmode=walking");
        for (const a of links) {
            expect(a.getAttribute("target")).toBe("_blank");
            expect(a.getAttribute("rel")).toContain("noopener");
        }
    });

    it("shows a room but no links for an unverified building", () => {
        const { container } = render(<RoomDetails value="CD1_B.108" />);
        expect(container.textContent).toContain("CD1 B.108");
        expect(container.querySelectorAll("a")).toHaveLength(0);
    });

    it("lists each room of a multi-room section", () => {
        const { container } = render(<RoomDetails value="ECSW_1.315; HH_2.402" />);
        expect(container.textContent).toContain("ECSW 1.315");
        expect(container.textContent).toContain("HH 2.402");
        expect(container.querySelectorAll("a")).toHaveLength(4);
    });

    it("says nothing for online sections beyond a short note", () => {
        const { container } = render(<RoomDetails value="ONLINE" />);
        expect(container.querySelectorAll("a")).toHaveLength(0);
        expect(container.textContent).toContain("Online");
    });

    it("renders nothing when there is no room", () => {
        const { container } = render(<RoomDetails value="" />);
        expect(container.firstChild).toBeNull();
    });
});