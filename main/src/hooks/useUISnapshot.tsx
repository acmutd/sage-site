import { useState, useEffect } from 'react';

export function useUISnapshot<T extends object>(key: string, defaults: T) {
    const [state, setState] = useState<T>(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
        } catch {
            return defaults;
        }
    });

    useEffect(() => {
        sessionStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState] as const;
}