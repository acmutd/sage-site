import { ReactNode } from "react";

interface AuthPageProps {
    title: string;
    form: ReactNode;
}

const AuthPage = (props: AuthPageProps) => {
  return (
    <div className="flex min-h-screen h-max dark justify-center [@media(max-height:720px)]:items-start items-center [@media(max-height:720px)]:py-24">
      <div className="[@media(max-height:720px)]:block hidden fixed top-0 left-0 w-screen h-16 bg-black"></div>
      <div className="flex w-[75vw] h-[70vh] min-h-[600px] rounded-3xl overflow-hidden">
        <div className="flex-[4] w-auto bg-[#E4E4E4] flex justify-center items-center">
          <img
            src="/login_graphic.svg"
            alt="Login"
            className="w-auto h-auto object-cover"
          />
        </div>
        <div className="flex-[6] w-auto bg-white font-[DMSans]">
          <div className="flex flex-col justify-center h-full w-full mx-auto px-[5rem]">
            <h3 className="text-[24px] font-bold text-[#1A1A1A] mb-8">
              {props.title}
            </h3>
            {props.form}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
