import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MoveLeft, MoveRight, Pencil, Plus, SaveIcon, Sparkles, X } from "lucide-react";
import DegreeProgressCard from "@/components/profile/degreeprogresscard";
import { useAuth } from "../context/AuthContext";
import SectionSwitcher, { ProfileSection } from "@/components/profile/sectionswitcher";
import ChatConversationCard from "@/components/profile/chatconversationcard"
import { chatEventEmitter } from "../utils/chatEventEmitter";
import { Conversation } from "@/types/chat"

interface Card {
  id: string;
  label: string;
  sublabel: string;
  enabled: boolean;
  editable: boolean;
}

const MAX_CARDS = 3;

const DEFAULT_CARDS: Card[] = [
  { id: "undergrad", label: "0 Credit Hours", sublabel: "Undergraduate", enabled: true, editable: false },
  { id: "startdate", label: "—", sublabel: "Start Date", enabled: true, editable: false },
  { id: "gpaundergrad", label: "—", sublabel: "GPA Average (Undergrad)", enabled: true,  editable: false },
  { id: "gpagrad", label: "—", sublabel: "GPA Average (Grad)", enabled: false, editable: false },
  { id: "grad", label: "0 Credit Hours", sublabel: "Graduate", enabled: false, editable: false },
  { id: "advisor", label: "Add advisor…", sublabel: "Advisor", enabled: false, editable: true  },
  { id: "holds", label: "No Holds", sublabel: "Deadlines & Holds", enabled: false, editable: true  },
  { id: "note", label: "Add a note…", sublabel: "Personal Note", enabled: false, editable: true  },
  { id: "utdid", label: "—", sublabel: "UTD ID", enabled: false, editable: false },
];

function EditableCardContent({ card, onSave }: { card: Card; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(card.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(card.label); }, [card.label]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = () => {
    const val = draft.trim() || card.label;
    onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  commit();
            if (e.key === "Escape") { setDraft(card.label); setEditing(false); }
          }}
          onBlur={commit}
          className="font-semibold text-sm text-textdark bg-transparent border-0 border-b-2 border-accent outline-none w-full text-center"
        />
        <span className="text-[10px] font-semibold">Enter to Save or esc to cancel</span>
      </div>
    );
  }

  return (
    <div onClick={() => setEditing(true)} className="flex items-center gap-1 cursor-text group">
    <h3 className="group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2 transition-all">{card.label}</h3>
    </div>
  );
}

