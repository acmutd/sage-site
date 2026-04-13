import { render, screen, fireEvent, waitFor, within, cleanup } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Profile from "./Profile";
import * as AuthModule from '../context/AuthContext';

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUser = {
  uid: 'test-user-123',
  photoURL: null,
  getIdToken: vi.fn().mockResolvedValue('fake-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
} as any;

const mockAuth = {
  user: mockUser,
  loading: false,
  logout: vi.fn(),
  profilePicture: null,
  setProfilePicture: vi.fn(),
  authChecking: false,
  setAuthChecking: vi.fn(),
  allowedYears: 10,
  hasSeenChatbotTutorial: false,
  hasSeenPlannerTutorial: false,
};

vi.mock("@/components/profile/degreeprogresscard", () => ({
  default: ({ title, percentage, completed, total }: any) => (
    <div data-testid="degree-card" data-percentage={percentage}>
      <span data-testid="card-title">{title}</span>
      <span data-testid="card-progress">{completed}/{total}</span>
    </div>
  ),
}));

vi.mock("@/components/profile/chatconversationcard", () => ({
  default: ({ title, onOpen, timestamp }: any) => (
    <div data-testid="conversation-card" onClick={onOpen}>
      <span data-testid="conv-title">{title}</span>
      <span data-testid="conv-timestamp">{timestamp}</span>
    </div>
  ),
}));

vi.mock("@/components/profile/sectionswitcher", () => ({
  default: ({ active, onChange }: any) => (
    <div data-testid="section-switcher">
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
  majors: [
    {
      name: "Computer Science",
      start_date: "Fall 2022",
      program_level: "undergraduate",
      status: "active",
    },
  ],
  minors: [],
  certifications: [],
  credit_hours: { undergraduate: 60 },
  gpa: { undergraduate: "3.86", graduate: "0.0" },
  utd_id: "2021012345",
  profile_picture_type: 1,
};

const baseEvaluation = {
  evaluation: [
    {
      degree: "Computer Science",
      credits: 120,
      credits_completed: 60,
      categories: [
        { name: "Core Requirements", credits: 60, credits_completed: 30 },
        { name: "Electives", credits: 60, credits_completed: 30 },
      ],
    },
  ],
};

const baseConversations = [
  {
    conversation_id: "conv-1",
    user_id: "test-user-123",
    title: "Degree Planning Help",
    messages: [
      { role: "user", content: "What courses should I take?", timestamp: Date.now() - 1000 * 60 * 5 },
      { role: "assistant", content: "Great question!", timestamp: Date.now() - 1000 * 60 * 4 },
    ],
  },
  {
    conversation_id: "conv-2",
    user_id: "test-user-123",
    title: "Graduation Requirements",
    messages: [
      { role: "user", content: "When can I graduate?", timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    ],
  },
];


function makeFetch({
  profile = baseProfile,
  evaluation = baseEvaluation,
  conversations = baseConversations,
  profileOk = true,
}: {
  profile?: any;
  evaluation?: any;
  conversations?: any;
  profileOk?: boolean;
} = {}) {
  return vi.fn((_, options: any) => {
    const body = JSON.parse(options.body);

    if (body.action === "getProfile") {
      return Promise.resolve({ ok: profileOk, json: async () => profile });
    }
    if (body.action === "getEvaluation") {
      return Promise.resolve({ ok: true, json: async () => evaluation });
    }
    if (body.action === "getConversations") {
      return Promise.resolve({ ok: true, json: async () => conversations });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) }); // Catch-all: resolve silently to prevent cross-test unhandled rejections
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubEnv('VITE_CRUD_API', 'http://localhost:3000/CRUD');
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
  global.fetch = makeFetch();
  vi.spyOn(AuthModule, 'useAuth').mockReturnValue(mockAuth);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

vi.mock('../firebase-config', () => ({
  auth: {},
  app: {},
}));

describe("Unit — profile info rendering", () => {
  test("displays the user's name from API", async () => {
    render(<Profile />);
    expect(await screen.findByText("Jane Smith")).toBeInTheDocument();
  });

  test("displays undergraduate credit hours", async () => {
    render(<Profile />);
    expect(await screen.findByText(/60 Credit Hours/i)).toBeInTheDocument();
  });

  test("displays the start date from the first major", async () => {
    render(<Profile />);
    expect(await screen.findByText("Fall 2022")).toBeInTheDocument();
  });

  test("graduate card is disabled by default and shows in the swap tray", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(screen.getByTestId("tray-btn-grad")).toBeInTheDocument();
  });
});

describe("Unit — degree progress card data", () => {
  test("renders a degree card for each degree in evaluation", async () => {
    render(<Profile />);
    const cards = await screen.findAllByTestId("degree-card");
    expect(cards).toHaveLength(1);
  });

  test("degree card shows correct title", async () => {
    render(<Profile />);
    const title = await screen.findByTestId("card-title");
    expect(title).toHaveTextContent("Computer Science");
  });
});

describe("Regression — section switching", () => {
  test("switching to Conversations hides program cards and shows conversation cards", async () => {
    render(<Profile />);
    await screen.findByTestId("degree-card");

    fireEvent.click(screen.getByText("Conversations"));

    await waitFor(() => {
      expect(screen.queryByTestId("degree-card")).not.toBeInTheDocument();
      expect(screen.getAllByTestId("conversation-card").length).toBeGreaterThan(0);
    });
  });

  test("switching back to Program Status shows degree cards again", async () => {
    render(<Profile />);
    await screen.findByTestId("degree-card");

    fireEvent.click(screen.getByText("Conversations"));
    await screen.findAllByTestId("conversation-card");

    fireEvent.click(screen.getByText("Program Status"));

    await waitFor(() => {
      expect(screen.queryByTestId("conversation-card")).not.toBeInTheDocument();
      expect(screen.getByTestId("degree-card")).toBeInTheDocument();
    });
  });

  test("active section label updates correctly when switching", async () => {
    render(<Profile />);
    await screen.findByTestId("active-section");

    expect(screen.getByTestId("active-section")).toHaveTextContent("Program Status");

    fireEvent.click(screen.getByText("Conversations"));

    await waitFor(() => {
      expect(screen.getByTestId("active-section")).toHaveTextContent("Conversations");
    });
  });
});

describe("Regression — program filter buttons", () => {
  test("filter buttons render All, Active, Complete on Program Status section", async () => {
    render(<Profile />);
    await screen.findByTestId("degree-card");

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
  });

  test("filter buttons disappear when on Conversations section", async () => {
    render(<Profile />);
    await screen.findByTestId("degree-card");

    fireEvent.click(screen.getByText("Conversations"));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    });
  });

  test("New Chat button appears (not filters) when on Conversations section", async () => {
    render(<Profile />);
    await screen.findByText("Conversations");
    fireEvent.click(screen.getByText("Conversations"));

    expect(await screen.findByRole("button", { name: /new chat/i })).toBeInTheDocument();
  });

  test("Active filter hides completed degree cards", async () => {
    const mixedProfile = {
      ...baseProfile,
      majors: [
        { name: "Computer Science", start_date: "Fall 2022", program_level: "undergraduate", status: "active" },
        { name: "Mathematics", start_date: "Fall 2020", program_level: "undergraduate", status: "complete" },
      ],
    };
    const mixedEvaluation = {
      evaluation: [
        { degree: "Computer Science", credits: 120, credits_completed: 60, categories: [] },
        { degree: "Mathematics", credits: 120, credits_completed: 120, categories: [] },
      ],
    };

    global.fetch = makeFetch({ profile: mixedProfile, evaluation: mixedEvaluation });
    render(<Profile />);

    await screen.findAllByTestId("degree-card");
    expect(screen.getAllByTestId("degree-card")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    await waitFor(() => {
      expect(screen.getAllByTestId("degree-card")).toHaveLength(1);
      expect(screen.getByTestId("card-title")).toHaveTextContent("Computer Science");
    });
  });

  test("Complete filter shows only completed programs", async () => {
    const mixedProfile = {
      ...baseProfile,
      majors: [
        { name: "Computer Science", start_date: "Fall 2022", program_level: "undergraduate", status: "active" },
        { name: "Mathematics", start_date: "Fall 2020", program_level: "undergraduate", status: "complete" },
      ],
    };
    const mixedEvaluation = {
      evaluation: [
        { degree: "Computer Science", credits: 120, credits_completed: 60, categories: [] },
        { degree: "Mathematics", credits: 120, credits_completed: 120, categories: [] },
      ],
    };

    global.fetch = makeFetch({ profile: mixedProfile, evaluation: mixedEvaluation });
    render(<Profile />);

    await screen.findAllByTestId("degree-card");

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => {
      const cards = screen.getAllByTestId("degree-card");
      expect(cards).toHaveLength(1);
      expect(within(cards[0]).getByTestId("card-title")).toHaveTextContent("Mathematics");
    });
  });

  test("switching from Active back to All shows all cards again", async () => {
    const mixedProfile = {
      ...baseProfile,
      majors: [
        { name: "Computer Science", start_date: "Fall 2022", program_level: "undergraduate", status: "active" },
        { name: "Mathematics", start_date: "Fall 2020", program_level: "undergraduate", status: "complete" },
      ],
    };
    const mixedEvaluation = {
      evaluation: [
        { degree: "Computer Science", credits: 120, credits_completed: 60, categories: [] },
        { degree: "Mathematics", credits: 120, credits_completed: 120, categories: [] },
      ],
    };

    global.fetch = makeFetch({ profile: mixedProfile, evaluation: mixedEvaluation });
    render(<Profile />);

    await screen.findAllByTestId("degree-card");

    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    await waitFor(() => expect(screen.getAllByTestId("degree-card")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() => expect(screen.getAllByTestId("degree-card")).toHaveLength(2));
  });
});

describe("Regression — navigation", () => {
  test("clicking a conversation card navigates to /chatbot", async () => {
    render(<Profile />);
    fireEvent.click(screen.getByText("Conversations"));

    const cards = await screen.findAllByTestId("conversation-card");
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/chatbot");
    });
  });

  test("New Chat button navigates to /chatbot", async () => {
    render(<Profile />);
    fireEvent.click(screen.getByText("Conversations"));

    const btn = await screen.findByRole("button", { name: /new chat/i });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/chatbot");
  });
});

describe("Integration — API data flow", () => {
  test("calls getProfile, getEvaluation, and getConversations on mount", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    const calls = (global.fetch as any).mock.calls.map((c: any[]) => JSON.parse(c[1].body).action);
    expect(calls).toContain("getProfile");
    expect(calls).toContain("getEvaluation");
    expect(calls).toContain("getConversations");
  });

  test("all API calls include the auth token", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    const bodies = (global.fetch as any).mock.calls.map((c: any[]) => JSON.parse(c[1].body));
    bodies.forEach((body: any) => {
      expect(body.token).toBe("fake-token");
    });
  });

  test("conversations are sorted newest-first", async () => {
    render(<Profile />);
    fireEvent.click(screen.getByText("Conversations"));

    const titles = await screen.findAllByTestId("conv-title");
    // conv-1 is ~5min ago, conv-2 is ~24hrs ago — conv-1 should be first
    expect(titles[0]).toHaveTextContent("Degree Planning Help");
    expect(titles[1]).toHaveTextContent("Graduation Requirements");
  });

  test("warms the conversation cache after fetching from API", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    const cache = localStorage.getItem("chatbot_conversations");
    expect(cache).not.toBeNull();

    const parsed = JSON.parse(cache!);
    expect(parsed.userId).toBe("test-user-123");
    expect(Array.isArray(parsed.data)).toBe(true);
  });

  test("BUG: cache removeItem at top of getUserInfo makes cache read unreachable", async () => {
    const freshCache = {
      data: baseConversations,
      timestamp: Date.now(),
      userId: "test-user-123",
    };
    localStorage.setItem("chatbot_conversations", JSON.stringify(freshCache));

    render(<Profile />);
    await screen.findByText("Jane Smith");

    const calls = (global.fetch as any).mock.calls.map((c: any[]) => JSON.parse(c[1].body).action);
    expect(calls).not.toContain("getConversations")
  });

  test("ignores stale cache (>1 hour old) and re-fetches conversations", async () => {
    const staleCache = {
      data: baseConversations,
      timestamp: Date.now() - 1000 * 60 * 61,
      userId: "test-user-123",
    };
    localStorage.setItem("chatbot_conversations", JSON.stringify(staleCache));

    render(<Profile />);
    await screen.findByText("Jane Smith");

    const calls = (global.fetch as any).mock.calls.map((c: any[]) => JSON.parse(c[1].body).action);
    expect(calls).toContain("getConversations");
  });

  test("ignores cache belonging to a different user", async () => {
    const wrongUserCache = {
      data: baseConversations,
      timestamp: Date.now(),
      userId: "different-user-999",
    };
    localStorage.setItem("chatbot_conversations", JSON.stringify(wrongUserCache));

    render(<Profile />);
    await screen.findByText("Jane Smith");

    const calls = (global.fetch as any).mock.calls.map((c: any[]) => JSON.parse(c[1].body).action);
    expect(calls).toContain("getConversations");
  });
});


