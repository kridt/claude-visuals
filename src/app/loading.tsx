export default function Loading() {
  return (
    <main className="grid-bg flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-[var(--color-surface)]" />
          <div className="h-3 w-40 animate-pulse rounded bg-[var(--color-surface)]" />
        </div>
        <div className="h-6 w-28 animate-pulse rounded-full bg-[var(--color-surface)]" />
      </div>
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent) 30%, transparent) 50%, transparent)',
        }}
      />
      <div className="grid flex-1 min-h-0 grid-cols-[280px_minmax(0,1fr)_320px] gap-4 px-6 pb-6 pt-4">
        <Skeleton />
        <div className="flex flex-col gap-4">
          <Skeleton heightClass="h-28" />
          <Skeleton className="flex-1" />
        </div>
        <Skeleton />
      </div>
    </main>
  );
}

function Skeleton({
  className,
  heightClass,
}: {
  className?: string;
  heightClass?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${heightClass ?? ''} ${className ?? ''}`}
      style={{
        borderColor: 'var(--color-border)',
        background:
          'color-mix(in oklch, var(--color-bg-elevated) 50%, transparent)',
      }}
    >
      <div className="absolute inset-0 animate-pulse bg-[color-mix(in_oklch,var(--color-surface)_50%,transparent)]" />
    </div>
  );
}
