const viteEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;

/** Base URL in Vite; the fallback also keeps task-bank verification runnable in Node. */
export const baseUrl: string = viteEnv?.BASE_URL ?? '/';
