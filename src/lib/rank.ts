function charToNum(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 122) return code - 97 + 10;
  return 0;
}

function numToChar(n: number): string {
  if (n < 10) return String.fromCharCode(48 + n);
  return String.fromCharCode(97 + (n - 10));
}

export function midpoint(a: string | null, b: string | null): string {
  if (a === null && b === null) return "m";
  // No upper bound: append "m" to produce something strictly greater than a
  if (b === null) return a! + "m";

  const left = a ?? "0";
  const right = b;

  for (let i = 0; ; i++) {
    const l = i < left.length ? charToNum(left[i]) : 0;
    const r = i < right.length ? charToNum(right[i]) : 36; // 36 = virtual "past z"

    if (l === r) continue; // same digit, descend deeper

    const mid = Math.floor((l + r) / 2);
    if (mid > l) {
      return left.slice(0, i) + numToChar(mid);
    }
    // r === l + 1: no room at this digit, descend under left[i]
    const suffix = midpoint(left.slice(i + 1) || null, null);
    return left.slice(0, i + 1) + suffix;
  }
}

export function initialRank(): string {
  return "m";
}
