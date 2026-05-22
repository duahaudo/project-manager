type StatusBadgeProps = {
  status: string;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  to_do: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-purple-50 text-purple-700 border-purple-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
};

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/[\s-]+/g, '_');
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = normalizeStatus(status);
  const styles = STATUS_STYLES[key] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200';
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${styles} ${className}`}
    >
      {status}
    </span>
  );
}
