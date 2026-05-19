// Simple lexorank-style midpoint generator using base36 strings.
// Ranks are sortable lexicographically. To insert between A and B, midpoint(A, B).

const MIN = "0";
const MAX = "z";

function charToNum(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 97 && code <= 122) return code - 97 + 10; // a-z
  return 0;
}

function numToChar(n: number): string {
  if (n < 10) return String.fromCharCode(48 + n);
  return String.fromCharCode(97 + (n - 10));
}

export function midpoint(a: string | null, b: string | null): string {
  const left = a ?? MIN.repeat(1);
  const right = b ?? MAX.repeat(1);
  const max = Math.max(left.length, right.length) + 1;
  let result = "";
  let carry = 0;
  for (let i = 0; i < max; i++) {
    const l = i < left.length ? charToNum(left[i]) : 0;
    const r = i < right.length ? charToNum(right[i]) : 35;
    const sum = l + r + carry;
    const half = Math.floor(sum / 2);
    carry = (sum % 2) * 36;
    result += numToChar(half);
    if (carry === 0 && result > left && result < right) break;
  }
  if (result <= left) result = left + "m";
  return result;
}

export function initialRank(): string {
  return "m";
}
