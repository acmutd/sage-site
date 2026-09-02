import { useState, useEffect, useRef, useMemo } from "react";
import { collectAllSuggestedCourses } from "@/utils/plannerSidebarUtils";

interface UsePlannerSidebarCategoriesOptions {
  requirements: any[];
  focusLabel?: string;
}

interface UsePlannerSidebarCategoriesResult {
  autoExpandedCategories: { [key: number]: boolean };
  setAutoExpandedCategories: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
  expandedSubcategories: Record<string, boolean>;
  handleToggleSubcategory: (key: string) => void;
  highlightedKey: string | null;
  allSuggestedCourses: any[];
}

export function usePlannerSidebarCategories({
  requirements,
  focusLabel,
}: UsePlannerSidebarCategoriesOptions): UsePlannerSidebarCategoriesResult {
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
  const [autoExpandedCategories, setAutoExpandedCategories] = useState<{ [key: number]: boolean }>({});
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const prevSuggestedByKeyRef = useRef<Record<string, Set<string>>>({});

  const allSuggestedCourses = useMemo(() => collectAllSuggestedCourses(requirements), [requirements]);

  useEffect(() => {
    const getSuggestedCodes = (c: any): Set<string> =>
      new Set((c?.suggested || []).map((s: any) => String(s.code || s.course_code || "").trim().toUpperCase()).filter(Boolean));

    const buildSuggestedByKey = (categories: any[], reqIdx: number, parentIdx: string): Record<string, Set<string>> => {
      const out: Record<string, Set<string>> = {};
      categories.forEach((category, catIdx) => {
        const key = `${reqIdx}-${parentIdx}-${catIdx}`;
        out[key] = getSuggestedCodes(category);
        if (category.categories?.length) {
          Object.assign(out, buildSuggestedByKey(category.categories, reqIdx, `${parentIdx}-${catIdx}`));
        }
      });
      return out;
    };

    const newSuggestedByKey: Record<string, Set<string>> = {};
    requirements.forEach((req, reqIdx) => {
      if (req.categories?.length) {
        Object.assign(newSuggestedByKey, buildSuggestedByKey(req.categories, reqIdx, "0"));
      }
    });

    const keysWithNewSuggestions = new Set<string>();
    Object.entries(newSuggestedByKey).forEach(([key, newCodes]) => {
      const prevCodes = prevSuggestedByKeyRef.current[key];
      if (!prevCodes) return;
      if (newCodes.size > prevCodes.size) keysWithNewSuggestions.add(key);
    });

    const withAncestors = new Set(keysWithNewSuggestions);
    keysWithNewSuggestions.forEach((key) => {
      let k = key;
      while (true) {
        const lastDash = k.lastIndexOf("-");
        if (lastDash <= 0) break;
        k = k.slice(0, lastDash);
        withAncestors.add(k);
      }
    });
    const keysToExpand = withAncestors;

    const prevHadAny = Object.keys(prevSuggestedByKeyRef.current).length > 0;
    prevSuggestedByKeyRef.current = newSuggestedByKey;

    const keysWithSuggestedOnInitial = new Set<string>();
    if (!prevHadAny) {
      Object.entries(newSuggestedByKey).forEach(([key, codes]) => {
        if (codes.size > 0) keysWithSuggestedOnInitial.add(key);
      });
      keysWithSuggestedOnInitial.forEach((key) => {
        let k = key;
        while (true) {
          const lastDash = k.lastIndexOf("-");
          if (lastDash <= 0) break;
          k = k.slice(0, lastDash);
          keysWithSuggestedOnInitial.add(k);
        }
      });
    }

    const initializeCategories = (categories: any[], reqIdx: number, parentIdx: string): Record<string, boolean> => {
      const result: Record<string, boolean> = {};
      categories.forEach((category, catIdx) => {
        const key = `${reqIdx}-${parentIdx}-${catIdx}`;
        const isIncomplete = category.progress < category.total && category.total > 0;
        const defaultExpanded = prevHadAny
          ? isIncomplete
          : keysWithSuggestedOnInitial.has(key) || isIncomplete;
        const gotNewSuggestions = keysToExpand.has(key);
        let expanded: boolean;
        if (prevHadAny && expandedSubcategories[key] === false && !gotNewSuggestions) {
          expanded = false;
        } else if (gotNewSuggestions) {
          expanded = true;
        } else if (prevHadAny && key in expandedSubcategories) {
          expanded = expandedSubcategories[key];
        } else {
          expanded = defaultExpanded;
        }
        result[key] = expanded;
        const parts = (category.name || '').split('|').map((p: string) => p.trim());
        if (parts.length > 1) {
          parts.forEach((_: string, i: number) => {
            const partKey = `${key}-part-${i}`;
            if (gotNewSuggestions) {
              result[partKey] = true;
            } else if (!(partKey in expandedSubcategories)) {
              result[partKey] = defaultExpanded;
            } else {
              result[partKey] = expandedSubcategories[partKey];
            }
          });
        }
        if (category.categories?.length) {
          Object.assign(result, initializeCategories(category.categories, reqIdx, `${parentIdx}-${catIdx}`));
        }
      });
      return result;
    };

    const initialState: Record<string, boolean> = {};
    requirements.forEach((req, reqIdx) => {
      if (req.categories?.length) {
        Object.assign(initialState, initializeCategories(req.categories, reqIdx, "0"));
      }
    });
    setExpandedSubcategories(initialState);

    const reqKeysWithNew = new Set<number>();
    keysToExpand.forEach((k) => {
      const reqIdx = parseInt(k.split("-")[0], 10);
      if (!isNaN(reqIdx)) reqKeysWithNew.add(reqIdx);
    });

    if (!prevHadAny) {
      const initialReqState: { [key: number]: boolean } = {};
      requirements.forEach((req, reqIdx) => {
        const isIncomplete = req.progress < req.total;
        const hasSuggested = req.categories?.some((c: any) => c.suggested?.length);
        const hasContent = !!(req.categories?.length);
        initialReqState[reqIdx] = (isIncomplete && hasContent) || !!hasSuggested;
      });
      setAutoExpandedCategories(initialReqState);
    } else if (reqKeysWithNew.size > 0) {
      setAutoExpandedCategories((prev) => {
        const next = { ...prev };
        reqKeysWithNew.forEach((idx) => { next[idx] = true; });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements]);

  useEffect(() => {
    if (!focusLabel) return;
    const newExpanded = { ...expandedSubcategories };
    let foundKey: string | null = null;

    const findAndExpand = (categories: any[], reqIdx: number, parentPath = "0"): boolean => {
      return categories.some((category, catIdx) => {
        const key = `${reqIdx}-${parentPath}-${catIdx}`;
        if (category.name?.includes(focusLabel)) {
          foundKey = key;
          return true;
        }
        const childMatched = category.categories?.length
          ? findAndExpand(category.categories, reqIdx, `${parentPath}-${catIdx}`)
          : false;
        if (childMatched) newExpanded[key] = true;
        return childMatched;
      });
    };

    requirements.forEach((req, reqIdx) => {
      const matched = findAndExpand(req.categories ?? [], reqIdx);
      if (matched) setAutoExpandedCategories((prev) => ({ ...prev, [reqIdx]: true }));
    });

    setExpandedSubcategories(newExpanded);
    if (foundKey) setHighlightedKey(foundKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLabel]);

  useEffect(() => {
    if (!highlightedKey) return;
    const el = document.querySelector(`[data-category-key="${highlightedKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setHighlightedKey(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedKey]);

  const handleToggleSubcategory = (key: string) => {
    setExpandedSubcategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return {
    autoExpandedCategories,
    setAutoExpandedCategories,
    expandedSubcategories,
    handleToggleSubcategory,
    highlightedKey,
    allSuggestedCourses,
  };
}
