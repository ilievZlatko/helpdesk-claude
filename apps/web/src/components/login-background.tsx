/**
 * Decorative backdrop for the frosted-glass card: a pastel gradient, faint
 * glows in the corners, and two saturated orbs placed around the page centre
 * so they sit partly behind the card and show through its blur. Everything
 * drifts slowly (paused when the user prefers reduced motion).
 */
export function LoginBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-linear-to-br from-sky-300 via-indigo-300 to-violet-400 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
      <div className="absolute -top-[25vmax] -left-[20vmax] size-[55vmax] rounded-full bg-sky-500/35 blur-[100px] motion-safe:animate-drift dark:bg-sky-600/20" />
      <div className="absolute -right-[20vmax] -bottom-[25vmax] size-[55vmax] rounded-full bg-fuchsia-400/40 blur-[100px] motion-safe:animate-drift motion-safe:[animation-delay:-12s] dark:bg-violet-600/20" />
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-slate-900)_1px,transparent_1px)] bg-size-[24px_24px] opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] dark:bg-[radial-gradient(var(--color-white)_1px,transparent_1px)]" />
      {/* Orbs, positioned from the page centre (where the card is). */}
      <div className="absolute top-1/2 left-1/2 size-[28rem] -translate-x-[110%] -translate-y-[45%] rounded-full bg-linear-to-br from-blue-500 to-cyan-400 opacity-90 blur-3xl motion-safe:animate-drift dark:opacity-60" />
      <div className="absolute top-1/2 left-1/2 size-[32rem] translate-x-[8%] -translate-y-[18%] rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-400 opacity-80 blur-3xl motion-safe:animate-drift motion-safe:[animation-delay:-10s] dark:opacity-50" />
    </div>
  );
}
