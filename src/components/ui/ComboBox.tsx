import * as React from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { ChevronsUpDown, PlusIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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

export interface ComboboxProps<T> {
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

export function Combobox<T>({
  items,
  getLabel,
  getDescription,
  searchKeys,
  onSelect,
  onCreate,
  placeholder = "Search…",
  triggerLabel = "Add",
  className,
  fuseThreshold = 0.35,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const fuse = React.useMemo(() => {
    const options: IFuseOptions<T> = {
      keys: searchKeys,
      threshold: fuseThreshold,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
    };
    return new Fuse(items, options);
  }, [items, searchKeys, fuseThreshold]);

  const results = React.useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    return fuse.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuse, items]);

  const exactMatch = React.useMemo(
    () => items.some((item) => getLabel(item).toLowerCase() === query.toLowerCase()),
    [items, query, getLabel]
  );

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
          className={cn(
            "flex items-center justify-between w-full border border-slate-300 bg-white rounded-sm px-3 py-2 text-sm font-normal text-gray-800",
            className
          )}
        >
          {triggerLabel}
          <ChevronsUpDown size={14} className="opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        className="w-[--radix-popover-trigger-width] p-0 z-[200]"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-48 overflow-y-auto">
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