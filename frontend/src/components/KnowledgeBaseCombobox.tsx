import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Layers, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface KBEntry {
  id: number;
  title: string;
  content: string;
}

interface KnowledgeBaseComboboxProps {
  entries: KBEntry[];
  selectedScope: "all" | "single";
  selectedId: number | null;
  onSelect: (scope: "all" | "single", id: number | null) => void;
  disabled?: boolean;
}

export function KnowledgeBaseCombobox({
  entries,
  selectedScope,
  selectedId,
  onSelect,
  disabled = false,
}: KnowledgeBaseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTitle =
    selectedScope === "all"
      ? "All Knowledge Bases"
      : entries.find((e) => e.id === selectedId)?.title || "Select Knowledge Base";

  const filteredEntries = entries.filter((entry) =>
    entry.title.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-zinc-950 border-zinc-800 text-zinc-100 hover:bg-zinc-900 px-3 h-10 text-xs font-normal"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedScope === "all" ? (
            <Layers className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          ) : (
            <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          )}
          <span className="truncate">{selectedTitle}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-2" />
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-2xl animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search knowledge bases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
              autoFocus
            />
          </div>

          {/* List Options */}
          <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
            {/* All Knowledge Bases Option */}
            <div
              onClick={() => {
                onSelect("all", null);
                setIsOpen(false);
                setSearch("");
              }}
              className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                selectedScope === "all"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>All Knowledge Bases</span>
              </div>
              {selectedScope === "all" && <Check className="h-3.5 w-3.5 text-zinc-100" />}
            </div>

            {/* Filtered Entry Options */}
            {filteredEntries.map((entry) => {
              const isSelected = selectedScope === "single" && selectedId === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    onSelect("single", entry.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-zinc-800 text-zinc-100 font-semibold"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{entry.title}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-zinc-100" />}
                </div>
              );
            })}

            {filteredEntries.length === 0 && search.trim().length > 0 && (
              <p className="p-3 text-center text-xs text-zinc-500">No matching entries found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
