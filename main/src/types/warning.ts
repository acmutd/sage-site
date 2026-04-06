export type WarningType = 'corequisite' | 'credit_limit' | 'prerequisite' | 'conflict';

export interface Warning {
    type: WarningType;
    severity: 'warning' | 'error' | 'info';
    message: string;
    details?: string[];
}