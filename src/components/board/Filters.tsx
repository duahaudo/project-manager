"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Opt = { value: string; label: string };

export type FilterDef = {
  key: string;       // url param
  label: string;
  options: Opt[];    // includes "" = All
};

export function Filters({ defs }: { defs: FilterDef[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  const anyActive = defs.some((d) => sp.get(d.key));

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500">Filter:</span>
      {defs.map((d) => {
        const cur = sp.get(d.key) ?? "";
        return (
          <label key={d.key} className="flex items-center gap-1">
            <span className="text-xs text-zinc-500">{d.label}</span>
            <select
              value={cur}
              onChange={(e) => setParam(d.key, e.target.value)}
              className={`rounded border bg-white px-2 py-1 text-sm text-zinc-900 ${
                cur ? "border-indigo-500 text-indigo-600" : "border-zinc-300"
              }`}
            >
              <option value="">All</option>
              {d.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      {anyActive && (
        <button
          onClick={clearAll}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}
