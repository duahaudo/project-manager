"use client";
import { useEffect, useRef, useState } from "react";

export function Combobox({
  value,
  options,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // keep input in sync when value changes externally
  useEffect(() => {
    setInput(value);
  }, [value]);

  // outside click closes
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        if (open) commit();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, input]);

  const q = input.trim();
  const lower = q.toLowerCase();
  const filtered = options
    .filter((o) => (lower ? o.toLowerCase().includes(lower) : true))
    .sort((a, b) => a.localeCompare(b));
  const exact = filtered.some((o) => o.toLowerCase() === lower);
  const showAdd = !!q && !exact;

  function commit(v?: string) {
    const next = v !== undefined ? v : input.trim();
    if (next !== value) onChange(next);
    setInput(next);
  }

  function pick(v: string) {
    commit(v);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1 + (showAdd ? 1 : 0)));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < filtered.length) {
        pick(filtered[highlight]);
      } else if (showAdd) {
        pick(q);
      } else {
        commit();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setInput(value);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        value={input}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        className={
          className ??
          "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900"
        }
      />
      {open && (filtered.length > 0 || showAdd) && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded border border-zinc-200 bg-white py-1 text-sm text-zinc-900 shadow-lg">
          {filtered.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center px-3 py-1.5 text-left ${
                  i === highlight ? "bg-indigo-50" : ""
                }`}
              >
                {o}
              </button>
            </li>
          ))}
          {showAdd && (
            <li className="border-t border-zinc-200">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(q)}
                onMouseEnter={() => setHighlight(filtered.length)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-indigo-600 ${
                  highlight === filtered.length ? "bg-indigo-50" : ""
                }`}
              >
                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  + Add
                </span>
                <span>“{q}”</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
