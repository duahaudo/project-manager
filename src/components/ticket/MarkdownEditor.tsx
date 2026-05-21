"use client";
import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type WrapAction = { kind: "wrap"; before: string; after: string; placeholder?: string };
type LineAction = { kind: "line"; prefix: string };
type LinkAction = { kind: "link" };
type BlockAction = { kind: "block"; before: string; after: string; placeholder?: string };
type Action = WrapAction | LineAction | LinkAction | BlockAction;

export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  onPaste,
  rows = 14,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  // close emoji popover on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-emoji-root]")) setShowEmoji(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showEmoji]);

  function apply(action: Action) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);
    let next = value;
    let newStart = start;
    let newEnd = end;

    if (action.kind === "wrap") {
      const text = sel || action.placeholder || "";
      next = value.slice(0, start) + action.before + text + action.after + value.slice(end);
      newStart = start + action.before.length;
      newEnd = newStart + text.length;
    } else if (action.kind === "block") {
      const text = sel || action.placeholder || "";
      // ensure block is on its own lines
      const needsLeadingNL = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      const needsTrailingNL = end < value.length && value[end] !== "\n" ? "\n" : "";
      next =
        value.slice(0, start) +
        needsLeadingNL +
        action.before +
        text +
        action.after +
        needsTrailingNL +
        value.slice(end);
      newStart = start + needsLeadingNL.length + action.before.length;
      newEnd = newStart + text.length;
    } else if (action.kind === "line") {
      // toggle prefix on each selected line (or current line)
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIdx = value.indexOf("\n", end);
      const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const block = value.slice(lineStart, blockEnd);
      const isOrdered = action.prefix === "1. ";
      const transformed = block
        .split("\n")
        .map((l, i) => (isOrdered ? `${i + 1}. ${l}` : `${action.prefix}${l}`))
        .join("\n");
      next = value.slice(0, lineStart) + transformed + value.slice(blockEnd);
      newStart = lineStart;
      newEnd = lineStart + transformed.length;
    } else if (action.kind === "link") {
      const url = prompt("URL", "https://");
      if (!url) return;
      const text = sel || "link text";
      const md = `[${text}](${url})`;
      next = value.slice(0, start) + md + value.slice(end);
      newStart = start + 1;
      newEnd = start + 1 + text.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  }

  function insertText(text: string) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded text-zinc-700 hover:bg-zinc-200"
    >
      {children}
    </button>
  );

  const Sep = () => <span className="mx-1 h-5 w-px bg-zinc-300" />;

  return (
    <div className={`flex flex-col rounded border border-zinc-300 bg-white${className ? ` ${className}` : ""}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-1 py-1">
        <Btn title="Bold (**text**)" onClick={() => apply({ kind: "wrap", before: "**", after: "**", placeholder: "bold" })}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic (*text*)" onClick={() => apply({ kind: "wrap", before: "*", after: "*", placeholder: "italic" })}>
          <em>I</em>
        </Btn>
        <Btn title="Underline (<u>text</u>)" onClick={() => apply({ kind: "wrap", before: "<u>", after: "</u>", placeholder: "underline" })}>
          <span className="underline">U</span>
        </Btn>
        <Btn title="Strikethrough (~~text~~)" onClick={() => apply({ kind: "wrap", before: "~~", after: "~~", placeholder: "strike" })}>
          <span className="line-through">S</span>
        </Btn>
        <Sep />
        <Btn title="Link" onClick={() => apply({ kind: "link" })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </Btn>
        <Btn title="Numbered list" onClick={() => apply({ kind: "line", prefix: "1. " })}>
          <span className="text-xs font-mono">1.</span>
        </Btn>
        <Btn title="Bullet list" onClick={() => apply({ kind: "line", prefix: "- " })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </Btn>
        <Sep />
        <Btn title="Quote" onClick={() => apply({ kind: "line", prefix: "> " })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h6V11H5a2 2 0 0 0-2 2v8z"/><path d="M14 21h6V11h-4a2 2 0 0 0-2 2v8z"/></svg>
        </Btn>
        <Btn title="Inline code (`code`)" onClick={() => apply({ kind: "wrap", before: "`", after: "`", placeholder: "code" })}>
          <span className="font-mono text-xs">&lt;/&gt;</span>
        </Btn>
        <Btn title="Code block" onClick={() => apply({ kind: "block", before: "```\n", after: "\n```", placeholder: "code" })}>
          <span className="font-mono text-xs">{`{ }`}</span>
        </Btn>
        <Sep />
        <div className="relative" data-emoji-root>
          <Btn title="Emoji" onClick={() => setShowEmoji((s) => !s)}>
            <span className="text-base leading-none">😀</span>
          </Btn>
          {showEmoji && (
            <div className="absolute right-0 z-50 mt-1">
              <EmojiPicker
                onEmojiClick={(d) => {
                  insertText(d.emoji);
                  setShowEmoji(false);
                }}
                theme={"light" as any}
                width={320}
                height={380}
                lazyLoadEmojis
              />
            </div>
          )}
        </div>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        onPaste={onPaste}
        rows={rows}
        placeholder={placeholder}
        className="flex-1 min-h-0 w-full rounded-b bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none overflow-y-auto"
      />
    </div>
  );
}
