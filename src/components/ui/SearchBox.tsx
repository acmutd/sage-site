import { useMemo, useState, useEffect } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { ChevronsUpDown, PlusIcon, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchboxProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  searchKeys: string[];
  onSelect: (item: T) => void;
  onCreate?: (query: string) => void;
  placeholder?: string;
  triggerLabel?: string;
  className?: string;
  fuseThreshold?: number;
}

export function Searchbox<T>({
  items,
  getLabel,
  getDescription,
  searchKeys,
  onSelect,
  onCreate,
  placeholder = "Search…",
  triggerLabel = "Add",
  className,
  fuseThreshold = 0.25,
}: SearchboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const fuse = useMemo(() => {
    const options: IFuseOptions<T> = {
      keys: searchKeys,
      threshold: fuseThreshold,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
    };
    return new Fuse(items, options);
  }, [items, searchKeys, fuseThreshold]);

  const results = useMemo(() => {
    if (!query.trim()) return items;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, items]);

  const exactMatch = useMemo(
    () => items.some((item) => getLabel(item).toLowerCase() === query.toLowerCase()),
    [items, query, getLabel]
  );

  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * items.length);
        } while (next === prev);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [items]);
  
    
  function handleSelect(item: T) {
    onSelect(item);
    setQuery("");
    setOpen(false);
  }

  function handleCreate() {
    onCreate?.(query.trim());
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          title={triggerLabel}
          className={cn(
            "flex items-center justify-between w-full border border-slate-300 bg-white rounded-sm px-3 py-2 text-sm font-normal text-gray-800 overflow-hidden",
            className
          )}
        >
          {triggerLabel}
          <ChevronsUpDown size={14} className="opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        className="w-[--radix-popover-trigger-width] p-0 z-[200]"
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3 gap-2">
              <Search size={14} className="opacity-50 shrink-0" />
              <div className="relative flex-1 overflow-hidden">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full py-2 text-sm bg-transparent outline-none"
                />
                {!query && (
                  <span className="slot-in absolute inset-y-0 left-0 flex items-center text-sm text-muted-foreground pointer-events-none whitespace-nowrap">
                    Try:&nbsp;
                    <span key={placeholderIndex} className="slot-in inline-flex items-center text-muted-foreground">
                      {items.length > 0 ? getLabel(items[placeholderIndex]) : placeholder}
                    </span>
                  </span>
                )}
              </div>
            </div>
          <CommandList className="max-h-72 overflow-y-auto">
            {/* Results */}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((item, i) => {
                  const label = getLabel(item);
                  const description = getDescription?.(item);
                  return (
                    <CommandItem
                      // Fall back to index only if label dupes are possible
                      key={`${label}-${i}`}
                      value={label}
                      onSelect={() => handleSelect(item)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="font-medium">{label}</span>
                      {description && (
                        <span className="text-xs text-muted-foreground">
                          {description}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* No results copy */}
            {results.length === 0 && !query.trim() && (
              <CommandEmpty>Nothing here yet.</CommandEmpty>
            )}
            {results.length === 0 && query.trim() && !onCreate && (
              <CommandEmpty>No results for &ldquo;{query}&rdquo;.</CommandEmpty>
            )}

            {/* Create new option */}
            {onCreate && query.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={handleCreate}
                  className="gap-2 text-primary"
                >
                  <PlusIcon size={14} />
                  Add &ldquo;{query}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}