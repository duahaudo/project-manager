"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";

type Opt = { value: string; label: string };

export type FilterDef = {
  key: string;
  label: string;
  options: Opt[];
};

function FilterDropdown({
  def,
  selected,
  onChange,
}: {
  def: FilterDef;
  selected: string[];
  onChange: (vals: string[]) => void;
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

  function toggle(val: string) {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  }

  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${
          active
            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        <span className="text-xs text-zinc-500 mr-0.5">{def.label}</span>
        {active ? (
          <span className="font-medium">
            {selected.length === 1
              ? (def.options.find((o) => o.value === selected[0])?.label ?? selected[0])
              : `${selected.length} selected`}
          </span>
        ) : (
          <span className="text-zinc-400">All</span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="ml-0.5 opacity-50"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {def.label}
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {def.options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-zinc-800">{o.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {active && (
            <div className="border-t border-zinc-100 px-3 py-1.5">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-zinc-500 hover:text-zinc-800"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Filters({
  defs,
  storageKey,
}: {
  defs: FilterDef[];
  storageKey?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const filterKeys = defs.map((d) => d.key);
  const synced = useRef(false);

  // On mount: if URL has no filter params, restore from localStorage.
  // If URL has filter params, persist them to localStorage.
  useEffect(() => {
    if (!storageKey || synced.current) return;
    synced.current = true;

    const hasUrlFilters = filterKeys.some((k) => sp.get(k));

    if (hasUrlFilters) {
      // URL → localStorage
      try {
        const saved: Record<string, string> = {};
        filterKeys.forEach((k) => {
          const v = sp.get(k);
          if (v) saved[k] = v;
        });
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {}
    } else {
      // localStorage → URL
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved: Record<string, string> = JSON.parse(raw);
          const next = new URLSearchParams(sp.toString());
          let any = false;
          filterKeys.forEach((k) => {
            if (saved[k]) { next.set(k, saved[k]); any = true; }
          });
          if (any) router.replace(`${pathname}?${next.toString()}`);
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function getSelected(key: string): string[] {
    const v = sp.get(key);
    if (!v) return [];
    return v.split(",").filter(Boolean);
  }

  function setSelected(key: string, vals: string[]) {
    const next = new URLSearchParams(sp.toString());
    if (vals.length === 0) next.delete(key);
    else next.set(key, vals.join(","));
    router.push(`${pathname}?${next.toString()}`);

    // persist to localStorage
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved: Record<string, string> = raw ? JSON.parse(raw) : {};
        if (vals.length === 0) delete saved[key];
        else saved[key] = vals.join(",");
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {}
    }
  }

  function clearAll() {
    router.push(pathname);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  }

  const anyActive = filterKeys.some((k) => sp.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500 text-xs">Filter:</span>
      {defs.map((d) => (
        <FilterDropdown
          key={d.key}
          def={d}
          selected={getSelected(d.key)}
          onChange={(vals) => setSelected(d.key, vals)}
        />
      ))}
      {anyActive && (
        <button
          onClick={clearAll}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
