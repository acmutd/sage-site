import signupForm from "../components/signup-form";

const SignupPage = () => {
  return (
    <div className="flex h-screen dark justify-center items-center">
      <div className="flex w-[75vw] h-[70vh] rounded-3xl overflow-hidden">
        <div className="flex-[4] w-auto bg-[#E4E4E4] flex justify-center items-center">
          <img
            src="/login_graphic.svg"
            alt="Login"
            className="w-auto h-auto object-cover"
          />
        </div>
        <div className="flex-[6] w-auto bg-white font-[DMSans]">
          <div className="flex flex-col justify-center h-full w-full mx-auto px-[5rem]">
            <h3 className="text-[24px] font-medium font-bold text-[#1A1A1A] mb-8">
              Make an account with Sage
            </h3>
            {signupForm()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
