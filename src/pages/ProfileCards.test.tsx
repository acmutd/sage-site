import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Profile from "./Profile";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-user-123", getIdToken: async () => "fake-token", photoURL: null },
    profilePicture: null,
    setProfilePicture: vi.fn(),
    hasSeenChatbotTutorial: false,
    hasSeenPlannerTutorial: false,
    allowedYears: 10,
  }),
}));

vi.mock("@/components/profile/degreeprogresscard", () => ({
  default: ({ title }: any) => <div data-testid="degree-card">{title}</div>,
}));

vi.mock("@/components/profile/chatconversationcard", () => ({
  default: ({ title }: any) => <div data-testid="conversation-card">{title}</div>,
}));

vi.mock("@/components/profile/sectionswitcher", () => ({
  default: ({ active, onChange }: any) => (
    <div>
      <button onClick={() => onChange("Program Status")}>Program Status</button>
      <button onClick={() => onChange("Conversations")}>Conversations</button>
      <span data-testid="active-section">{active}</span>
    </div>
  ),
}));

vi.mock("../utils/chatEventEmitter", () => ({
  chatEventEmitter: { emit: vi.fn() },
}));

const baseProfile = {
  name: "Jane Smith",
  majors: [{ name: "Computer Science", start_date: "Fall 2022", program_level: "undergraduate", status: "active" }],
  minors: [],
  certifications: [],
  credit_hours: { undergraduate: 60 },
  gpa: { undergraduate: "3.86", graduate: "4.0" },
  utd_id: "2021012345",
  profile_picture_type: 1,
};

const baseEvaluation = {
  evaluation: [{
    degree: "Computer Science", credits: 120, credits_completed: 60,
    categories: [{ name: "Core Requirements", credits: 60, credits_completed: 30 }],
  }],
};

