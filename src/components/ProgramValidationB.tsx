//import { PlusIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";

interface ProgramValidationBProps {
    program: any; // Add a prop to accept the program being edited
    onNext: () => void;
    onRemove: (id: number) => void; // Add onRemove prop
    onSave: (updatedProgram: any) => void; // Add onSave prop
    transcriptData: any;
    degreeCatalog: any;
}

const ProgramValidationB: React.FC<ProgramValidationBProps> = ({ program, onNext, onRemove, onSave, degreeCatalog }) => {
    const [selectedProgramId] = useState<number | null>(program?.id || null);
    const [updatedProgram, setUpdatedProgram] = useState(program); // Local state for the program being edited
    const isNewProgram = !program?.id;

    const handleFieldChange = (fieldId: string, value: string) => {
        setUpdatedProgram((prev: any) => ({
            ...prev,
            [fieldId]: value,
        })); // Update the local program state
    };

    const getLevelOptions = () => {
        if (!degreeCatalog) return [];
        const levels = [];
        if (degreeCatalog.undergraduate) levels.push("Undergraduate");
        if (degreeCatalog.graduate) levels.push("Graduate");
        return levels;
    };
    
    const getTypeOptions = () => {
        if (!degreeCatalog) return [];
        
        const level = updatedProgram?.level?.toLowerCase();
        const types = [];
        
        if (level === "undergraduate") {
          if (degreeCatalog.undergraduate?.bachelor) types.push("Major");
          if (degreeCatalog.undergraduate?.minor) types.push("Minor");
          if (degreeCatalog.undergraduate?.certificate) types.push("Certificate");
        } else if (level === "graduate") {
          if (degreeCatalog.graduate?.masters || degreeCatalog.graduate?.doctorate) types.push("Major");
          if (degreeCatalog.graduate?.certificate) types.push("Certificate");
        }
        
        return types;
    };
    
    const getTitleOptions = () => {
        if (!degreeCatalog) return [];
        
        const level = updatedProgram?.level?.toLowerCase(); // "undergraduate" or "graduate"
        const type = updatedProgram?.type?.toLowerCase(); // "major", "minor", "certificate"
        
        if (level === "undergraduate") {
          if (type === "major") return degreeCatalog.undergraduate?.bachelor || [];
          if (type === "minor") return degreeCatalog.undergraduate?.minor || [];
          if (type === "certificate") return degreeCatalog.undergraduate?.certificate || [];
        } else if (level === "graduate") {
          if (type === "major") 
          {
            return [
                ...(degreeCatalog.graduate?.masters || []),
                ...(degreeCatalog.graduate?.doctorate || [])
            ];
          }
          if (type === "certificate") return degreeCatalog.graduate?.certificate || [];
        }
        
        return [];
    };
    
    const formFields = [
        {
          id: "level",
          label: "Level of Study",
          placeholder: "Select level of study",
          options: getLevelOptions(),
        },
        {
          id: "type",
          label: "Type of program",
          placeholder: "Select type of program",
          options: getTypeOptions(),
        },
        {
          id: "title",
          label: "Program name",
          placeholder: "Select program name",
          options: getTitleOptions(),
        },
    ];

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
                <Card className="py-3 relative overflow-hidden">
                    <CardContent className="flex items-center">
                        <div className="flex flex-col gap-4 w-full"> {/* Ensure all selects are in a column */}
                            {formFields.map((field) => (
                                <div
                                    key={field.id}
                                    className="dropdown-container flex flex-col items-start gap-2 w-full"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    
                                    <label className="font-body-regular text-redesign-stylesdark-text text-sm">
                                        {field.label}
                                    </label>

                                    <Select onValueChange={(value) => handleFieldChange(field.id, value)}
                                    >
                                        <SelectTrigger className={`bg-redesign-stylesbg-light rounded-sm border border-slate-300 p-2 ${field.id === "title" ? "w-full" : "w-64"}`}>
                                            <SelectValue
                                                placeholder={
                                                    field.id === "title"
                                                        ? program.title
                                                        : field.id === "level"
                                                            ? program.level
                                                            : field.id === "type"
                                                                ? program.type
                                                                : field.placeholder
                                                }
                                                className="text-redesign-stylesplaceholder-secondary-text text-sm"
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="z-[80] bg-white p-1">
                                            {field.options?.map((option: string, index: number) => (
                                                <SelectItem key={index} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}

                            <div className="inline-flex items-start gap-4 relative flex-[0_0_auto]">
                                <Button
                                    variant="link"
                                    className="inline-flex items-center justify-center relative flex-[0_0_auto] p-0 h-auto"
                                    onClick={onNext} 
                                >
                                    <div className="relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-redesign-stylesdark-text text-base tracking-[0] leading-4 whitespace-nowrap">
                                        <span 
                                        className="font-[number:var(--body-regular-font-weight)] text-blue-600 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]"
                                        onClick={() => onSave(updatedProgram)}
                                        >
                                            Save
                                        </span>
                                    </div>
                                </Button>

                                <Button
                                    variant="link"
                                    className="inline-flex items-center justify-center relative flex-[0_0_auto] p-0 h-auto"
                                    onClick={onNext}
                                >
                                    <div className="relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-transparent text-base tracking-[0] leading-4 whitespace-nowrap">
                                        <span className="font-[number:var(--body-regular-font-weight)] text-gray-600 leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                                            Cancel
                                        </span>
                                    </div>
                                </Button>

                                {!isNewProgram && (
                                    <Button
                                        variant="link"
                                        className="inline-flex items-center justify-center relative flex-[0_0_auto] p-0 h-auto"
                                        onClick={() => {
                                            if (selectedProgramId !== null) {
                                                onRemove(selectedProgramId);
                                            }
                                        }}
                                    >
                                        <div className="relative w-fit mt-[-1.00px] [font-family:'DM_Sans',Helvetica] font-normal text-transparent text-base tracking-[0] leading-4 whitespace-nowrap">
                                            <span className="font-[number:var(--body-regular-font-weight)] text-[#da0000] leading-[var(--body-regular-line-height)] underline font-body-regular [font-style:var(--body-regular-font-style)] tracking-[var(--body-regular-letter-spacing)] text-[length:var(--body-regular-font-size)]">
                                                Remove
                                            </span>
                                        </div>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* <Button
                    variant="outline"
                    className="flex items-center gap-2 border-dashed border-gray-400 border w-full justify-start text-gray-600 rounded-sm"
                >
                    <PlusIcon size={16} />
                    Add program
                </Button> */}
            </div>

            {/* <div className="flex justify-end mt-8">
                <button
                    className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-green-500 transition"
                    onClick={onNext}
                >
                    Next
                </button>
            </div> */}
        </div>
    );
};

export default ProgramValidationB;