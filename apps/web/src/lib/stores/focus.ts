import { get, writable } from 'svelte/store';

export type FocusMode = 'time' | 'goal';
export type FocusStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export type FocusSession = {
  id: string;
  mode: FocusMode;
  status: FocusStatus;
  activityType: string;
  goalText?: string | null;
  plannedSeconds?: number | null;
  actualSeconds: number;
  remainingSeconds?: number | null;
  startedAt: string;
  endedAt?: string | null;
  pausedAt?: string | null;
  pauseAccumulatedSeconds: number;
};

type FocusState = {
  session: FocusSession | null;
  loading: boolean;
  error: string | null;
};

const state = writable<FocusState>({
  session: null,
  loading: false,
  error: null,
});

let ticker: ReturnType<typeof setInterval> | null = null;

function readError(res: Response, fallback: string) {
  return res
    .json()
    .then((body) => body?.error || body?.message || fallback)
    .catch(() => fallback);
}

async function request(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api/proxy${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readError(res, `Request failed (${res.status})`));
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return res.json();
}

function tickSession() {
  const current = get(state).session;
  if (!current || current.status !== 'running') return;

  const now = new Date();
  const start = new Date(current.startedAt);
  const elapsed = Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / 1000) - (current.pauseAccumulatedSeconds || 0),
  );

  const next = {
    ...current,
    actualSeconds: elapsed,
    remainingSeconds:
      current.mode === 'time' && current.plannedSeconds != null
        ? Math.max(0, current.plannedSeconds - elapsed)
        : null,
  };

  state.update((s) => ({ ...s, session: next }));
}

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(tickSession, 1000);
}

export const focusStore = {
  subscribe: state.subscribe,

  async loadActive() {
    state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const session = (await request('/focus/sessions/active', 'GET')) as FocusSession | null;
      state.update((s) => ({ ...s, loading: false, session: session || null }));
      ensureTicker();
      return session;
    } catch (error) {
      state.update((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load active session',
      }));
      return null;
    }
  },

  async startSession(payload: {
    mode: FocusMode;
    activityType: string;
    goalText?: string;
    plannedSeconds?: number;
    metadataJson?: Record<string, unknown>;
  }) {
    state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const session = (await request('/focus/sessions', 'POST', payload)) as FocusSession;
      state.update((s) => ({ ...s, loading: false, session }));
      ensureTicker();
      return session;
    } catch (error) {
      state.update((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to start session',
      }));
      return null;
    }
  },

  async pause() {
    const session = get(state).session;
    if (!session) return null;
    const next = (await request(`/focus/sessions/${session.id}/pause`, 'POST')) as FocusSession;
    state.update((s) => ({ ...s, session: next }));
    return next;
  },

  async resume() {
    const session = get(state).session;
    if (!session) return null;
    const next = (await request(`/focus/sessions/${session.id}/resume`, 'POST')) as FocusSession;
    state.update((s) => ({ ...s, session: next }));
    return next;
  },

  async adjust(payload: { plannedSeconds?: number; remainingSecondsDelta?: number }) {
    const session = get(state).session;
    if (!session) return null;
    const next = (await request(`/focus/sessions/${session.id}/adjust`, 'POST', payload)) as FocusSession;
    state.update((s) => ({ ...s, session: next }));
    return next;
  },

  async complete() {
    const session = get(state).session;
    if (!session) return null;
    const next = (await request(`/focus/sessions/${session.id}/complete`, 'POST')) as FocusSession;
    state.update((s) => ({ ...s, session: next }));
    return next;
  },

  async cancel() {
    const session = get(state).session;
    if (!session) return null;
    const next = (await request(`/focus/sessions/${session.id}/cancel`, 'POST')) as FocusSession;
    state.update((s) => ({ ...s, session: next }));
    return next;
  },

  clear() {
    state.update((s) => ({ ...s, session: null, error: null }));
  },
};
