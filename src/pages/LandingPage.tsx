import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="flex dark h-screen flex items-center -z-10">
      <div className="absolute bg-[#0C2112] blur-[10rem] h-full w-1/3 rounded-full left-[-20rem] -z-1"></div>
      <img
        src="/landing-line1.svg"
        alt="Landing"
        className="absolute object-cover z-10 top-[42vh] left-[-1vw]"
      />
      {/* <img
        src="/landing-line2.svg"
        alt="Landing"
        className="absolute object-cover z-10 top-[42vh] left-[43vw]"
      /> */}
      <div className="pl-[10vw] z-10">
        <h1 className="text-[#FFFFFF] text-[clamp(2rem,6vw,6rem)] font-[Mermaid] font-bold text-left w-full pb-[4.5rem]">
          Say hello to <span className="text-[#5AED87]">SAGE</span>, your <br />
          personal Al-powered <br />
          student advisor.
        </h1>
        <Link
          to="/"
          className="bg-[#5AED86] text-black text-base px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition duration-300 mr-[1.875rem]"
        >
          Generate a degree plan
        </Link>
        <Link
          to="/"
          className="border-[#5AED86] border-2 text-white text-base px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition duration-300"
        >
          Ask a question
        </Link>
        <div className="absolute bottom-0 p-4 flex items-center gap-2">
          <img src="/asterisk.svg" alt="asterisk" className="h-4 w-auto" />
          <p className="text-white text-md">Powered by the SAGE team @ UTD</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
