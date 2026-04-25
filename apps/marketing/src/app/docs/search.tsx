"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SEARCH_INDEX, type SearchEntry } from "./articles-content";

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const search = useCallback((q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    const filtered = SEARCH_INDEX.filter(
      (entry) =>
        entry.title.toLowerCase().includes(trimmed) ||
        entry.section.toLowerCase().includes(trimmed) ||
        entry.excerpt.toLowerCase().includes(trimmed)
    ).slice(0, 8);
    setResults(filtered);
    setOpen(filtered.length > 0);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          navigate(results[activeIndex].slug);
        }
        break;
      case "Escape":
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function navigate(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/docs/${slug}`);
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M13.5 13.5L17 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Sök i dokumentationen..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          aria-label="Sök i dokumentationen"
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            aria-label="Rensa sökning"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2L12 12M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-50">
          <ul ref={listRef} role="listbox" aria-label="Sökresultat">
            {results.map((entry, i) => (
              <li
                key={entry.slug}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => navigate(entry.slug)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  i === activeIndex
                    ? "bg-blue-50"
                    : "hover:bg-stone-50"
                } ${i > 0 ? "border-t border-stone-100" : ""}`}
              >
                <svg
                  className="mt-0.5 shrink-0 text-stone-400"
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4h12v12H4z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 8h6M7 12h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-stone-900">
                      {entry.title}
                    </span>
                    <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                      {entry.section}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                    {entry.excerpt}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-stone-200 rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
              navigera
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-stone-200 rounded px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              öppna
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-stone-200 rounded px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
              stäng
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
