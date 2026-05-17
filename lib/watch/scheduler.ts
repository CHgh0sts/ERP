import { prisma } from "@/lib/db";

type Timer = ReturnType<typeof setInterval>;

type SchedulerState = {
  started: boolean;
  refreshTimer: Timer | null;
  timers: Map<string, Timer>;
  running: Set<string>;
};

const g = globalThis as unknown as { __watchScheduler?: SchedulerState };
if (!g.__watchScheduler) {
  g.__watchScheduler = {
    started: false,
    refreshTimer: null,
    timers: new Map(),
    running: new Set(),
  };
}
const state = g.__watchScheduler;

async function runOne(id: string) {
  // Import dynamique : isole le code Node (fs/path) du bundle Edge.
  const mod = await import("@/lib/watch/runner");
  return mod.runWatchFolder(id);
}

async function tick(id: string) {
  if (state.running.has(id)) return;
  state.running.add(id);
  try {
    await runOne(id);
  } catch {
    // errors are recorded in WatchRun by runner
  } finally {
    state.running.delete(id);
  }
}

async function syncSchedules() {
  let active: { id: string; pollIntervalSec: number }[] = [];
  try {
    active = await prisma.watchFolder.findMany({
      where: { enabled: true },
      select: { id: true, pollIntervalSec: true },
    });
  } catch {
    // DB pas encore initialisee : on ignore silencieusement
    return;
  }

  const wanted = new Set(active.map((a) => a.id));

  for (const id of state.timers.keys()) {
    if (!wanted.has(id)) {
      const t = state.timers.get(id);
      if (t) clearInterval(t);
      state.timers.delete(id);
    }
  }

  for (const a of active) {
    const ms = Math.max(5, a.pollIntervalSec) * 1000;
    const existing = state.timers.get(a.id);
    if (existing) continue;
    const timer = setInterval(() => {
      void tick(a.id);
    }, ms);
    state.timers.set(a.id, timer);
    setTimeout(() => void tick(a.id), 1500);
  }
}

export function startWatchScheduler() {
  if (state.started) return;
  state.started = true;

  void syncSchedules();
  state.refreshTimer = setInterval(() => {
    void syncSchedules();
  }, 30_000);
}

export async function refreshWatchScheduler() {
  await syncSchedules();
}

export async function scanOne(id: string) {
  return runOne(id);
}