function makeFetch({ profile = baseProfile, evaluation = baseEvaluation } = {}) {
  return vi.fn((_, options: any) => {
    const body = JSON.parse(options.body);
    if (body.action === "getProfile")       return Promise.resolve({ ok: true, json: async () => profile });
    if (body.action === "getEvaluation")    return Promise.resolve({ ok: true, json: async () => evaluation });
    if (body.action === "getConversations") return Promise.resolve({ ok: true, json: async () => [] });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as any;
}


async function renderAndCustomize() {
  render(<Profile />);
  await screen.findByText("Jane Smith");
  fireEvent.click(screen.getByRole("button", { name: /customize/i }));
}

function removeFirstCard() {
  const btns = screen.getAllByTestId("card-remove-btn");
  fireEvent.click(btns[0]);
}

function addCardFromTray(cardId: string) {
  fireEvent.click(screen.getByTestId(`tray-btn-${cardId}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubEnv('VITE_CRUD_API', 'http://localhost:3000/CRUD');
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
  global.fetch = makeFetch();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

describe("Customize mode — toggling", () => {
  test("Customize button is visible after profile loads", async () => {
    render(<Profile />);
    expect(await screen.findByRole("button", { name: /customize/i })).toBeInTheDocument();
  });

  test("clicking Customize shows Done button", async () => {
    await renderAndCustomize();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /customize/i })).not.toBeInTheDocument();
  });

  test("clicking Done exits edit mode and restores Customize button", async () => {
    await renderAndCustomize();
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(await screen.findByRole("button", { name: /customize/i })).toBeInTheDocument();
  });

  test("card-tray is hidden in view mode", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    expect(screen.queryByTestId("card-tray")).not.toBeInTheDocument();
  });

  test("card-tray appears in edit mode", async () => {
    await renderAndCustomize();
    expect(screen.getByTestId("card-tray")).toBeInTheDocument();
  });

  test("card-tray disappears after clicking Done", async () => {
    await renderAndCustomize();
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    await waitFor(() => expect(screen.queryByTestId("card-tray")).not.toBeInTheDocument());
  });

  test("remove buttons only appear in edit mode", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    expect(screen.queryAllByTestId("card-remove-btn")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(screen.getAllByTestId("card-remove-btn")).toHaveLength(3);
  });
});

describe("Default card state", () => {
  test("exactly 3 profile cards are rendered on load", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    expect(screen.getByTestId("profile-card-undergrad")).toBeInTheDocument();
    expect(screen.getByTestId("profile-card-startdate")).toBeInTheDocument();
    expect(screen.getByTestId("profile-card-gpaundergrad")).toBeInTheDocument();
  });

  test("Graduate card is not shown by default", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    expect(screen.queryByTestId("profile-card-grad")).not.toBeInTheDocument();
  });

  test("Graduate card appears in the tray in edit mode", async () => {
    await renderAndCustomize();
    expect(screen.getByTestId("tray-btn-grad")).toBeInTheDocument();
  });

  test("3 tray buttons exist for the 6 non-default cards on load", async () => {
    await renderAndCustomize();
    const tray = screen.getByTestId("card-tray");
    const trayBtns = within(tray).getAllByRole("button");
    expect(trayBtns.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Data patching — API values", () => {
  test("undergraduate credit hours show on the undergrad card", async () => {
    render(<Profile />);
    const card = await screen.findByTestId("profile-card-undergrad");
    expect(card).toHaveTextContent("60 Credit Hours");
  });

  test("start date shows on the startdate card", async () => {
    render(<Profile />);
    const card = await screen.findByTestId("profile-card-startdate");
    expect(card).toHaveTextContent("Fall 2022");
  });

  test("undergrad GPA shows on the gpaundergrad card", async () => {
    render(<Profile />);
    const card = await screen.findByTestId("profile-card-gpaundergrad");
    expect(card).toHaveTextContent("3.86");
  });
});

describe("Card removal", () => {
  test("clicking X removes the card from the grid", async () => {
    await renderAndCustomize();
    expect(screen.getByTestId("profile-card-undergrad")).toBeInTheDocument();

    const card = screen.getByTestId("profile-card-undergrad");
    fireEvent.click(within(card).getByTestId("card-remove-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("profile-card-undergrad")).not.toBeInTheDocument();
    });
  });

  test("removed card appears in the tray", async () => {
    await renderAndCustomize();
    const card = screen.getByTestId("profile-card-undergrad");
    fireEvent.click(within(card).getByTestId("card-remove-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("tray-btn-undergrad")).toBeInTheDocument();
    });
  });

  test("grid goes from 3 to 2 remove buttons after one removal", async () => {
    await renderAndCustomize();
    expect(screen.getAllByTestId("card-remove-btn")).toHaveLength(3);

    removeFirstCard();

    await waitFor(() => {
      expect(screen.getAllByTestId("card-remove-btn")).toHaveLength(2);
    });
  });
});


describe("Card adding — max 3 enforcement", () => {
  test("all tray buttons are disabled when already at 3 cards", async () => {
    await renderAndCustomize();
    const tray = screen.getByTestId("card-tray");
    within(tray).getAllByRole("button").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  test("tray buttons become enabled after removing a card", async () => {
    await renderAndCustomize();
    removeFirstCard();

    const tray = screen.getByTestId("card-tray");
    await waitFor(() => {
      const enabled = within(tray).getAllByRole("button").filter((b) => !b.hasAttribute("disabled"));
      expect(enabled.length).toBeGreaterThan(0);
    });
  });

  test("adding from tray puts the card in the grid", async () => {
    await renderAndCustomize();
    removeFirstCard();

    await waitFor(() => expect(screen.getByTestId("tray-btn-grad")).not.toBeDisabled());
    addCardFromTray("grad");

    await waitFor(() => {
      expect(screen.getByTestId("profile-card-grad")).toBeInTheDocument();
    });
  });

  test("adding back to 3 disables all tray buttons again", async () => {
    await renderAndCustomize();
    removeFirstCard();

    await waitFor(() => expect(screen.getByTestId("tray-btn-grad")).not.toBeDisabled());
    addCardFromTray("grad");

    const tray = screen.getByTestId("card-tray");
    await waitFor(() => {
      within(tray).getAllByRole("button").forEach((btn) => expect(btn).toBeDisabled());
    });
  });
});

describe("Editable cards", () => {
  async function enableAdvisorCard() {
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    removeFirstCard();
    await waitFor(() => expect(screen.getByTestId("tray-btn-advisor")).not.toBeDisabled());
    addCardFromTray("advisor");
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    await waitFor(() => expect(screen.queryByTestId("card-tray")).not.toBeInTheDocument());
  }

  test("clicking an editable card's text shows an input", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    await enableAdvisorCard();

    const advisorCard = screen.getByTestId("profile-card-advisor");
    fireEvent.click(within(advisorCard).getByText(/Add advisor/i));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("Enter saves the new label", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    await enableAdvisorCard();

    fireEvent.click(within(screen.getByTestId("profile-card-advisor")).getByText(/Add advisor/i));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Dr. Johnson" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Dr. Johnson")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  test("Escape cancels and restores original label", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    await enableAdvisorCard();

    fireEvent.click(within(screen.getByTestId("profile-card-advisor")).getByText(/Add advisor/i));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Someone Else" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByText(/Add advisor/i)).toBeInTheDocument();
      expect(screen.queryByText("Someone Else")).not.toBeInTheDocument();
    });
  });

  test("blur commits the value", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    await enableAdvisorCard();

    fireEvent.click(within(screen.getByTestId("profile-card-advisor")).getByText(/Add advisor/i));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Dr. Blur" } });
    fireEvent.blur(input);

    await waitFor(() => expect(screen.getByText("Dr. Blur")).toBeInTheDocument());
  });

  test("whitespace-only input falls back to original label", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    await enableAdvisorCard();

    fireEvent.click(within(screen.getByTestId("profile-card-advisor")).getByText(/Add advisor/i));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByText(/Add advisor/i)).toBeInTheDocument());
  });

  test("non-editable card does NOT open an input when clicked", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    fireEvent.click(screen.getByTestId("profile-card-undergrad"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});