import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="flex dark h-screen -z-10">
      <div className="absolute bg-[#0C2112] blur-[10rem] h-full w-1/3 rounded-full left-[-20rem] -z-1"></div>
      <img
        src="/landing-line1.svg"
        alt="Landing"
        className="absolute object-cover top-[38vh] left-[-1vw] w-[9vw] scale-[80%]"
      />
      <img
        src="/landing-line2.svg"
        alt="Landing"
        className="absolute object-cover top-[34vh] left-[42vw] w-[45vw] scale-[80%]"
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
            className="bg-accent border-accent border-2 text-textdark text-[1.1vw] scale-[50vw] px-[1.66vw] py-[1.1vh] rounded-full font-semibold hover:bg-transparent hover:text-textlight transition duration-300"
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
  );
};

export default LandingPage;