describe("Boundary — empty and missing data", () => {
  test("shows missing transcript modal when evaluation returns no_transcript", async () => {
    global.fetch = makeFetch({ evaluation: { status: "no_transcript" } });
    render(<Profile />);
    expect(await screen.findByText(/missing profile information/i)).toBeInTheDocument();
  });

  test("missing transcript modal has Return Home and Submit Transcript buttons", async () => {
    global.fetch = makeFetch({ evaluation: { status: "no_transcript" } });
    render(<Profile />);

    await screen.findByText(/missing profile information/i);
    expect(screen.getByRole("button", { name: /return home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit transcript/i })).toBeInTheDocument();
  });

  test("Return Home button navigates to /", async () => {
    global.fetch = makeFetch({ evaluation: { status: "no_transcript" } });
    render(<Profile />);

    await screen.findByText(/missing profile information/i);
    fireEvent.click(screen.getByRole("button", { name: /return home/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("Submit Transcript button navigates to /planner", async () => {
    global.fetch = makeFetch({ evaluation: { status: "no_transcript" } });
    render(<Profile />);

    await screen.findByText(/missing profile information/i);
    fireEvent.click(screen.getByRole("button", { name: /submit transcript/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/planner");
  });


  test("BUG — Object.keys(convData[0]) crashes when conversations is empty array", async () => {
    global.fetch = makeFetch({ conversations: [] });
    render(<Profile />);

    fireEvent.click(screen.getByText("Conversations"));

    // After the fix, this should show the empty state message cleanly
    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });

  test("shows no degree cards when all programs filtered out", async () => {
    render(<Profile />);
    await screen.findByTestId("degree-card");

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => {
      expect(screen.queryByTestId("degree-card")).not.toBeInTheDocument();
    });
  });

  test("handles user with majors, minors, and certifications", async () => {
    const richProfile = {
      ...baseProfile,
      majors: [
        { name: "Computer Science", start_date: "Fall 2022", program_level: "undergraduate", status: "active" },
      ],
      minors: [
        { name: "Mathematics", start_date: "Fall 2022", program_level: "undergraduate", status: "active" },
      ],
      certifications: [
        { name: "Data Science", start_date: "Fall 2023", program_level: "undergraduate", status: "active" },
      ],
    };
    const richEvaluation = {
      evaluation: [
        { degree: "Computer Science", credits: 120, credits_completed: 60, categories: [] },
        { degree: "Mathematics", credits: 18, credits_completed: 9, categories: [] },
        { degree: "Data Science", credits: 15, credits_completed: 6, categories: [] },
      ],
    };

    global.fetch = makeFetch({ profile: richProfile, evaluation: richEvaluation });
    render(<Profile />);

    const cards = await screen.findAllByTestId("degree-card");
    expect(cards).toHaveLength(3);
  });

  test("handles conversation with no title (falls back to first message content)", async () => {
    const noTitleConvos = [
      {
        conversation_id: "conv-notitle",
        user_id: "test-user-123",
        title: null,
        messages: [{ role: "user", content: "First message fallback", timestamp: Date.now() }],
      },
    ];

    global.fetch = makeFetch({ conversations: noTitleConvos });
    render(<Profile />);
    fireEvent.click(screen.getByText("Conversations"));

    expect(await screen.findByText("First message fallback")).toBeInTheDocument();
  });

  test("handles completely empty evaluation array without crashing", async () => {
    global.fetch = makeFetch({ evaluation: { evaluation: [] } });
    render(<Profile />);

    await screen.findByText("Jane Smith");
    expect(screen.queryByTestId("degree-card")).not.toBeInTheDocument();
  });
});


describe("UI — profile picture picker", () => {
  test("profile pic popup is hidden by default", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");
    expect(screen.queryByText(/pick your favorite peechi/i)).not.toBeInTheDocument();
  });

  test("clicking the profile picture opens the picker modal", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    const profileButtons = screen.getAllByRole("button");
    const picButton = profileButtons.find(btn => btn.querySelector("img"));
    fireEvent.click(picButton!);

    expect(await screen.findByText(/pick your favorite peechi/i)).toBeInTheDocument();
  });

  test("clicking outside the picker modal closes it", async () => {
    render(<Profile />);
    await screen.findByText("Jane Smith");

    const profileButtons = screen.getAllByRole("button");
    const picButton = profileButtons.find(btn => btn.querySelector("img"));
    fireEvent.click(picButton!);
    await screen.findByText(/pick your favorite peechi/i);

    const backdrop = document.querySelector(".fixed.inset-0");
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.queryByText(/pick your favorite peechi/i)).not.toBeInTheDocument();
    });
  });
});

describe("UI — responsive layout", () => {
  test("renders on tablet viewport without crashing", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 900 });
    fireEvent(window, new Event("resize"));

    render(<Profile />);
    expect(await screen.findByText("Jane Smith")).toBeInTheDocument();
  });

  test("renders on mobile viewport without crashing", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    fireEvent(window, new Event("resize"));

    render(<Profile />);
    expect(await screen.findByText("Jane Smith")).toBeInTheDocument();
  });

  test("mobile view shows a dropdown for program filter instead of buttons", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    fireEvent(window, new Event("resize"));

    render(<Profile />);
    await screen.findByText("Jane Smith");

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Active" })).not.toBeInTheDocument();
  });
});