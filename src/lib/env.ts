export function getEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

export function getRequiredEnv(name: string, fallback?: string): string {
  const value = getEnv(name, fallback);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const appUrl =
  getEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
