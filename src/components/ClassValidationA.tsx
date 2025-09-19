import { EditIcon } from "lucide-react";
import React from "react";
import { Button } from "..//components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const transferredCreditsData = [
    { code: "CS1200", name: "Really Short Name" },
    {
        code: "CS1200",
        name: "Super Long Name To Show Wraparound, Like Super Duper Long, I Don't Even Think There's Classes With Names This Long",
    },
    {
        code: "CS1200",
        name: "Introduction to Computer Science and Software Engineering",
    },
    { code: "CS1200", name: "Automata Theory" },
];

const fall2025Data = [
    { code: "CS1200", name: "Really Short Name" },
    {
        code: "CS1200",
        name: "Super Long Name Like Super Duper Long, I Don't Even Think There's Classes With Names This Long",
    },
    {
        code: "CS1200",
        name: "Introduction to Computer Science and Software Engineering",
    },
    { code: "CS1200", name: "Automata Theory" },
];

interface ClassValidationAProps {
    onNext: () => void;
}

const ClassValidationA: React.FC<ClassValidationAProps> = ({ onNext }) => {
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
                <Card className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full flex-[0_0_auto] bg-redesign-stylesbg-light rounded-lg overflow-hidden border border-solid border-slate-300">
                    <CardContent className="p-0 w-full">
                        <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto] mb-2">
                            <h2 className="relative w-fit mt-[-1.00px] font-body-semibold font-[number:var(--body-semibold-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-semibold-font-size)] tracking-[var(--body-semibold-letter-spacing)] leading-[var(--body-semibold-line-height)] [font-style:var(--body-semibold-font-style)]">
                                Transferred Credits
                            </h2>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
                            >
                                <EditIcon className="relative w-4 h-4" />
                                <span className="relative w-fit [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap">
                                    <span className="font-[number:var(--body-regular-font-weight)] text-slate-900 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                                        EditIcon
                                    </span>
                                </span>
                            </Button>
                        </div>

                        <div className="relative w-[87px] h-px bg-redesign-stylescard-border mb-2" />

                        {transferredCreditsData.map((course, index) => (
                            <div
                                key={`transferred-${index}`}
                                className="flex items-center gap-8 relative self-stretch w-full flex-[0_0_auto] mb-1 last:mb-0"
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

                <Card className="flex flex-col items-start justify-center gap-2 px-4 py-5 relative self-stretch w-full flex-[0_0_auto] bg-redesign-stylesbg-light rounded-lg overflow-hidden border border-solid border-slate-300">
                    <CardContent className="p-0 w-full">
                        <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto] mb-2">
                            <h2 className="relative w-fit mt-[-1.00px] font-body-semibold font-[number:var(--body-semibold-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-semibold-font-size)] tracking-[var(--body-semibold-letter-spacing)] leading-[var(--body-semibold-line-height)] [font-style:var(--body-semibold-font-style)]">
                                Fall 2025
                            </h2>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="inline-flex items-center gap-1.5 relative flex-[0_0_auto] h-auto p-0 hover:bg-transparent"
                            >
                                <EditIcon className="relative w-4 h-4" />
                                <span className="relative w-fit [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap">
                                    <span className="font-[number:var(--body-regular-font-weight)] text-slate-900 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                                        EditIcon
                                    </span>
                                </span>
                            </Button>
                        </div>

                        <div className="relative w-[87px] h-px bg-redesign-stylescard-border mb-2" />

                        {fall2025Data.map((course, index) => (
                            <div
                                key={`fall2025-${index}`}
                                className="flex items-center gap-8 relative self-stretch w-full flex-[0_0_auto] mb-1 last:mb-0"
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

            <div className="flex justify-end mt-8">
                <button
                    className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
                    onClick={onNext}
                >
                    Finish
                </button>
            </div>
        </div>
    );
};

export default ClassValidationA;