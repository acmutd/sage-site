import { Link } from "react-router-dom";
import { useEffect, useState} from "react";

const LandingPage = () => {
  const [mobileView, setMobileView] = useState(false);

  useEffect(() => {
    if(window.innerWidth < 768) {
      setMobileView(true);
    };
  }, []);

  return (
    <div className="flex dark h-screen">
      {mobileView ? <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[#0C2112] blur-[3rem] rounded-full" /> :
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[#0C2112] blur-[10rem] rounded-full -translate-x-80" />
      }
      {mobileView ? 
        <div className="mt-36">
          <div>
              <img
                src="/landing-line1.svg"
                alt="Landing"
                className="absolute object-cover top-[calc(41vh+6vw)] left-[-1vw] w-[9vw]"
              />
              <h1 className="relative top-[23vh] mx-11 text-textlight text-[8vw] text-left w-fit">
              Say hello to <span className="text-accent font-mermaid">SAGE</span>, your <br />
              personal Al-powered <br />
              student advisor.
            </h1>
          </div>
          <div className="absolute bottom-5 flex items-center gap-2 px-4">
           <img src="/asterisk.svg" alt="asterisk" className="h-4 w-auto" />
           <p className="text-textlight">Powered by the ACM Dev team</p>
         </div>
         <div className="mt-36 flex flex-col bg-dark gap-4 rounded-l-full pr-8 absolute top-[calc(28vh+20vw)] left-[10vw]">
            <Link
              to="/planner"
              className="w-fit bg-accent border-accent border-2 text-textdark text-[4vw] px-[5vw] py-[1.1vh] rounded-full font-semibold hover:bg-transparent hover:text-textlight transition duration-300"
            >
              Generate a degree plan
            </Link>
            <Link
              to="/chatbot"
              className="w-fit border-accent border-2 text-center text-white text-[4vw] px-[5vw] py-[1.1vh] rounded-full font-semibold hover:bg-accent hover:text-textdark transition duration-300"
            >
              Ask a question
            </Link>
            <div className="flex flex-row space-x-[1vh]">
              <Link 
              to="/signup" 
              className="text-accent">
                Sign Up
              </Link>
              <p className="text-textlight">or</p>
              <Link 
              to="/login" 
              className="text-accent">
                Login
              </Link>
            </div>
          </div>
        </div>
         : 
         <div className="relative h-full w-full">
          <img
            src="/landing-line1.svg"
            alt="Landing"
            className="absolute object-cover top-[calc(25vh+6vw)] left-[-1vw] w-[9vw]"
          />
          <img
            src="/landing-line2.svg"
            alt="Landing"
            className="absolute object-cover top-[calc(25vh+6vw)] left-[40vw] w-[45vw]"
          />
          <div className="pl-[10vw] z-10">
          <h1 className="absolute top-[23vh] text-textlight text-[6vw] text-left w-fit">
            Say hello to <span className="text-accent font-mermaid">SAGE</span>, your <br />
            personal Al-powered <br />
            student advisor.
          </h1>
          <div className="flex bg-bgdark gap-4 rounded-l-full pr-8 absolute top-[calc(28vh+20vw)] left-[10vw]">
            <Link
              to="/planner"
              className="bg-accent border-accent border-2 text-textdark text-[1.1vw] px-[1.66vw] py-[1.1vh] rounded-full font-semibold hover:bg-transparent hover:text-textlight transition duration-300"
            >
              Generate a degree plan
            </Link>
            <Link
              to="/chatbot"
              className="border-accent border-2 text-white text-[1.1vw] px-[1.66vw] py-[1.1vh] rounded-full font-semibold hover:bg-accent hover:text-textdark transition duration-300"
            >
              Ask a question
            </Link>
          </div>
          <div className="absolute bottom-5 flex items-center gap-2">
            <img src="/asterisk.svg" alt="asterisk" className="h-4 w-auto" />
            <p className="text-textlight">Powered by the ACM Dev team</p>
          </div>
          </div>
       </div>

      }
    </div>
      
  );
};

export default LandingPage;
