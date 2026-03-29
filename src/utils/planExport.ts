import jsPDF from 'jspdf';

const getAppFont = (): string => {
    if (typeof document === 'undefined') return 'system-ui';
    const el = document.createElement('div');
    document.body.appendChild(el);
    const font = getComputedStyle(el).fontFamily;
    document.body.removeChild(el);
    return font || 'system-ui';
};


export interface PlanCourse {
    code: string;
    name?: string;
    credits?: number;
}

export interface PlanSemester {
    name: string;
    courses: PlanCourse[];
}

export interface PlanYear {
    label: string;
    semesters: PlanSemester[];
}

export interface Plan {
    name: string;
    years: PlanYear[];
}

export interface SavedPlannerState {
    id: string;
    name: string;
    semesters: {
        [yearKey: string]: {
            title: string;
            courses: any[];
            isFromTranscript?: boolean;
            isLocked?: boolean;
        }[];
    };
    placedCourses: string[];
    lastModified: number;
    evaluation: any;
}


const deriveYearLabel = (semesters: { title: string }[], yearKey: string): string => {
    const years = semesters
        .map(s => parseInt(s.title.split(' ')[1]))
        .filter(n => !isNaN(n));
    if (years.length === 0) return yearKey;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? String(min) : `${min} \u2013 ${max}`;
};

export const adaptToPlan = (saved: SavedPlannerState): Plan => ({
    name: saved.name,
    years: Object.keys(saved.semesters)
        .sort()
        .map(yearKey => {
            const rawSems = saved.semesters[yearKey] ?? [];
            return {
                label: deriveYearLabel(rawSems, yearKey),
                semesters: rawSems.map(sem => ({
                    name: sem.title,
                    courses: (sem.courses ?? []).map((c: any): PlanCourse => ({
                        code:    c.course_code || c.code || '',
                        name:    c.course_name || c.name || undefined,
                        credits: c.credits_planned ?? c.credits ?? undefined,
                    })),
                })),
            };
        }),
});

const SCALE         = 2;
const GREEN         = '#3eb369';
const BG            = '#f3f4f6';
const CARD_BG       = '#ffffff';
const SEMESTER_BG   = '#f9fafb';
const BORDER        = '#e5e7eb';
const TEXT_DARK     = '#111827';
const TEXT_MID      = '#4b5563';
const TEXT_LIGHT    = '#9ca3af';

const PAD           = 24;
const YEAR_GAP      = 20;
const SEM_GAP       = 12;
const COURSE_H      = 36;
const COURSE_GAP    = 6;
const SEM_PAD       = 12;
const SEM_HEADER_H  = 36;
const YEAR_HEADER_H = 32;
const CARD_RADIUS   = 12;
const COURSE_RADIUS = 8;
const MIN_SEM_W     = 220;
const TITLE_H       = 52;

const semHeight = (sem: PlanSemester): number =>
    SEM_HEADER_H +
    SEM_PAD +
    sem.courses.length * (COURSE_H + COURSE_GAP) -
    (sem.courses.length > 0 ? COURSE_GAP : 0) +
    SEM_PAD;

const yearHeight = (year: PlanYear): number => {
    const tallestSem = Math.max(...year.semesters.map(semHeight), 60);
    return YEAR_HEADER_H + SEM_GAP + tallestSem + SEM_GAP;
};

const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const makeCSVBlob = (rows: string[][]): Blob => {
    const csv = '\uFEFF' + rows
        .map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))
        .join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
};

const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
};

