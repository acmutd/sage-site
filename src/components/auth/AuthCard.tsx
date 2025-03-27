import { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  form: ReactNode;
}

const AuthCard = (props: AuthCardProps) => {
  return (
    <div className="flex min-h-screen h-max dark justify-center [@media(max-height:720px)]:items-start items-center [@media(max-height:720px)]:py-24">
      <div className="[@media(max-height:720px)]:block hidden fixed top-0 left-0 w-screen h-16 bg-bgdark"></div>
      <div className="flex w-[75vw] [@media(max-height:720px)]:w-[90vw] h-max min-h-[70vh] rounded-lg overflow-hidden">
        <div className="flex-[4] w-auto bg-[#E4E4E4] flex justify-center items-center px-4">
          <img
            src="/login_graphic.svg"
            alt="Login"
            className="w-auto h-auto object-cover"
          />
        </div>
        <div className="flex-[6] bg-bglight">
          <div className="flex flex-col justify-center h-full w-full mx-auto px-[5rem] py-8">
            <h3 className="text-[24px] font-bold text-textdark mb-8">
              {props.title}
            </h3>
            {props.form}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;
