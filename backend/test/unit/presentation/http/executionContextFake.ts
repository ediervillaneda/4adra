import { vi, type Mock } from 'vitest';

export interface ExecutionContextFake {
  waitUntil: Mock<(promise: Promise<unknown>) => void>;
  passThroughOnException: Mock<() => void>;
  props: Record<string, never>;
  /** Espera todas las tareas registradas con waitUntil. */
  settle(): Promise<void>;
}

export function executionContextFake(): ExecutionContextFake {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      pending.push(promise);
    }),
    passThroughOnException: vi.fn(),
    props: {},
    async settle(): Promise<void> {
      await Promise.all(pending);
    },
  };
}
