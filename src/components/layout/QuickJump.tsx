"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchTicketsGlobal } from "@/lib/actions/tickets";

type Result = {
  id: string;
  key: string;
  title: string;
  type: string;
  status: string;
  priority: string;
};

const TYPE_COLOR: Record<string, string> = {
  epic: "bg-purple-100 text-purple-700",
  story: "bg-blue-100 text-blue-700",
  task: "bg-zinc-100 text-zinc-600",
  bug: "bg-red-100 text-red-700",
};

export function QuickJump({ currentProjectKey }: { currentProjectKey: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (key: string) => {
      const projectKey = key.split("-")[0];
      router.push(`/projects/${projectKey}/tickets/${key}`);
      setQuery("");
      setOpen(false);
      setResults([]);
      inputRef.current?.blur();
    },
    [router]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Debounce search
    const id = setTimeout(() => {
      startTransition(async () => {
        const rows = await searchTicketsGlobal(trimmed);
        setResults(rows);
        setOpen(rows.length > 0);
        setActiveIdx(-1);
      });
    }, 150);
    return () => clearTimeout(id);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) {
        navigate(results[activeIdx].key);
        return;
      }
      // Exact key match → navigate directly
      const trimmed = query.trim().toUpperCase();
      const exact = results.find((r) => r.key.toUpperCase() === trimmed);
      if (exact) {
        navigate(exact.key);
        return;
      }
      // No active selection → navigate first result
      if (results.length > 0) {
        navigate(results[0].key);
        return;
      }
      // If looks like a ticket key pattern (e.g. PML-12), try direct nav
      if (/^[A-Z]+-\d+$/i.test(query.trim())) {
        const key = query.trim().toUpperCase();
        const projectKey = key.split("-")[0];
        router.push(`/projects/${projectKey}/tickets/${key}`);
        setQuery("");
        setOpen(false);
      }
      return;
    }

    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-56 sm:w-72">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Jump to ticket…"
        className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
          {results.map((r, i) => (
            <li
              key={r.id}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                navigate(r.key);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-xs ${
                i === activeIdx ? "bg-indigo-50" : "hover:bg-zinc-50"
              }`}
            >
              <span className="font-mono font-semibold text-indigo-600 shrink-0">{r.key}</span>
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium uppercase ${
                  TYPE_COLOR[r.type] ?? "bg-zinc-100 text-zinc-600"
                }`}
              >
                {r.type}
              </span>
              <span className="truncate text-zinc-700">{r.title}</span>
              <span className="ml-auto shrink-0 text-zinc-400">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
