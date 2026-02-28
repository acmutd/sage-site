import { useState, useEffect, useRef} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DegreeProgressCard from "@/components/ui/degreeprograsscard";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
    const { user } = useAuth();
    const [mobileView, setMobileView] = useState(false);
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
        core: number;
        major: number;
        elective: number;
        completed: number;
        total: number;
        percentage: number;
    }>>([]);

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
    
    const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

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

    function formatCarouselData(evaluatorResponse: EvaluatorData) {
        const core = evaluatorResponse.find(d => d.degree === "Core Requirements");
        const degrees = evaluatorResponse.filter(d => d.degree !== "Core Requirements");
        
        if (!core || degrees.length === 0) {
          throw new Error("Invalid evaluator data");
        }
        
        return degrees.map(degree => {
          const majorReq = degree.categories.find(c => c.name.includes("Major Requirements"));
          const electiveReq = degree.categories.find(c => c.name.includes("Elective Requirements"));
          
          if (!majorReq || !electiveReq) {
            throw new Error("Missing major or elective requirements");
          }
      
          return {
            title: degree.degree,
            core: core.credits,
            major: majorReq.credits,
            elective: electiveReq.credits,
            completed: core.credits_completed + degree.credits_completed,
            total: core.credits + degree.credits,
            percentage: Math.round(
              ((core.credits_completed + degree.credits_completed) / 
               (core.credits + degree.credits)) * 100
            )
          };
        });
    }

    async function pickProfile(picNumber: number) {
        const token = await user?.getIdToken();

        const newType = profilePictureType === picNumber ? 0 : picNumber; // if going for Google tile, switch to 0 or we do 1-6

        await fetch(CRUD_API as string,
            { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify
                (
                    {
                        userId: user?.uid,
                        action: "updateProfile",
                        token,
                        profile_picture_type: newType
                    }
                )
            }
        );

        setProfilePictureType(newType);
        localStorage.setItem('profilePictureType', newType.toString()); // cache in regular stores if not changing PFP 
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
        console.log(data);
        setName(data.name);
        // setGPA(data.gpa.undergraduate);
        setUndergraduateHours(data.credit_hours.undergraduate);
        // setMajor(data.majors[0].name);
        setStartDate(data.majors[0].start_date);

        //add feature so it checks if data.credit_hours contains graduate that its not 0
        setGraduateHours(0);

        // profile pic type and URL 
        const picType = data.profile_picture_type ?? 1;
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
            setCarouselData(formatCarouselData(evalData.evaluation));
          }
    }

    useEffect(() => {
        if(window.innerWidth < 768) {
        setMobileView(true);
        };
        getUserInfo();
    }, []);

    return (
        <>
            <div className="flex bg-bglight overflow-hidden py-[4rem] px-6 gap-[2.25rem] mt-[4.2rem] h-[calc(100vh-4.2rem)]">
                {
                    mobileView ? 
                    // in mobile view
                    <div className="text-textdark text-xl font-semibold">Mobile Profile View
                        <div>
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
                        <div className="relative w-full">
                            {/* Carousel Container */}
                            <div className="relative w-full max-w-full overflow-hidden rounded-2xl">
                                {/* Cards */}
                                <div 
                                    ref={carouselRef}
                                    className="flex transition-transform duration-500 ease-in-out gap-4"
                                    style={{ transform: `translateX(-${2 * currentIndex * (100 / cardsPerView)}%)` }}
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
                                        className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors border border-gray-200 z-10"
                                        aria-label="Previous cards"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                                    </button>
                                )}

                                {/* Right Arrow */}
                                {currentIndex < (maxIndex - 1) && (
                                    <button
                                        onClick={goToNext}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors border border-gray-200 z-10"
                                        aria-label="Next cards"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-700" />
                                    </button>
                                )}
                            </div>

                            {/* Dots Indicator */}
                            <div className="flex justify-center gap-2 mt-3">
                                {Array.from({ length: maxIndex }).map((_, index) => (
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
                                            {[1, 2, 3].map(num => (
                                                <button key={num} className="hover:scale-105 transition-transform" 
                                                        onClick={() => pickProfile(num)}>
                                                    {profilePictureType === num && googlePhotoURL ? (
                                                        <div className="relative">
                                                            <img src={googlePhotoURL}
                                                                referrerPolicy="no-referrer"
                                                                className="w-40 h-40 object-cover rounded-3xl" 
                                                                draggable={false} />
                                                        </div>
                                                    ) : (
                                                        <img src={`/assets/profile_pics/${num}.png`}
                                                            referrerPolicy="no-referrer"
                                                            className="w-40 h-40 object-cover" 
                                                            draggable={false} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
            
                                        <div className="flex flex-row space-x-10">
                                            {[4, 5, 6].map(num => (
                                                <button key={num} className="hover:scale-105 transition-transform" 
                                                        onClick={() => pickProfile(num)}>
                                                    {profilePictureType === num && googlePhotoURL ? (
                                                        <div className="relative">
                                                            <img src={googlePhotoURL}
                                                                referrerPolicy="no-referrer"
                                                                className="w-40 h-40 object-cover rounded-3xl" 
                                                                draggable={false} />
                                                        </div>
                                                    ) : (
                                                        <img src={`/assets/profile_pics/${num}.png`}
                                                            referrerPolicy="no-referrer"
                                                            className="w-40 h-40 object-cover" 
                                                            draggable={false} />
                                                    )}
                                                </button>
                                            ))}
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