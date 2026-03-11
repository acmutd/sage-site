import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const pad = (n: number) => String(n).padStart(2, '0');

const parseTime12 = (timeStr: string): { start: number; end: number } | null => {
    const trimmed = timeStr.split(';')[0].trim();
    const match = trimmed.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    const toMin = (h: string, m: string, ap: string) => {
        let hrs = parseInt(h);
        const mins = parseInt(m);
        if (ap.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
        if (ap.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + (mins || 0);
    };
    return {
        start: toMin(match[1], match[2], match[3]),
        end: toMin(match[4], match[5], match[6]),
    };
};

const parseDays = (days: string): Set<string> =>
    new Set(days.split(',').map(d => d.trim()).filter(Boolean));

const guessModality = (sec: any): string => {
    const loc = (sec.location || '').toLowerCase();
    const type = (sec.activity_type || '').toLowerCase();
    if (loc === 'online' || type.includes('online') || type.includes('distance')) return 'online';
    if (type.includes('hybrid')) return 'hybrid';
    return 'inperson';
};

const captureGrid = async (gridEl: HTMLElement) => {
    const prevOverflow = gridEl.style.overflow;
    gridEl.style.overflow = 'visible';
    const canvas = await html2canvas(gridEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        scrollY: -window.scrollY,
    });
    gridEl.style.overflow = prevOverflow;
    return canvas;
};

export const exportAsPNG = async (gridEl: HTMLElement, title: string) => {
    const canvas = await captureGrid(gridEl);
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}_schedule.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};

export const exportAsJPG = async (gridEl: HTMLElement, title: string) => {
    const canvas = await captureGrid(gridEl);
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '_')}_schedule.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
};

export const exportAsPDF = async (gridEl: HTMLElement, title: string) => {
    const canvas = await captureGrid(gridEl);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${title.replace(/\s+/g, '_')}_schedule.pdf`);
};

export interface SemesterDateRange {
    start: Date;
    end: Date;
}

const getDefaultDateRange = (): SemesterDateRange => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const start = new Date(now);
    start.setDate(now.getDate() + daysUntilMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 16 * 7); // 16 weeks
    return { start, end };
};

export const exportAsICS = (selectedSectionObjects: any[], title: string, dateRange?: SemesterDateRange) => {
    const DAY_TO_RRULE: Record<string, string> = {
        Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR', Saturday: 'SA'
    };

    const toICSTime = (mins: number, dateStr: string) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${dateStr}T${pad(h)}${pad(m)}00`;
    };

    const { start: semStart, end: semEnd } = dateRange ?? getDefaultDateRange();
    const mondayStr = `${semStart.getFullYear()}${pad(semStart.getMonth() + 1)}${pad(semStart.getDate())}`;
    const untilStr = `${semEnd.getFullYear()}${pad(semEnd.getMonth() + 1)}${pad(semEnd.getDate())}T235959Z`;

    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SchedulePlanner//EN\r\nCALSCALE:GREGORIAN\r\n`;

    selectedSectionObjects.forEach((sec: any) => {
        const t = parseTime12(sec.times_12h);
        if (!t || !sec.days) return;
        const secDays = [...parseDays(sec.days)];
        const rruleDays = secDays.map(d => DAY_TO_RRULE[d]).filter(Boolean).join(',');
        if (!rruleDays) return;

        const uid = `${sec.course_prefix}${sec.course_number}-${sec.section}-${Date.now()}@scheduleplanner`;
        ics += `BEGIN:VEVENT\r\n`;
        ics += `UID:${uid}\r\n`;
        ics += `SUMMARY:${sec.course_prefix?.toUpperCase()} ${sec.course_number} - ${sec.section}\r\n`;
        ics += `DTSTART:${toICSTime(t.start, mondayStr)}\r\n`;
        ics += `DTEND:${toICSTime(t.end, mondayStr)}\r\n`;
        ics += `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilStr}\r\n`;
        if (sec.location) ics += `LOCATION:${sec.location.replace('_', ' ')}\r\n`;
        if (sec.instructors) ics += `DESCRIPTION:Instructor: ${sec.instructors}\r\n`;
        ics += `END:VEVENT\r\n`;
    });

    ics += `END:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}_schedule.ics`;
    link.click();
};

export const exportToGoogleCalendar = (selectedSectionObjects: any[], dateRange?: SemesterDateRange) => {
    const DAY_TO_GCAL: Record<string, string> = {
        Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR', Saturday: 'SA'
    };

    const { start: semStart, end: semEnd } = dateRange ?? getDefaultDateRange();
    const monday = semStart;

    selectedSectionObjects.forEach((sec: any) => {
        const t = parseTime12(sec.times_12h);
        if (!t || !sec.days) return;
        const secDays = [...parseDays(sec.days)];
        const rruleDays = secDays.map(d => DAY_TO_GCAL[d]).filter(Boolean).join(',');

        const startH = Math.floor(t.start / 60);
        const startM = t.start % 60;
        const endH = Math.floor(t.end / 60);
        const endM = t.end % 60;

        const dateStr = `${monday.getFullYear()}${pad(monday.getMonth() + 1)}${pad(monday.getDate())}`;
        const dates = `${dateStr}T${pad(startH)}${pad(startM)}00/${dateStr}T${pad(endH)}${pad(endM)}00`;
        const untilStr = `${semEnd.getFullYear()}${pad(semEnd.getMonth() + 1)}${pad(semEnd.getDate())}T235959Z`;
        const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays};UNTIL=${untilStr}`;
        const titleStr = `${sec.course_prefix?.toUpperCase()} ${sec.course_number} ${sec.section}`;
        const details = sec.instructors ? `Instructor: ${sec.instructors}` : '';
        const location = sec.location?.replace('_', ' ') || '';

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titleStr)}&dates=${encodeURIComponent(dates)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&recur=${encodeURIComponent(rrule)}`;
        window.open(url, '_blank');
    });
};

export const exportAsCSV = (selectedSectionObjects: any[], title: string) => {
    const rows = [['Course', 'Section', 'Class #', 'Instructor', 'Days', 'Time', 'Location', 'Modality']];
    selectedSectionObjects.forEach((sec: any) => {
        rows.push([
            `${sec.course_prefix?.toUpperCase()} ${sec.course_number}`,
            sec.section?.trim() ?? '',
            sec.class_number ?? '',
            sec.instructors ?? '',
            sec.days ?? '',
            sec.times_12h?.split(';')[0].trim() ?? '',
            sec.location?.replace('_', ' ') ?? '',
            guessModality(sec),
        ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}_schedule.csv`;
    link.click();
};