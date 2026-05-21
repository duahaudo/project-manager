"use client";
import { useRouter } from "next/navigation";

export function BackButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-zinc-500 hover:underline"
    >
      {label}
    </button>
  );
}
