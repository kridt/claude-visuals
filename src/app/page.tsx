import { LiveCockpit } from '@/components/cockpit/live-cockpit';

export default function Page() {
  return (
    <main className="grid-bg relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--color-accent) 14%, transparent), transparent 70%), radial-gradient(50% 40% at 100% 100%, color-mix(in oklch, var(--color-accent) 10%, transparent), transparent 70%)',
        }}
      />
      <LiveCockpit />
    </main>
  );
}
