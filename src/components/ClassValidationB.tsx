import { ChevronDownIcon, EditIcon } from "lucide-react";
import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";

const transferredCredits = [
  {
    code: "CS1200",
    name: "Really Short Name",
  },
  {
    code: "CS1200",
    name: "Super Long Name To Show Truncation, Like Super Duper Long, I Don't Even Think There's Classes With Names This Long",
  },
  {
    code: "CS1200",
    name: "Introduction to Computer Science and Software Engineering",
  },
  {
    code: "CS1200",
    name: "Automata Theory",
  },
];

const fallCourses = [
  {
    code: "CS1200",
    name: "Really Short Name",
  },
  {
    code: "CS1200",
    name: "Super Long Name Like Super Duper Long, I Don't Even Think There's Classes With Names This Long",
  },
  {
    code: "CS1200",
    name: "Introduction to Computer Science and Software Engineering",
  },
  {
    code: "CS1200",
    name: "Automata Theory",
  },
];

interface ClassValidationBProps {
    onNext: () => void;
}

const ClassValidationB: React.FC<ClassValidationBProps> = ({ onNext }) => {
    return (
        <div>
            <div className="flex flex-col items-start mb-6">
                <h3>Are these programs right?</h3>
                <p>
                    We detected these programs on your transcript — let us know which
                    ones you&apos;re still working on.
                </p>
            </div>
            <div className="flex flex-col gap-4 bg-gray-100 p-2 rounded-sm">
            <div className="flex flex-col items-start gap-4 p-4 relative flex-1 self-stretch w-full grow bg-redesign-stylesinner-page-containers rounded-lg overflow-hidden border border-solid border-slate-300 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
          <Card className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full flex-[0_0_auto] bg-redesign-stylesbg-light rounded-lg overflow-hidden border border-solid border-slate-300">
            <CardContent className="p-0 w-full">
              <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative w-fit mt-[-1.00px] font-body-semibold font-[number:var(--body-semibold-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-semibold-font-size)] tracking-[var(--body-semibold-letter-spacing)] leading-[var(--body-semibold-line-height)] [font-style:var(--body-semibold-font-style)]">
                  Transferred Credits
                </div>

                <div className="inline-flex items-center justify-center relative flex-[0_0_auto]">
                  <Button
                    variant="link"
                    className="h-auto p-0 relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap"
                  >
                    <span className="font-[number:var(--body-regular-font-weight)] text-slate-900 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                      Save
                    </span>
                  </Button>
                </div>
              </div>

              {transferredCredits.map((course, index) => (
                <div
                  key={index}
                  className="flex items-center gap-12 relative self-stretch w-full flex-[0_0_auto]"
                >
                  <div className="flex flex-col items-start gap-2.5 p-[5px] relative flex-1 self-stretch grow bg-redesign-stylesbg-light rounded-lg border border-solid border-slate-300">
                    <div className="flex items-center gap-2 px-2 py-1.5 relative self-stretch w-full flex-[0_0_auto]">
                      <div className="flex-1 leading-[var(--body-regular-line-height)] relative font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] [font-style:var(--body-regular-font-style)]">
                        {course.code} — {course.name}
                      </div>

                      <ChevronDownIcon className="relative w-6 h-6" />
                    </div>
                  </div>

                  <div className="inline-flex items-center justify-center relative flex-[0_0_auto]">
                    <Button
                      variant="link"
                      className="h-auto p-0 relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-transparent text-base tracking-[0] leading-4 whitespace-nowrap"
                    >
                      <span className="font-[number:var(--body-regular-font-weight)] text-[#da0000] leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                        Remove
                      </span>
                    </Button>
                  </div>
                </div>
              ))}

              <div className="inline-flex items-center justify-center relative flex-[0_0_auto]">
                <Button
                  variant="link"
                  className="h-auto p-0 relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap"
                >
                  <span className="font-medium text-slate-900 leading-[14px]">
                    &nbsp;
                  </span>
                  <span className="font-[number:var(--body-regular-font-weight)] text-slate-900 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                    Add Course
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full flex-[0_0_auto] mb-[-16.00px] bg-redesign-stylesbg-light rounded-lg overflow-hidden border border-solid border-slate-300">
            <CardContent className="p-0 w-full">
              <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
                <div className="relative w-fit mt-[-1.00px] font-body-semibold font-[number:var(--body-semibold-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-semibold-font-size)] tracking-[var(--body-semibold-letter-spacing)] leading-[var(--body-semibold-line-height)] [font-style:var(--body-semibold-font-style)]">
                  Fall 2025
                </div>

                <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto]">
                  <EditIcon className="relative w-4 h-4" />

                  <Button
                    variant="link"
                    className="h-auto p-0 relative w-fit [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap"
                  >
                    <span className="font-[number:var(--body-regular-font-weight)] text-slate-900 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                      EditIcon
                    </span>
                  </Button>
                </div>
              </div>

              <Separator className="relative w-[87px] h-px bg-redesign-stylescard-border" />

              {fallCourses.map((course, index) => (
                <div
                  key={index}
                  className="flex items-center gap-8 relative self-stretch w-full flex-[0_0_auto]"
                >
                  <div className="relative w-fit mt-[-1.00px] font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] whitespace-nowrap [font-style:var(--body-regular-font-style)]">
                    {course.code}
                  </div>

                  <div className="relative flex-1 mt-[-1.00px] font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesplaceholder-secondary-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] [font-style:var(--body-regular-font-style)]">
                    {course.name}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
            </div>
    );
};

export default ClassValidationB;