const slug = (s: string) => s.replace(/\s+/g, '_');
const drawPlanToCanvas = (plan: Plan, semesterFilter?: string): HTMLCanvasElement => {
    const FONT = getAppFont();

    const years: PlanYear[] = semesterFilter
        ? plan.years
            .map(y => ({ ...y, semesters: y.semesters.filter(s => s.name === semesterFilter) }))
            .filter(y => y.semesters.length > 0)
        : plan.years;

    const maxSems = Math.max(...years.map(y => y.semesters.length), 1);
    const semColW = Math.max(MIN_SEM_W, 260);
    const innerW  = maxSems * semColW + (maxSems - 1) * SEM_GAP;
    const totalW  = PAD * 2 + innerW;
    const totalH  = TITLE_H +
        years.reduce((acc, y) => acc + yearHeight(y) + YEAR_GAP, 0) +
        PAD;

    const canvas  = document.createElement('canvas');
    canvas.width  = totalW * SCALE;
    canvas.height = totalH * SCALE;
    const ctx     = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.font         = `bold 18px ${FONT}`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = TEXT_DARK;
    ctx.fillText(plan.name, PAD, TITLE_H / 2);

    ctx.fillStyle = GREEN;
    ctx.fillRect(PAD, TITLE_H - 8, 32, 3);

    let curY = TITLE_H;

    for (const year of years) {
        const courseCount = year.semesters.reduce((a, s) => a + s.courses.length, 0);
        const badge = `${year.semesters.length} semester${year.semesters.length !== 1 ? 's' : ''} \u00b7 ${courseCount} course${courseCount !== 1 ? 's' : ''}`;

        // year label
        ctx.font         = `600 13px ${FONT}`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = TEXT_DARK;
        ctx.fillText(year.label, PAD, curY + YEAR_HEADER_H / 2);

        // pill badge
        const labelW     = ctx.measureText(year.label).width;
        ctx.font         = `12px ${FONT}`;
        const badgeTextW = ctx.measureText(badge).width;
        const pillPadX   = 8;
        const pillH      = 18;
        const pillX      = PAD + labelW + 10;
        const pillY      = curY + YEAR_HEADER_H / 2 - pillH / 2;

        ctx.fillStyle   = '#f3f4f6';
        roundRect(ctx, pillX, pillY, badgeTextW + pillPadX * 2, pillH, pillH / 2);
        ctx.fill();
        ctx.strokeStyle = BORDER;
        ctx.lineWidth   = 0.75;
        ctx.stroke();

        ctx.fillStyle    = TEXT_MID;
        ctx.textBaseline = 'middle';
        ctx.fillText(badge, pillX + pillPadX, curY + YEAR_HEADER_H / 2);

        // dashed divider
        ctx.strokeStyle = BORDER;
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PAD, curY + YEAR_HEADER_H);
        ctx.lineTo(PAD + innerW, curY + YEAR_HEADER_H);
        ctx.stroke();
        ctx.setLineDash([]);

        curY += YEAR_HEADER_H + SEM_GAP;

        const tallestSemH = Math.max(...year.semesters.map(semHeight));

        year.semesters.forEach((sem, si) => {
            const sx = PAD + si * (semColW + SEM_GAP);
            const sy = curY;

            // card shadow
            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            roundRect(ctx, sx + 2, sy + 3, semColW, tallestSemH, CARD_RADIUS);
            ctx.fill();

            // card bg
            ctx.fillStyle = CARD_BG;
            roundRect(ctx, sx, sy, semColW, tallestSemH, CARD_RADIUS);
            ctx.fill();
            ctx.strokeStyle = BORDER;
            ctx.lineWidth   = 1;
            ctx.stroke();

            // semester name
            ctx.fillStyle    = TEXT_DARK;
            ctx.font         = `bold 13px ${FONT}`;
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(sem.name, sx + SEM_PAD, sy + SEM_HEADER_H / 2);

            // divider under header
            ctx.strokeStyle = BORDER;
            ctx.lineWidth   = 0.75;
            ctx.beginPath();
            ctx.moveTo(sx + SEM_PAD, sy + SEM_HEADER_H);
            ctx.lineTo(sx + semColW - SEM_PAD, sy + SEM_HEADER_H);
            ctx.stroke();

            sem.courses.forEach((course, ci) => {
                const cy = sy + SEM_HEADER_H + SEM_PAD + ci * (COURSE_H + COURSE_GAP);
                const cw = semColW - SEM_PAD * 2;

                ctx.fillStyle = SEMESTER_BG;
                roundRect(ctx, sx + SEM_PAD, cy, cw, COURSE_H, COURSE_RADIUS);
                ctx.fill();
                ctx.strokeStyle = BORDER;
                ctx.lineWidth   = 0.75;
                ctx.stroke();

                ctx.fillStyle    = TEXT_DARK;
                ctx.font         = `500 12px ${FONT}`;
                ctx.textAlign    = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(course.code, sx + SEM_PAD + 12, cy + COURSE_H / 2);

                if (course.credits) {
                    ctx.fillStyle = TEXT_LIGHT;
                    ctx.font      = `11px ${FONT}`;
                    ctx.textAlign = 'right';
                    ctx.fillText(`${course.credits} cr`, sx + SEM_PAD + cw - 10, cy + COURSE_H / 2);
                }
            });
        });

        curY += tallestSemH + YEAR_GAP;
    }

    return canvas;
};


export const exportPlanAsPNG = (saved: SavedPlannerState) => {
    const plan = adaptToPlan(saved);
    triggerDownload(drawPlanToCanvas(plan).toDataURL('image/png'), `${slug(plan.name)}_plan.png`);
};

export const exportPlanAsJPG = (saved: SavedPlannerState) => {
    const plan = adaptToPlan(saved);
    triggerDownload(drawPlanToCanvas(plan).toDataURL('image/jpeg', 0.92), `${slug(plan.name)}_plan.jpg`);
};

