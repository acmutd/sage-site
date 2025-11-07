import { useState, useEffect, useRef} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DegreeProgressCard from "@/components/ui/degreeprograsscard";

const Profile = () => {
    const [mobileView, setMobileView] = useState(false);
    const [profilepic, setProfilePic] = useState("../../public/assets/profile_pics/1.png");
    const [isPopUpOpen, setIsPopUpOpen] = useState(false);
    const [program, setProgram] = useState("All");
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Sample data for the carousel cards
    const carouselData = [
        {
            title: "Computer Science BS",
            core: 45,
            major: 60,
            elective: 15,
            completed: 75,
            total: 120,
            percentage: 63
        },
        {
            title: "Business Administration BA",
            core: 42,
            major: 54,
            elective: 24,
            completed: 67,
            total: 120,
            percentage: 56
        },
        {
            title: "Mathematics BS",
            core: 39,
            major: 63,
            elective: 18,
            completed: 82,
            total: 120,
            percentage: 68
        },
        {
            title: "Engineering BS",
            core: 48,
            major: 66,
            elective: 6,
            completed: 90,
            total: 120,
            percentage: 75
        }
    ];

    const cardsPerView = 2; // Number of cards visible at once
    const maxIndex = carouselData.length - cardsPerView;

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    function pickProfile(picNumber: number) {
        switch (picNumber) {
            case 1:
                setProfilePic("../../assets/profile_pics/1.png");
                break;
            case 2:
                setProfilePic("../../assets/profile_pics/2.png");
                break;
            case 3:
                setProfilePic("../../assets/profile_pics/3.png");
                break;
            case 4:
                setProfilePic("../../assets/profile_pics/4.png");
                break;
            case 5:
                setProfilePic("../../assets/profile_pics/5.png");
                break;
            case 6:
                setProfilePic("../../assets/profile_pics/6.png");
                break;
            default:
                setProfilePic("../../assets/profile_pics/1.png");
        }
        setIsPopUpOpen(false);
    }

    function pickProgram(prog: string) {
        setProgram(prog);
    }

    useEffect(() => {
        if(window.innerWidth < 768) {
        setMobileView(true);
        };
    }, []);

    return (
        <>
            <div className="flex bg-bglight h-screen items-center justify-center">
                {
                    mobileView ? 
                    // in mobile view
                    <div className="text-textdark text-xl font-semibold">Mobile Profile View
                        <div>
                        </div>
                    </div> 
                    : 
                    // desktop view
                    <div className="text-textdark text-xl font-semibold flex-1 px-5 space-y-2 pt-10">
                        {/* profile picture, user stats */}
                        <div className="border border-card-bord rounded-2xl bg-innercontainer px-6 py-4 flex flex-row space-x-6">
                            <button className="" onClick={()=> setIsPopUpOpen(true)}>
                                <img
                                 src={profilepic}
                                 draggable={false}
                                />
                            </button>
                            <div className="flex-1 min-w-0 flex flex-col">
                                <h2>Alex Huu Pham</h2>

                                <div className="flex-1 mt-4">
                                    <div className="grid grid-cols-3 gap-4 h-full items-stretch">
                                        <div className="h-full border border-card-bord bg-white rounded-xl
                                                        px-3 py-2 flex flex-col items-center justify-center">
                                            <h3>Credit Hours</h3>
                                            <p className="text-[#6C6C6C]">Undergratuates</p>
                                        </div>
                                        <div className="h-full border border-card-bord bg-white rounded-xl
                                                        px-3 py-2 flex flex-col items-center justify-center">
                                            <h3>GPA</h3>
                                            <p className="text-[#6C6C6C]">Undergratuates</p>
                                        </div>
                                        <div className="h-full border border-card-bord bg-white rounded-xl
                                                        px-3 py-2 flex flex-col items-center justify-center">
                                            <h3>Projects</h3>
                                            <p className="text-[#6C6C6C]">Undergratuates</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="py-2 flex flex-row justify-between">
                            <h2>Program Status</h2>
                            <div className="space-x-10">
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
                        <div className="relative max-h-[280px] max-w-[75%]">
                            {/* Carousel Container */}
                            <div className="relative overflow-hidden rounded-2xl w-full">
                                {/* Cards */}
                                <div 
                                    ref={carouselRef}
                                    className="flex transition-transform duration-500 ease-in-out gap-4"
                                    style={{ transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)` }}
                                >
                                    {carouselData.map((card, index) => (
                                        <div 
                                            key={index} 
                                            className="flex-shrink-0"
                                            style={{ width: `calc(${100 / cardsPerView}% - calc(${16 * (cardsPerView - 1) / cardsPerView}px))` }}
                                        >
                                            <DegreeProgressCard
                                                title={card.title}
                                                core={card.core}
                                                major={card.major}
                                                elective={card.elective}
                                                completed={card.completed}
                                                total={card.total}
                                                percentage={card.percentage}
                                                active={false}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Left Arrow */}
                                {currentIndex > 0 && (
                                    <button
                                        onClick={goToPrevious}
                                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors border border-gray-200 z-10"
                                        aria-label="Previous cards"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                                    </button>
                                )}

                                {/* Right Arrow */}
                                {currentIndex < maxIndex && (
                                    <button
                                        onClick={goToNext}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors border border-gray-200 z-10"
                                        aria-label="Next cards"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-700" />
                                    </button>
                                )}
                            </div>

                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-2 mt-3">
                                {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                            index === currentIndex
                                                ? 'bg-accent w-8'
                                                : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        aria-label={`Go to slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {
                            isPopUpOpen && (
                                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setIsPopUpOpen(false)}>
                                    <div className="bg-white rounded-2xl p-10 shadow-lg relative items-center text-center space-y-10">
                                        <h2>Pick Your Favorite Peechi</h2>
                                        <div className="flex flex-row space-x-10">
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(1)}>
                                                <img
                                                src={"../../public/assets/profile_pics/1.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(2)}>
                                                <img
                                                src={"../../public/assets/profile_pics/2.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(3)}>
                                                <img
                                                src={"../../public/assets/profile_pics/3.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                        </div>
                                        <div className="flex flex-row space-x-10">
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(4)}>
                                                <img
                                                src={"../../public/assets/profile_pics/4.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(5)}>
                                                <img
                                                src={"../../public/assets/profile_pics/5.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                            <button className="hover:scale-105 transition-transform" onClick={()=> pickProfile(6)}>
                                                <img
                                                src={"../../public/assets/profile_pics/6.png"}
                                                className="w-40 h-40 object-cover"
                                                draggable={false}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                }
            </div>
        </>
    );
};

export default Profile;