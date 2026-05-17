export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startWatchScheduler } = await import("@/lib/watch/scheduler");
  startWatchScheduler();
}