export const exportPlanAsPDF = (saved: SavedPlannerState) => {
    const plan   = adaptToPlan(saved);
    const canvas = drawPlanToCanvas(plan);
    const w = canvas.width / 2, h = canvas.height / 2;
    const pdf = new jsPDF({ orientation: h > w ? 'portrait' : 'landscape', unit: 'px', format: [w, h] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`${slug(plan.name)}_plan.pdf`);
};

export const exportPlanAsCSV = (saved: SavedPlannerState) => {
    const plan = adaptToPlan(saved);
    const rows: string[][] = [['Year', 'Semester', 'Course Code', 'Course Name', 'Credits']];
    plan.years.forEach(year =>
        year.semesters.forEach(sem =>
            sem.courses.forEach(course =>
                rows.push([year.label, sem.name, course.code, course.name ?? '', course.credits != null ? String(course.credits) : ''])
            )
        )
    );
    triggerDownload(URL.createObjectURL(makeCSVBlob(rows)), `${slug(plan.name)}_plan.csv`);
};


export const exportYearAsPNG = (saved: SavedPlannerState, yearKey: string) => {
    const plan = adaptToPlan({ ...saved, semesters: { [yearKey]: saved.semesters[yearKey] } });
    triggerDownload(drawPlanToCanvas(plan).toDataURL('image/png'), `${slug(plan.years[0]?.label ?? yearKey)}_plan.png`);
};

export const exportYearAsJPG = (saved: SavedPlannerState, yearKey: string) => {
    const plan = adaptToPlan({ ...saved, semesters: { [yearKey]: saved.semesters[yearKey] } });
    triggerDownload(drawPlanToCanvas(plan).toDataURL('image/jpeg', 0.92), `${slug(plan.years[0]?.label ?? yearKey)}_plan.jpg`);
};

export const exportYearAsPDF = (saved: SavedPlannerState, yearKey: string) => {
    const plan   = adaptToPlan({ ...saved, semesters: { [yearKey]: saved.semesters[yearKey] } });
    const canvas = drawPlanToCanvas(plan);
    const w = canvas.width / 2, h = canvas.height / 2;
    const pdf = new jsPDF({ orientation: h > w ? 'portrait' : 'landscape', unit: 'px', format: [w, h] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`${slug(plan.years[0]?.label ?? yearKey)}_plan.pdf`);
};

export const exportYearAsCSV = (saved: SavedPlannerState, yearKey: string) => {
    const plan = adaptToPlan({ ...saved, semesters: { [yearKey]: saved.semesters[yearKey] } });
    const year = plan.years[0];
    if (!year) return;
    const rows: string[][] = [['Year', 'Semester', 'Course Code', 'Course Name', 'Credits']];
    year.semesters.forEach(sem =>
        sem.courses.forEach(course =>
            rows.push([year.label, sem.name, course.code, course.name ?? '', course.credits != null ? String(course.credits) : ''])
        )
    );
    triggerDownload(URL.createObjectURL(makeCSVBlob(rows)), `${slug(year.label)}_courses.csv`);
};


export const exportSemesterAsPNG = (saved: SavedPlannerState, semesterTitle: string) => {
    const plan = adaptToPlan(saved);
    triggerDownload(drawPlanToCanvas(plan, semesterTitle).toDataURL('image/png'), `${slug(semesterTitle)}_plan.png`);
};

export const exportSemesterAsJPG = (saved: SavedPlannerState, semesterTitle: string) => {
    const plan = adaptToPlan(saved);
    triggerDownload(drawPlanToCanvas(plan, semesterTitle).toDataURL('image/jpeg', 0.92), `${slug(semesterTitle)}_plan.jpg`);
};

export const exportSemesterAsPDF = (saved: SavedPlannerState, semesterTitle: string) => {
    const plan   = adaptToPlan(saved);
    const canvas = drawPlanToCanvas(plan, semesterTitle);
    const w = canvas.width / 2, h = canvas.height / 2;
    const pdf = new jsPDF({ orientation: h > w ? 'portrait' : 'landscape', unit: 'px', format: [w, h] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
    pdf.save(`${slug(semesterTitle)}_plan.pdf`);
};

export const exportSemesterAsCSV = (saved: SavedPlannerState, semesterTitle: string) => {
    const plan = adaptToPlan(saved);
    const year = plan.years.find(y => y.semesters.some(s => s.name === semesterTitle));
    const sem  = year?.semesters.find(s => s.name === semesterTitle);
    if (!sem) return;
    const rows: string[][] = [['Year', 'Semester', 'Course Code', 'Course Name', 'Credits']];
    sem.courses.forEach(course =>
        rows.push([year?.label ?? '', sem.name, course.code, course.name ?? '', course.credits != null ? String(course.credits) : ''])
    );
    triggerDownload(URL.createObjectURL(makeCSVBlob(rows)), `${slug(semesterTitle)}_courses.csv`);
};