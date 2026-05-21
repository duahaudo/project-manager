"use client";
import { useRef, useState, useEffect } from "react";

export function ColumnToggle({
  statuses,
  hidden,
  onToggle,
}: {
  statuses: string[];
  hidden: string[];
  onToggle: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hiddenCount = hidden.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded border px-2 py-1 text-sm ${
          hiddenCount > 0
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        Columns
        {hiddenCount > 0 && (
          <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white leading-none">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Show / Hide Columns
          </div>
          <ul className="py-1">
            {statuses.map((s) => {
              const visible = !hidden.includes(s);
              return (
                <li key={s}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggle(s)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-zinc-800">{s}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