const Profile = () => {
  const { user } = useAuth();
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [tabletView, setTabletView] = useState(false);
  const [profilepic, setProfilePic] = useState(() => {
    const cached = localStorage.getItem('profilePictureType');
    if (cached) {
      const type = parseInt(cached);
      return type === 0 && user?.photoURL ? user.photoURL : `/assets/profile_pics/${type}.png`;
    }
    return "/assets/profile_pics/1.png";
  });
  const [profilePictureType, setProfilePictureType] = useState(1);
  const [googlePhotoURL, setGooglePhotoURL]         = useState<string | null>(null);
  const [isPopUpOpen, setIsPopUpOpen]               = useState(false);
  const [program, setProgram]                        = useState("All");
  const [currentIndex, setCurrentIndex]             = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [carouselData, setCarouselData] = useState<Array<{
    title: string;
    categories: { label: string; completed: number; total: number }[];
    completed: number;
    total: number;
    percentage: number;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
  }>>([]);
  const [majorsData, setMajorsData] = useState<Array<{ name: string; start_date: string; program_level: string; status: string }>>([]);
  const [section, setSection]         = useState<ProfileSection>("Program Status");
  const [conversationsData, setConversationsData] = useState<Conversation[]>([]);
  const cardWidthPercent = mobileView ? 69 : tabletView ? 55 : 34;
  const navigate = useNavigate();

  // ── Customizable Cards state ──
  const [cards, setCards]                       = useState<Card[]>(DEFAULT_CARDS);
  const [isEditing, setIsEditing]               = useState(false);
  const [dragIndex, setDragIndex]               = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex]       = useState<number | null>(null);
  const [justDropped, setJustDropped]           = useState<string | null>(null);
  const [savedFlash, setSavedFlash]             = useState<string | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const enabledCards  = cards.filter((c) => c.enabled);
  const disabledCards = cards.filter((c) => !c.enabled);

  const toggleCard = (id: string) =>
    setCards((p) => {
      const target = p.find((c) => c.id === id)!;
      // If turning on, only allow if under the max
      if (!target.enabled && p.filter((c) => c.enabled).length >= MAX_CARDS) return p;
      return p.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c);
    });
  const saveCardLabel = (id: string, val: string) => {
    setCards((p) => p.map((c) => c.id === id ? { ...c, label: val } : c));
    setSavedFlash(id);
    setTimeout(() => setSavedFlash(null), 1800);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!isEditing) return;
    dragNode.current = e.currentTarget;
    setDragIndex(index);
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  };
  const handleDragEnter = (_e: React.DragEvent, index: number) => {
    if (index !== dragIndex) setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragOverIndex !== null && dragOverIndex !== dragIndex && dragIndex !== null) {
      const enabled  = cards.filter((c) => c.enabled);
      const disabled = cards.filter((c) => !c.enabled);
      const moved = enabled.splice(dragIndex, 1)[0];
      enabled.splice(dragOverIndex, 0, moved);
      setCards([...enabled, ...disabled]);
      setJustDropped(moved.id);
      setTimeout(() => setJustDropped(null), 600);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  type EvaluatorData = Array<{
    degree: string;
    credits: number;
    credits_completed: number;
    categories: Array<{ name: string; credits: number; credits_completed: number }>;
  }>;

  useEffect(() => {
    if (user?.photoURL) {
      setGooglePhotoURL(user.photoURL);
      if (profilePictureType === 0) setProfilePic(user.photoURL);
    }
    getUserInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.photoURL]);

  useEffect(() => {
    const updateTransform = () => {
      if (!carouselRef.current) return;
      const W = carouselRef.current.parentElement!.offsetWidth;
      const cardWidth = W * 0.34;
      carouselRef.current.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
    };
    updateTransform();
    window.addEventListener("resize", updateTransform);
    return () => window.removeEventListener("resize", updateTransform);
  }, [currentIndex, cardWidthPercent]);

  useEffect(() => { setCurrentIndex(0); }, [program]);

  const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;
  const cardsPerView = mobileView ? 1 : tabletView ? 1 : 2;

  const filteredCarouselData = carouselData.filter((card) => {
    if (program === "All") return true;
    return card.status!.toLowerCase() === program.toLowerCase();
  });
  const maxIndex = Math.max(0, filteredCarouselData.length - cardsPerView);

  const [convIndex, setConvIndex] = useState(0);
  const convCarouselRef = useRef<HTMLDivElement>(null);
  const maxConvIndex = Math.max(0, conversationsData.length - cardsPerView);
  const goToConvPrevious = () => setConvIndex((p) => (p > 0 ? p - 1 : p));
  const goToConvNext     = () => setConvIndex((p) => (p < maxConvIndex ? p + 1 : p));
  const goToConvSlide    = (i: number) => setConvIndex(i);

  useEffect(() => {
    const update = () => {
      if (!convCarouselRef.current) return;
      const W = convCarouselRef.current.parentElement!.offsetWidth;
      const cardWidth = W * (cardWidthPercent / 100);
      convCarouselRef.current.style.transform = `translateX(-${convIndex * cardWidth}px)`;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [convIndex, cardWidthPercent]);

  const goToPrevious = () => setCurrentIndex((p) => (p > 0 ? p - 1 : p));
  const goToNext     = () => setCurrentIndex((p) => (p < maxIndex ? p + 1 : p));
  const goToSlide    = (i: number) => setCurrentIndex(i);

  const parseYear = (date: string | undefined) => {
    if (!date) return null;
    const year = date.split(" ").find((part) => /^\d{4}$/.test(part));
    return year ?? null;
  };

  function formatCarouselData(evaluatorResponse: EvaluatorData, majors: typeof majorsData) {
    const core    = evaluatorResponse.find((d) => d.degree === "Core Requirements");
    const degrees = evaluatorResponse.filter((d) => d.degree !== "Core Requirements");
    if (!degrees.length) return [];
    return degrees.map((degree) => {
      const matchedMajor = majors.find((m) => degree.degree.includes(m.name) || m.name.includes(degree.degree));
      const isBachelor =
        matchedMajor?.program_level?.toLowerCase() === "undergraduate" &&
        !degree.degree.toLowerCase().includes("minor") &&
        !degree.degree.toLowerCase().includes("certificate") &&
        !degree.degree.toLowerCase().includes("certification");
      const allCategories = [
        ...(isBachelor && core ? [{ label: "Core Requirements", completed: core.credits_completed, total: core.credits }] : []),
        ...degree.categories.map((c) => ({
          label: c.name.split(":")[0].trim().replace(/^[IVX]+\.\s*/i, ""),
          completed: c.credits_completed,
          total: c.credits,
        })),
      ];
      const completed = (core?.credits_completed ?? 0) + degree.credits_completed;
      const total     = (core?.credits ?? 0) + degree.credits;
      return {
        title: degree.degree,
        categories: allCategories,
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
        startDate: parseYear(matchedMajor?.start_date),
        endDate: null,
        status: matchedMajor?.status ?? "active",
      };
    });
  }

  async function pickProfile(picNumber: number) {
    const token = await user?.getIdToken();
    const currentType = parseInt(localStorage.getItem('profilePictureType') ?? '1');
    const newType = currentType === picNumber ? (googlePhotoURL ? 0 : 1) : picNumber;
    const res = await fetch(CRUD_API as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.uid, action: "updateProfile", token, profile_picture_type: newType }),
    });
    const result = await res.json();
    console.log("updateProfile response:", result);
    setProfilePictureType(newType);
    localStorage.setItem('profilePictureType', newType.toString());
    window.dispatchEvent(new Event('storage'));
    if (newType === 0 && googlePhotoURL) setProfilePic(googlePhotoURL);
    else setProfilePic(`/assets/profile_pics/${newType}.png`);
    setIsPopUpOpen(false);
  }

  function pickProgram(prog: string) { setProgram(prog); }

  async function getUserInfo() {
    const token = await user?.getIdToken();
    if (!token) throw new Error("Failed to retrieve authentication token.");
    const response = await fetch(CRUD_API as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.uid, action: "getProfile", token }),
    });
    if (!response.ok) throw new Error("Failed to fetch user info");
    const data = await response.json();

    setMajorsData([...(data.majors ?? []), ...(data.minors ?? []), ...(data.certifications ?? [])]);
    setName(data.name);

    const ug = data.credit_hours.undergraduate ?? 0;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === "undergrad") return { ...c, label: `${ug} Credit Hours` };
        if (c.id === "grad")      return { ...c, label: `0 Credit Hours` };
        if (c.id === "startdate") return { ...c, label: data.majors[0].start_date || "—" };
        if (c.id === "gpaundergrad") return {...c, label: data.gpa.undergraduate || "-"};
        if (c.id === "gpagrad") return {...c, label: data.gpa.graduate || "-"};
        if (c.id === "utdid") return {...c, label: data.utd_id};
        return c;
      })
    );

    const picType = data.profile?.["user-fields"]?.profile_picture_type ?? data.profile_picture_type ?? 1;
    setProfilePictureType(picType);
    localStorage.setItem('profilePictureType', picType.toString());
    if (user?.photoURL) setGooglePhotoURL(user.photoURL);
    if (picType === 0 && user?.photoURL) setProfilePic(user.photoURL);
    else setProfilePic(`/assets/profile_pics/${picType}.png`);

    const evalResponse = await fetch(CRUD_API as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.uid, action: "getEvaluation", token }),
    });
    if (evalResponse.ok) {
      const evalData = await evalResponse.json();
      if (evalData.status === "no_transcript") { setShowMissingInfoModal(true); return; }
      const allPrograms = [...(data.majors ?? []), ...(data.minors ?? []), ...(data.certifications ?? [])];
      setCarouselData(formatCarouselData(evalData.evaluation, allPrograms));
    }

    const cachedConvos = localStorage.getItem("chatbot_conversations");
    let loadedFromCache = false;
    if (cachedConvos) {
      const parsed = JSON.parse(cachedConvos);
      const cacheAge   = Date.now() - (parsed?.timestamp ?? 0);
      const cacheValid = cacheAge < 1000 * 60 * 60 && parsed?.userId === user?.uid;
      if (cacheValid && Array.isArray(parsed?.data)) {
        const sortedCache = [...parsed.data].sort((a: Conversation, b: Conversation) => {
          const aTime = new Date(a.messages?.[a.messages.length - 1]?.timestamp || 0).getTime();
          const bTime = new Date(b.messages?.[b.messages.length - 1]?.timestamp || 0).getTime();
          return bTime - aTime;
        });
        setConversationsData(sortedCache);
        loadedFromCache = true;
      }
    }
    if (!loadedFromCache) {
      const convResponse = await fetch(CRUD_API as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid, action: "getConversations", token }),
      });
      const parseTs = (ts: any): number => {
        if (!ts) return 0;
        if (typeof ts === "number") return ts;
        return new Date(String(ts).replace(/(\.\d{3})\d+/, "$1")).getTime();
      };
      if (convResponse.ok) {
        const convData = await convResponse.json();
        const convs = Array.isArray(convData)
          ? convData.map((conv: Conversation) => ({ ...conv, title: conv.title || conv.messages?.[0]?.content || "Untitled Conversation" }))
          : [];
        const sorted = [...convs].sort((a, b) => {
          const aTime = parseTs(a.messages?.[a.messages.length - 1]?.timestamp);
          const bTime = parseTs(b.messages?.[b.messages.length - 1]?.timestamp);
          return bTime - aTime;
        });
        setConversationsData(sorted);
        localStorage.setItem("chatbot_conversations", JSON.stringify({ data: sorted, timestamp: Date.now(), userId: user?.uid }));
      }
    }
  }

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setMobileView(w < 768);
      setTabletView(w >= 768 && w < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    getUserInfo();
    return () => window.removeEventListener("resize", handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatConvoTimestamp(ms: number): string {
    if (!ms) return "";
    const date = new Date(ms);
    const now   = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const handleOpenConversation = (conv: Conversation) => {
    chatEventEmitter.emit("loadConversation", { conversationId: conv.conversation_id, messages: conv.messages, userId: user?.uid });
    localStorage.setItem("chatbot_conversation", JSON.stringify({ messages: conv.messages, conversation_id: conv.conversation_id, timestamp: Date.now(), cacheUserId: user?.uid ?? null }));
    navigate("/chatbot");
  };

  return (
    <>
      <style>{`
        @keyframes savedPop  { 0%{transform:scale(1)} 40%{transform:scale(1.02)} 100%{transform:scale(1)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="flex bg-bglight py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)] overflow-y-auto">
        {mobileView ? (
          <div className="text-textdark w-full flex flex-col gap-5">
            <div className="border border-card-bord rounded-3xl bg-innercontainer p-4 flex flex-row gap-4 items-stretch">
              <button onClick={() => setIsPopUpOpen(true)} className="flex-shrink-0">
                <img src={profilepic} draggable={false} className="w-28 h-28 object-cover rounded-2xl" />
              </button>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <p className="font-semibold text-lg">{name}</p>
                {enabledCards.map((card) => (
                  <div key={card.id} data-testid={`profile-card-${card.id}`} className="border border-card-bord bg-white rounded-xl px-3 py-2 flex flex-col">
                    <span className="font-semibold text-sm">{card.label}</span>
                    <span className="text-xs text-[#6C6C6C]">{card.sublabel}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-row justify-between items-center">
              <h2 className="text-xl font-semibold">Program Status</h2>
              <div className="relative">
                <select value={program} onChange={(e) => pickProgram(e.target.value)}
                  className="appearance-none border border-card-bord rounded-full pl-4 pr-8 py-1.5 text-sm bg-white text-textdark cursor-pointer">
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Complete">Complete</option>
                </select>
                <MoveRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-textdark rotate-90 pointer-events-none" />
              </div>
            </div>

            <div className="relative w-full">
              {carouselData.length > 0 && (
                <DegreeProgressCard
                  title={carouselData[currentIndex].title}
                  categories={carouselData[currentIndex].categories}
                  completed={carouselData[currentIndex].completed}
                  total={carouselData[currentIndex].total}
                  percentage={carouselData[currentIndex].percentage}
                  startDate={carouselData[currentIndex].startDate ?? undefined}
                  endDate={carouselData[currentIndex].endDate!}
                  active={false}
                />
              )}
              <div className="flex justify-between">
                <button onClick={goToPrevious} disabled={currentIndex === 0}
                  className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30">
                  <MoveLeft className="w-4 h-4 text-gray-700" />
                </button>
                {filteredCarouselData.length > 1 && (
                  <div className="flex items-center gap-2">
                    {filteredCarouselData.map((_, index) => (
                      <button key={index} onClick={() => goToSlide(index)}
                        className={`h-3 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-accent w-8' : 'bg-gray-300 w-3 hover:bg-gray-400'}`} />
                    ))}
                  </div>
                )}
                <button onClick={goToNext} disabled={currentIndex === filteredCarouselData.length - 1}
                  className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30">
                  <MoveRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-textdark text-xl font-semibold flex-1 w-full">

            {/* Profile header */}
            <div className="border border-card-bord rounded-[3rem] bg-innercontainer px-4 py-6 sm:px-8 sm:py-8 md:px-12 md:py-10 flex flex-col sm:flex-row sm:space-x-6 md:space-x-12 space-y-6 sm:space-y-0">
              <button className="self-center sm:self-start" onClick={() => setIsPopUpOpen(true)}>
                <img src={profilepic} draggable={false} className="w-32 h-32 sm:w-40 sm:h-40 md:w-[200px] md:h-[200px] object-cover rounded-3xl" />
              </button>

              <div className="flex-1 min-w-0 flex flex-col">
                {/* Name row + Customize button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-center sm:text-left">{name}</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-4 py-1.5 rounded-full text-sm border-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                      isEditing
                        ? "border-accent bg-accent text-black"
                        : "border-card-bord bg-white text-textdark hover:border-accent"
                    }`}
                  >
                    {isEditing ? (
                        <>
                        <Check className="w-5 h-5" />
                        Done
                        </>
                    ) : (
                        <>
                        <Sparkles className="w-5 h-5" />
                        Customize
                        </>
                    )}
                  </button>
                </div>

                <div className="flex-1">
                  {/* ── Same grid layout as before, now driven by `enabledCards` ── */}
                  <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                    {enabledCards.map((card, i) => {
                      const isDragOver = dragOverIndex === i && dragIndex !== i;
                      const isFlashed  = savedFlash === card.id;
                      return (
                        <div
                          key={card.id}
                          data-testid={`profile-card-${card.id}`}
                          draggable={isEditing}
                          onDragStart={(e) => handleDragStart(e, i)}
                          onDragEnter={(e) => handleDragEnter(e, i)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className="border bg-white rounded-2xl px-3 py-10 flex flex-col items-center justify-center relative transition-all duration-200"
                          style={{
                            borderColor: isEditing
                              ? (isDragOver ? "var(--accent, #22c55e)" : "#d1d5db")
                              : isFlashed || justDropped === card.id ? "var(--accent, #22c55e)" : "transparent",
                            borderStyle: isEditing ? "dashed" : "solid",
                            borderWidth: "2px",
                            background: isDragOver || isFlashed ? "#f0fdf4" : undefined,
                            cursor: isEditing ? "grab" : card.editable ? "text" : "default",
                            animation: isFlashed ? "savedPop 0.4s ease" : undefined,
                          }}
                        >
                          {/* Edit-mode controls */}
                          {isEditing && (
                            <>
                              <span className="absolute top-2 left-2.5 text-gray-300 text-xs cursor-grab select-none">⠿</span>
                              <button
                                data-testid="card-remove-btn"
                                onClick={() => toggleCard(card.id)}
                                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 leading-none"
                              ><X className="w-2.5 h-2.5 stroke-white" /></button>
                            </>
                          )}

                          {card.editable && !isEditing && !isFlashed && (
                            <span className="absolute top-2 right-2 text-[9px]"><Pencil size={20} /></span>
                          )}

                          {isFlashed && (
                            <span className="absolute top-2 right-2 text-[9px]" style={{ animation: "fadeSlide 0.2s ease" }}><SaveIcon /></span>
                          )}

                          <div className={`flex flex-col items-center ${isEditing ? "mt-2" : ""}`}>
                            {card.editable && !isEditing
                              ? <EditableCardContent card={card} onSave={(v) => saveCardLabel(card.id, v)} />
                              : <h3>{card.label}</h3>
                            }
                            <p className="text-[#6C6C6C]">{card.sublabel}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add-card tray — only visible in edit mode */}
                  {isEditing && disabledCards.length > 0 && (
                    <div
                      data-testid="card-tray"
                      className="mt-4 border-2 border-dashed border-green-200 rounded-2xl px-4 py-3 bg-green-50"
                      style={{ animation: "fadeSlide 0.2s ease" }}
                    >
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                        Swap cards <span className="text-gray-400 font-normal normal-case">(max 3)</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mb-2">
                        Remove a card first to swap it if three already exist. Cards with a pencil let you edit that card.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {disabledCards.map((card) => {
                          const atMax = enabledCards.length >= MAX_CARDS;
                          return (
                            <button
                                data-testid={`tray-btn-${card.id}`}
                                key={card.id}
                                onClick={() => toggleCard(card.id)}
                                disabled={atMax}
                                className={`px-3 py-2 rounded-xl border-2 text-left text-sm transition-all ${
                                atMax
                                  ? "border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed"
                                  : "border-card-bord bg-white hover:border-accent hover:bg-green-50"
                              }`}
                            >
                              <div className="font-bold text-textdark flex items-center gap-1">
                                {card.label}
                                {card.editable && <span className="text-[9px] text-accent font-extrabold"><Pencil size={10}/></span>}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{card.sublabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section switcher + filters — unchanged */}
            <div className="flex flex-row justify-between items-center py-[1rem]">
              <SectionSwitcher active={section} onChange={setSection} />
              {section === "Conversations" ? (
                <button onClick={() => navigate("/chatbot")}
                  className="px-8 py-1.5 text-base rounded-lg transition-colors duration-200 outline outline-2 outline-accent bg-accent text-textdark hover:bg-buttonhover hover:outline-buttonhover">
                  + New Chat
                </button>
              ) : (
                <div className="space-x-4">
                  {["All", "Active", "Complete"].map((label) => (
                    <button key={label} onClick={() => pickProgram(label)}
                      className={`px-8 py-1.5 text-base rounded-lg transition-colors duration-200 ${
                        program === label
                          ? "outline outline-2 outline-accent bg-accent text-textdark hover:bg-buttonhover hover:outline-buttonhover"
                          : "outline outline-2 outline-accent bg-bglight text-textdark hover:border-buttonhover hover:bg-secondary"
                      }`}>{label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Program Status carousel — unchanged */}
            {section === "Program Status" && (
              <div className="relative w-full overflow-hidden">
                <div ref={carouselRef} className="flex gap-0 items-stretch transition-transform duration-300 ease-in-out">
                  {filteredCarouselData.map((card, index) => (
                    <div key={index} className="flex-shrink-0 pr-4 flex items-start"
                      style={{ width: filteredCarouselData.length < cardsPerView ? "auto" : `${cardWidthPercent}%` }}>
                      <DegreeProgressCard title={card.title} categories={card.categories} completed={card.completed}
                        total={card.total} percentage={card.percentage} startDate={card.startDate ?? undefined}
                        endDate={card.endDate!} active={false} />
                    </div>
                  ))}
                  {filteredCarouselData.length > 1 && (
                    <div className="flex-shrink-0 flex items-center justify-center self-stretch">
                      <button onClick={() => navigate("/planner")}
                        className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center hover:bg-gray-100 text-gray-500 shadow-sm">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                {filteredCarouselData.length > cardsPerView && (
                  <>
                    <button onClick={goToPrevious} disabled={currentIndex === 0}
                      className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30">
                      <MoveLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToNext} disabled={currentIndex === maxIndex}
                      className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30">
                      <MoveRight className="w-5 h-5" />
                    </button>
                    <div className="flex justify-center gap-2 mt-2">
                      {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                        <button key={index} onClick={() => goToSlide(index)}
                          className={`h-3 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-accent w-8' : 'bg-gray-300 w-3 hover:bg-gray-400'}`} />
                      ))}
                    </div>
                  </>
                )}
                {filteredCarouselData.length === 0 && (
                  <div className="flex justify-center items-center h-48">
                    <button onClick={() => navigate("/planner")}
                      className="w-16 h-16 rounded-full border border-border bg-white flex items-center justify-center hover:bg-gray-100 shadow-md transition">
                      <Plus className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Conversations carousel — unchanged */}
            {section === "Conversations" && (
              <div className="relative w-full overflow-hidden">
                <div ref={convCarouselRef} className="flex gap-0 items-stretch transition-transform duration-300 ease-in-out">
                  {conversationsData.length > 0 ? (
                    conversationsData.map((conv) => {
                      const lastMsgTs = conv.messages?.[conv.messages.length - 1]?.timestamp ?? 0;
                      return (
                        <div key={conv.conversation_id} className="flex-shrink-0 pr-4 flex items-start" style={{ width: `${cardWidthPercent}%` }}>
                          <ChatConversationCard
                            title={conv.title || conv.messages?.[0]?.content || "Untitled Conversation"}
                            timestamp={formatConvoTimestamp(lastMsgTs)}
                            messages={conv.messages.slice(0, 3)}
                            onOpen={() => handleOpenConversation(conv)}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex justify-center items-center h-48 text-textsecondary text-base font-normal w-full">
                      No conversations yet — start chatting with SAGE!
                    </div>
                  )}
                </div>
                {conversationsData.length > cardsPerView && (
                  <>
                    <button onClick={goToConvPrevious} disabled={convIndex === 0}
                      className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30">
                      <MoveLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToConvNext} disabled={convIndex === maxConvIndex}
                      className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30">
                      <MoveRight className="w-5 h-5" />
                    </button>
                    <div className="flex justify-center gap-2 mt-2">
                      {Array.from({ length: maxConvIndex + 1 }).map((_, index) => (
                        <button key={index} onClick={() => goToConvSlide(index)}
                          className={`h-3 rounded-full transition-all duration-300 ${index === convIndex ? "bg-accent w-8" : "bg-gray-300 w-3 hover:bg-gray-400"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile picture picker popup — unchanged */}
      {isPopUpOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsPopUpOpen(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-lg relative items-center text-center space-y-6 sm:space-y-10" onClick={(e) => e.stopPropagation()}>
            <h2>Pick Your Favorite Peechi</h2>
            <div className="flex flex-row space-x-4 sm:space-x-10">
              {[1, 2, 3].map((num) => (
                <button key={num} className="hover:scale-105 transition-transform" onClick={() => pickProfile(num)}>
                  {profilePictureType === num && googlePhotoURL
                    ? <img referrerPolicy="no-referrer" src={googlePhotoURL} className="w-24 h-24 sm:w-40 sm:h-40 object-cover rounded-3xl" draggable={false} />
                    : <img src={`/assets/profile_pics/${num}.png`} className="w-24 h-24 sm:w-40 sm:h-40 object-cover" draggable={false} />}
                </button>
              ))}
            </div>
            <div className="flex flex-row space-x-4 sm:space-x-10">
              {[4, 5, 6].map((num) => (
                <button key={num} className="hover:scale-105 transition-transform" onClick={() => pickProfile(num)}>
                  {profilePictureType === num && googlePhotoURL
                    ? <img referrerPolicy="no-referrer" src={googlePhotoURL} className="w-24 h-24 sm:w-40 sm:h-40 object-cover rounded-3xl" draggable={false} />
                    : <img src={`/assets/profile_pics/${num}.png`} className="w-24 h-24 sm:w-40 sm:h-40 object-cover" draggable={false} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Missing info modal — unchanged */}
      {showMissingInfoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 shadow-lg flex flex-col items-center text-center gap-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900">Missing Profile Information</h2>
            <p className="text-gray-500 text-base">To access your profile, please submit your transcript for the best experience</p>
            <div className="flex gap-4">
              <button onClick={() => navigate("/")} className="px-6 py-2.5 rounded-full border border-accent text-textdark font-medium hover:bg-gray-50 transition">Return Home</button>
              <button onClick={() => navigate("/planner")} className="px-6 py-2.5 rounded-full bg-accent text-black font-medium hover:bg-buttonhover transition">Submit Transcript</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;