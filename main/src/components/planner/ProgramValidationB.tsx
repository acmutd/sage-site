import React, { useState } from "react";
import { Button, Card, CardContent, Searchbox } from '@sage/ui';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sage/ui';

interface ProgramValidationBProps {
    program: any;
    onNext: () => void;
    onRemove: (id: number) => void;
    onSave: (updatedProgram: any) => void;
    transcriptData: any;
    degreeCatalog: any;
    latestCatalog: any;
    studentCatalogYear: string;
    latestCatalogYear: string;
    catalogYear: "assigned" | "latest";
}

const ProgramValidationB: React.FC<ProgramValidationBProps> = ({ 
    program, onNext, onRemove, onSave, 
    degreeCatalog, latestCatalog, 
    studentCatalogYear, latestCatalogYear,
    catalogYear
}) => {
    const [selectedProgramId] = useState<number | null>(program?.id || null);
    const [updatedProgram, setUpdatedProgram] = useState({
        level: "",
        type: "",
        title: "",
        ...program,
    });

    const activeCatalog = catalogYear === "latest" ? latestCatalog : degreeCatalog;
    const isNewProgram = !program?.id;

    const handleFieldChange = (fieldId: string, value: string) => {
        setUpdatedProgram((prev: any) => ({
            ...prev,
            [fieldId]: value,
            ...(fieldId === "level" ? { type: "", title: "" } : {}),
            ...(fieldId === "type" ? { title: "" } : {}),
        }));
    };

    const getLevelOptions = () => {
        if (!activeCatalog) return [];
        const levels = [];
        if (activeCatalog.undergraduate) levels.push("Undergraduate");
        if (activeCatalog.graduate) levels.push("Graduate");
        return levels;
    };

    const getTypeOptions = () => {
        if (!activeCatalog) return [];
        const level = updatedProgram?.level?.toLowerCase();
        const types = [];
        if (level === "undergraduate") {
            if (activeCatalog.undergraduate?.bachelor) types.push("Major");
            if (activeCatalog.undergraduate?.minor) types.push("Minor");
            if (activeCatalog.undergraduate?.certificate) types.push("Certificate");
        } else if (level === "graduate") {
            if (activeCatalog.graduate?.masters || activeCatalog.graduate?.doctorate) types.push("Major");
            if (activeCatalog.graduate?.certificate) types.push("Certificate");
        }
        return types;
    };

    const getTitleOptions = () => {
        if (!activeCatalog) return [];
        const level = updatedProgram?.level?.toLowerCase();
        const type = updatedProgram?.type?.toLowerCase();
        let raw: string[] = [];
        if (level === "undergraduate") {
            if (type === "major") raw = activeCatalog.undergraduate?.bachelor || [];
            if (type === "minor") raw = activeCatalog.undergraduate?.minor || [];
            if (type === "certificate") raw = activeCatalog.undergraduate?.certificate || [];
        } else if (level === "graduate") {
            if (type === "major") {
                raw = [
                    ...(activeCatalog.graduate?.masters || []),
                    ...(activeCatalog.graduate?.doctorate || [])
                ];
            }
            if (type === "certificate") raw = activeCatalog.graduate?.certificate || [];
        }
        return raw.map((name: string) => ({ name }));
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
    ];

    const handleSave = () => {
        onSave({
            ...updatedProgram,
            catalog_year: catalogYear === "latest" ? latestCatalogYear : studentCatalogYear,
        });
    };

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
                        <div className="flex flex-col gap-4 w-full">
                            {formFields.map((field) => (
                                <div 
                                    key={`${field.id}-${(catalogYear === "latest") ? "latest" : "assigned"}-${field.id === "type" ? updatedProgram.level : ""}`}
                                    className="dropdown-container flex flex-col items-start gap-2 w-full"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <label className="font-body-regular text-redesign-stylesdark-text text-sm">
                                        {field.label}
                                    </label>
                                    <Select 
                                        value={updatedProgram[field.id] ?? ""}
                                        onValueChange={(value) => handleFieldChange(field.id, value)}
                                    >
                                        <SelectTrigger className="bg-redesign-stylesbg-light rounded-sm border border-slate-300 p-2 w-64">
                                            <SelectValue placeholder={field.id === "level" ? program.level : program.type} />
                                        </SelectTrigger>
                                        <SelectContent className="z-[80] bg-white p-1">
                                            {field.options.map((option, index) => (
                                                <SelectItem key={index} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}

                            {updatedProgram?.level?.toLowerCase() === "graduate" && (
                                <div className="flex items-start gap-2 text-sm bg-blue-50 border border-blue-200 rounded-sm px-3 py-2 text-blue-800">
                                    <span>
                                        Not all graduate programs are listed here. If you don't see yours, it means we couldn't support it at this time.
                                    </span>
                                </div>
                            )}

                            <div className="dropdown-container flex flex-col items-start gap-2 w-full"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <label className="font-body-regular text-redesign-stylesdark-text text-sm">
                                    Program name
                                </label>
                                <Searchbox<{ name: string }>
                                    key={(catalogYear === "latest") ? "latest" : "assigned"}
                                    items={getTitleOptions()}
                                    getLabel={(o: { name: string }) => o?.name ?? ""}
                                    searchKeys={["name"]}
                                    onSelect={(o: { name: string }) => handleFieldChange("title", o.name)}
                                    placeholder="Search programs…"
                                    triggerLabel={updatedProgram?.title || "Select program name"}
                                    className="w-full border-slate-300 rounded-sm"
                                />
                            </div>

                            <div className="inline-flex items-start gap-4 relative flex-[0_0_auto]">
                                <Button
                                    variant="link"
                                    className="inline-flex items-center justify-center relative flex-[0_0_auto] p-0 h-auto"
                                    onClick={() => { handleSave(); onNext(); }}
                                >
                                    <span className="font-[number:var(--body-regular-font-weight)] text-blue-600 leading-[var(--body-regular-line-height)] underline font-body-regular text-[length:var(--body-regular-font-size)]">
                                        Save
                                    </span>
                                </Button>

                                <Button
                                    variant="link"
                                    className="inline-flex items-center justify-center relative flex-[0_0_auto] p-0 h-auto"
                                    onClick={onNext}
                                >
                                    <span className="font-[number:var(--body-regular-font-weight)] text-gray-600 leading-[var(--body-regular-line-height)] underline font-body-regular text-[length:var(--body-regular-font-size)]">
                                        Cancel
                                    </span>
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
                                        <span className="font-[number:var(--body-regular-font-weight)] text-[#da0000] leading-[var(--body-regular-line-height)] underline font-body-regular text-[length:var(--body-regular-font-size)]">
                                            Remove
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProgramValidationB;