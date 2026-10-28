import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import DesktopOnlyNotice from "./DesktopOnlyNotice";

// jsdom has no matchMedia; this one answers the notice's max-width query from a settable width
function mockViewportWidth(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Set<() => void>();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (media: string) => ({
      media,
      get matches() {
        return width <= 1023;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }),
  });
  return {
    resize(nextWidth: number) {
      width = nextWidth;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

const TITLE = /best viewed on a desktop/i;

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("DesktopOnlyNotice", () => {
  it("shows on a phone-sized viewport", () => {
    mockViewportWidth(390);
    render(<DesktopOnlyNotice />);

    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("stays hidden on a desktop viewport", () => {
    mockViewportWidth(1440);
    render(<DesktopOnlyNotice />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("appears when the window is narrowed below the desktop breakpoint", () => {
    const viewport = mockViewportWidth(1440);
    render(<DesktopOnlyNotice />);

    viewport.resize(800);

    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("lets the user continue, and stays dismissed for the session", () => {
    mockViewportWidth(390);
    const { unmount } = render(<DesktopOnlyNotice />);

    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    render(<DesktopOnlyNotice />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
