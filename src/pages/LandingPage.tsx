import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="flex dark h-screen flex items-center -z-10">
      <div className="absolute bg-[#0C2112] blur-[10rem] h-full w-1/3 rounded-full left-[-20rem] -z-1"></div>
      <img
        src="/landing-line1.svg"
        alt="Landing"
        className="absolute object-cover top-[47vh] left-[-1vw] w-[8vw]"
      />
      <img
        src="/landing-line2.svg"
        alt="Landing"
        className="absolute object-cover top-[47vh] left-[32vw] w-[40vw]"
      />
      <div className="pl-[10vw] z-10">
        <h1 className="text-[#FFFFFF] text-[5vw] font-[Mermaid] font-bold text-left w-full">
          Say hello to <span className="text-[#5AED87]">SAGE</span>, your <br />
          personal Al-powered <br />
          student advisor.
        </h1>
        <div className="flex bg-[#181818] gap-4 rounded-l-full pr-8 absolute top-[calc(41vh+20vw)] left-[10vw]">
          <Link
            to="/"
            className="bg-[#5AED86] border-[#5AED86] border-2 text-black text-[1.1vw] scale-[50vw] px-8 py-3 rounded-full font-semibold hover:bg-transparent hover:text-white transition duration-300"
          >
            Generate a degree plan
          </Link>
          <Link
            to="/"
            className="border-[#5AED86] border-2 text-white text-[1.1vw] px-8 py-3 rounded-full font-semibold hover:bg-[#5AED86] hover:text-black transition duration-300"
          >
            Ask a question
          </Link>
        </div>
        <div className="absolute bottom-0 p-4 flex items-center gap-2">
          <img src="/asterisk.svg" alt="asterisk" className="h-4 w-auto" />
          <p className="text-white text-md">Powered by the ACM Dev team</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
