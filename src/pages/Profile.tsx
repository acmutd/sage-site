import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MoveLeft, MoveRight, Plus } from "lucide-react";
import DegreeProgressCard from "@/components/profile/degreeprogresscard";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
    const { user } = useAuth();
    const [mobileView, setMobileView] = useState(false);
    const [tabletView, setTabletView] = useState(false);
    const [profilepic, setProfilePic] = useState(() => {
        const cached = localStorage.getItem('profilePictureType');
        if (cached) {
            const type = parseInt(cached);
            return type === 0 && user?.photoURL 
                ? user.photoURL 
                : `/assets/profile_pics/${type}.png`;
        }
        return "/assets/profile_pics/1.png";
    });
    const [profilePictureType, setProfilePictureType] = useState(1);
    const [googlePhotoURL, setGooglePhotoURL] = useState<string | null>(null);
    const [isPopUpOpen, setIsPopUpOpen] = useState(false);
    const [program, setProgram] = useState("All");
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const [name, setName] = useState("");
    // const [gpa, setGPA] = useState(0);
    // const [major, setMajor] = useState("");
    const [undergraduateHours, setUndergraduateHours] = useState(0);
    const [graduateHours, setGraduateHours] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [carouselData, setCarouselData] = useState<Array<{
        title: string;
        categories: { label: string; completed: number; total: number; }[];
        completed: number;
        total: number;
        percentage: number;
        startDate: string | null;
        endDate: string | null;
        status: string | null;
    }>>([]);
    const [majorsData, setMajorsData] = useState<Array<{name: string, start_date: string, program_level: String, status: string}>>([]);
    const cardWidthPercent = mobileView ? 69 : tabletView ? 55 : 34;
    const navigate = useNavigate();

    type EvaluatorData = Array<{
        degree: string;
        credits: number;
        credits_completed: number;
        categories: Array<{
            name: string;
            credits: number;
            credits_completed: number;
        }>;
      }>;

    // check if google pic changed
    useEffect(() => {
        if (user?.photoURL) {
            setGooglePhotoURL(user.photoURL);
            if (profilePictureType === 0) {
                setProfilePic(user.photoURL);
            }
        }
        getUserInfo();
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
    
    useEffect(() => {
        setCurrentIndex(0);
    }, [program]);
    
    const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

    const cardsPerView = mobileView ? 1 : tabletView ? 1 : 2; // Number of cards visible at once

    const filteredCarouselData = carouselData.filter(card => {
        if (program === "All") return true;
        return card.status!.toLowerCase() === program.toLowerCase();
    });

    const maxIndex = Math.max(0, filteredCarouselData.length - cardsPerView);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const goToNext = () => {
        setCurrentIndex((prev) =>
          prev < maxIndex ? prev + 1 : prev
        );
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const parseYear = (date: string | undefined) => {
        if (!date) return null;
        const year = date.split(" ").find(part => /^\d{4}$/.test(part));
        return year ?? null;
    }

    function formatCarouselData(evaluatorResponse: EvaluatorData, majors: typeof majorsData) {
        const core = evaluatorResponse.find(d => d.degree === "Core Requirements");
        const degrees = evaluatorResponse.filter(d => d.degree !== "Core Requirements");

        if (!degrees.length) return [];
    
        return degrees.map(degree => {
            const matchedMajor = majors.find(m => 
                degree.degree.includes(m.name) || m.name.includes(degree.degree)
            );
            const isBachelor = 
            matchedMajor?.program_level?.toLowerCase() === "undergraduate" && 
            !degree.degree.toLowerCase().includes("minor") &&
            !degree.degree.toLowerCase().includes("certificate") &&
            !degree.degree.toLowerCase().includes("certification");

            const allCategories = [
                ...(isBachelor && core ? [{ label: "Core Requirements", completed: core.credits_completed, total: core.credits }] : []),
                ...degree.categories.map(c => ({
                    label: c.name.split(":")[0].trim().replace(/^[IVX]+\.\s*/i, ""),
                    completed: c.credits_completed,
                    total: c.credits,
                })),
            ];
    
            const completed = (core?.credits_completed ?? 0) + degree.credits_completed;
            const total = (core?.credits ?? 0) + degree.credits;
    
            return {
                title: degree.degree,
                categories: allCategories,
                completed,
                total,
                percentage: Math.round((completed / total) * 100),
                startDate: parseYear(matchedMajor?.start_date),
                endDate: null,
                status: matchedMajor?.status ?? "active"
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
            body: JSON.stringify({
                userId: user?.uid,
                action: "updateProfile",
                token,
                profile_picture_type: newType
            })
        });
        const result = await res.json();
        console.log("updateProfile response:", result);
    
        setProfilePictureType(newType);
        localStorage.setItem('profilePictureType', newType.toString());
        window.dispatchEvent(new Event('storage'));
        if (newType === 0 && googlePhotoURL) {
            setProfilePic(googlePhotoURL);
        } else {
            setProfilePic(`/assets/profile_pics/${newType}.png`);
        }
        setIsPopUpOpen(false);
    }

    function pickProgram(prog: string) {
        setProgram(prog);
    }
    

    async function getUserInfo() {
        const token = await user?.getIdToken();

        if (!token) throw new Error("Failed to retrieve authentication token.");
        const response = await fetch(CRUD_API as string, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.uid,
            action: "getProfile",
            token,
          }),
        });
      
        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }
      
        const data = await response.json();
        setMajorsData([
            ...(data.majors ?? []),
            ...(data.minors ?? []),
            ...(data.certifications ?? []),
        ]);
        setName(data.name);
        // setGPA(data.gpa.undergraduate);
        setUndergraduateHours(data.credit_hours.undergraduate);
        // setMajor(data.majors[0].name);
        setStartDate(data.majors[0].start_date);
        
        //add feature so it checks if data.credit_hours contains graduate that its not 0
        setGraduateHours(0);

        // profile pic type and URL 
        const picType = data.profile?.["user-fields"]?.profile_picture_type ?? data.profile_picture_type ?? 1;
        setProfilePictureType(picType);

        localStorage.setItem('profilePictureType', picType.toString());

        if (user?.photoURL) {
            setGooglePhotoURL(user.photoURL);
        }
        
        if (picType === 0 && user?.photoURL) {
            setProfilePic(user.photoURL);
        } else {
            setProfilePic(`/assets/profile_pics/${picType}.png`);
        }

        // populate carousel
        const evalResponse = await fetch(CRUD_API as string, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?.uid,
              action: "getEvaluation",
              token,
            }),
          });
      
          if (evalResponse.ok) {
            const evalData = await evalResponse.json();
            const allPrograms = [
                ...(data.majors ?? []),
                ...(data.minors ?? []),
                ...(data.certifications ?? []),
            ];
            setCarouselData(formatCarouselData(evalData.evaluation, allPrograms));
          }
    }

    useEffect(() => {
        const handleResize = () => { 
            const w = window.innerWidth;
            setMobileView(w < 768);
            setTabletView(w >= 768 && w < 1024);
        }
        handleResize(); // set on mount
        window.addEventListener("resize", handleResize);
        getUserInfo();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <>
            <div className="flex bg-bglight py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)] overflow-y-auto">
                {
                    mobileView ?
                    // mobile view
                    <div className="text-textdark w-full flex flex-col gap-5">
                        {/* Profile picture left, stats right */}
                        <div className="border border-card-bord rounded-3xl bg-innercontainer p-4 flex flex-row gap-4 items-stretch">
                            <button onClick={() => setIsPopUpOpen(true)} className="flex-shrink-0">
                                <img
                                    src={profilepic}
                                    draggable={false}
                                    className="w-28 h-28 object-cover rounded-2xl"
                                />
                            </button>
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <p className="font-semibold text-lg">{name}</p>
                                <div className="border border-card-bord bg-white rounded-xl px-3 py-2 flex flex-col">
                                    <span className="font-semibold text-sm">{undergraduateHours} Credits</span>
                                    <span className="text-xs text-[#6C6C6C]">Undergraduate</span>
                                </div>
                                <div className="border border-card-bord bg-white rounded-xl px-3 py-2 flex flex-col">
                                    <span className="font-semibold text-sm">{graduateHours} Credits</span>
                                    <span className="text-xs text-[#6C6C6C]">Graduate</span>
                                </div>
                                <div className="border border-card-bord bg-white rounded-xl px-3 py-2 flex flex-col">
                                    <span className="font-semibold text-sm">{startDate}</span>
                                    <span className="text-xs text-[#6C6C6C]">Enrollment Date</span>
                                </div>
                            </div>
                        </div>

                        {/* Program Status with dropdown */}
                        <div className="flex flex-row justify-between items-center">
                            <h2 className="text-xl font-semibold">Program Status</h2>
                            <div className="relative">
                                <select
                                    value={program}
                                    onChange={e => pickProgram(e.target.value)}
                                    className="appearance-none border border-card-bord rounded-full pl-4 pr-8 py-1.5 text-sm bg-white text-textdark cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Complete">Complete</option>
                                </select>
                                <MoveRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-textdark rotate-90 pointer-events-none" />
                            </div>
                        </div>

                        {/* Carousel - 1 card at a time on mobile */}
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

                            {/* Prev/Next buttons */}
                            <div className="flex justify-between">
                                <button
                                    onClick={goToPrevious}
                                    disabled={currentIndex === 0}
                                    className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30"
                                    aria-label="Previous"
                                >
                                    <MoveLeft className="w-4 h-4 text-gray-700" />
                                </button>

                                {/* Dots */}
                                {filteredCarouselData.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        {filteredCarouselData.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => goToSlide(index)}
                                                className={`h-3 rounded-full transition-all duration-300 ${
                                                    index === currentIndex ? 'bg-accent w-8' : 'bg-gray-300 w-3 hover:bg-gray-400'
                                                }`}
                                                aria-label={`Go to slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={goToNext}
                                    disabled={currentIndex === filteredCarouselData.length - 1}
                                    className="p-2 rounded-full bg-white shadow border border-gray-200 disabled:opacity-30"
                                    aria-label="Next"
                                >
                                    <MoveRight className="w-4 h-4 text-gray-700" />
                                </button>
                            </div>
                        </div>
                    </div>
                    :
                    
                    // desktop view
                    <div className="text-textdark text-xl font-semibold flex-1 w-full">
                        {/* profile picture, user stats */}
                        <div className="border border-card-bord rounded-[3rem] bg-innercontainer px-4 py-6 sm:px-8 sm:py-8 md:px-12 md:py-10 flex flex-col sm:flex-row sm:space-x-6 md:space-x-12 space-y-6 sm:space-y-0">
                            <button className="self-center sm:self-start" onClick={()=> setIsPopUpOpen(true)}>
                                <img
                                 src={profilepic}
                                 draggable={false}
                                 className="w-32 h-32 sm:w-40 sm:h-40 md:w-[200px] md:h-[200px] object-cover rounded-3xl"
                                />
                            </button>
                            <div className="flex-1 min-w-0 flex flex-col">
                                <h2 className="text-center sm:text-left">{name}</h2>

                                <div className="flex-1 mt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 h-full items-stretch">
                                        <div className="h-full border border-card-bord bg-white rounded-2xl
                                                        px-3 py-4 sm:py-2 flex flex-col items-center justify-center">
                                            <h3>{undergraduateHours} Credit Hours</h3>
                                            <p className="text-[#6C6C6C]">Undergraduate</p>
                                        </div>
                                        <div className="h-full border border-card-bord bg-white rounded-2xl
                                                        px-3 py-4 sm:py-2 flex flex-col items-center justify-center">
                                            <h3>{graduateHours} Credit Hours</h3>
                                            <p className="text-[#6C6C6C]">Graduate</p>
                                        </div>
                                        <div className="h-full border border-card-bord bg-white rounded-2xl
                                                        px-3 py-4 sm:py-2 flex flex-col items-center justify-center sm:col-span-2 lg:col-span-1">
                                            <h3>{startDate}</h3>
                                            <p className="text-[#6C6C6C]">Start Date</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row justify-between py-[1rem]">
                            <h2 className="text-3xl">Program Status</h2>
                            <div className="space-x-4">
                                <button 
                                className={`px-8 py-1.5 text-base rounded-lg transition-colors duration-200 ${
                                    program === "All" 
                                      ? 'outline outline-2 outline-accent bg-accent text-textdark hover:bg-buttonhover hover:outline-buttonhover' 
                                      : 'outline outline-2 outline-accent bg-bglight text-textdark hover:border-buttonhover hover:bg-secondary'
                                }`}
                                onClick={() => pickProgram("All")}>All</button>
                                <button 
                                className={`px-8 py-1.5 text-base rounded-lg transition-colors duration-200 ${
                                    program === "Active" 
                                      ? 'outline outline-2 outline-accent bg-accent text-textdark hover:bg-buttonhover hover:outline-buttonhover' 
                                      : 'outline outline-2 outline-accent bg-bglight text-textdark hover:border-buttonhover hover:bg-secondary'
                                }`}
                                onClick={() => pickProgram("Active")}>Active</button>
                                <button
                                className={`px-8 py-1.5 text-base rounded-lg transition-colors duration-200 ${
                                    program === "Complete" 
                                      ? 'outline outline-2 outline-accent bg-accent text-textdark hover:bg-buttonhover hover:outline-buttonhover' 
                                      : 'outline outline-2 outline-accent bg-bglight text-textdark hover:border-buttonhover hover:bg-secondary'
                                }`}
                                onClick={() => pickProgram("Complete")}>Complete</button>
                            </div>
                        </div>

                        {/* Carousel Section */}
                        <div className="relative w-full overflow-hidden">
                            <div ref={carouselRef} className="flex gap-0 items-stretch transition-transform duration-300 ease-in-out">
                                {/* Existing cards */}
                                {filteredCarouselData.map((card, index) => (
                                    <div key={index} className="flex-shrink-0 pr-4 flex items-start" style={{
                                        width: filteredCarouselData.length < cardsPerView ? "auto" : `${cardWidthPercent}%`,

                                    }}>
                                        <DegreeProgressCard
                                            title={card.title}
                                            categories={card.categories}
                                            completed={card.completed}
                                            total={card.total}
                                            percentage={card.percentage}
                                            startDate={card.startDate ?? undefined}
                                            endDate={card.endDate!}
                                            active={false}
                                        />
                                    </div>
                                ))}
                                {filteredCarouselData.length > 1 && (
                                    <div className="flex-shrink-0 flex items-center justify-center self-stretch">
                                        <button
                                            onClick={() => navigate("/planner")}
                                            className="w-10 h-10 rounded-full border border-border bg-white flex items-center justify-center hover:bg-gray-100 text-gray-500 shadow-sm"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                            </div>

                            {filteredCarouselData.length > cardsPerView && (
                                <>
                                <button
                                    onClick={goToPrevious}
                                    disabled={currentIndex === 0}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30"
                                >
                                    <MoveLeft className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={goToNext}
                                    disabled={currentIndex === maxIndex}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow border rounded-full p-2 disabled:opacity-30"
                                >
                                    <MoveRight className="w-5 h-5" />
                                </button>
                                </>
                            )}

                            {/* Dots below */}
                            {filteredCarouselData.length > cardsPerView && (
                                <div className="flex justify-center gap-2 mt-2">
                                    {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToSlide(index)}
                                            className={`h-3 rounded-full transition-all duration-300 ${
                                                index === currentIndex ? 'bg-accent w-8' : 'bg-gray-300 w-3 hover:bg-gray-400'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Single addition of programs */ }
                            {filteredCarouselData.length === 0 && ( 
                                <div className="flex justify-center items-center h-48">
                                    <button
                                        onClick={() => navigate("/planner")}
                                        className="w-16 h-16 rounded-full border border-border bg-white 
                                                    flex items-center justify-center 
                                                    hover:bg-gray-100 shadow-md transition"
                                    >
                                        <Plus className="w-6 h-6 text-gray-500" />
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                }
            </div>

            {/* Profile picture picker popup - shared between mobile and desktop */}
            {
                isPopUpOpen && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsPopUpOpen(false)}>
                        <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-lg relative items-center text-center space-y-6 sm:space-y-10" onClick={e => e.stopPropagation()}>
                            <h2>Pick Your Favorite Peechi</h2>
                            
                            <div className="flex flex-row space-x-4 sm:space-x-10">
                                {[1, 2, 3].map(num => (
                                    <button key={num} className="hover:scale-105 transition-transform" 
                                            onClick={() => pickProfile(num)}>
                                        {profilePictureType === num && googlePhotoURL ? (
                                            <div className="relative">
                                                <img referrerPolicy="no-referrer" src={googlePhotoURL}
                                                    className="w-24 h-24 sm:w-40 sm:h-40 object-cover rounded-3xl" 
                                                    draggable={false} />
                                            </div>
                                        ) : (
                                            <img src={`/assets/profile_pics/${num}.png`}
                                                className="w-24 h-24 sm:w-40 sm:h-40 object-cover" 
                                                draggable={false} />
                                        )}
                                    </button>
                                ))}
                            </div>
        
                            <div className="flex flex-row space-x-4 sm:space-x-10">
                                {[4, 5, 6].map(num => (
                                    <button key={num} className="hover:scale-105 transition-transform" 
                                            onClick={() => pickProfile(num)}>
                                        {profilePictureType === num && googlePhotoURL ? (
                                            <div className="relative">
                                                <img referrerPolicy="no-referrer" src={googlePhotoURL}
                                                    className="w-24 h-24 sm:w-40 sm:h-40 object-cover rounded-3xl" 
                                                    draggable={false} />
                                            </div>
                                        ) : (
                                            <img src={`/assets/profile_pics/${num}.png`}
                                                className="w-24 h-24 sm:w-40 sm:h-40 object-cover" 
                                                draggable={false} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default Profile;