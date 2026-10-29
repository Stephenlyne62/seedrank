const WINDOW_MS = 5 * 60 * 1000
const attempts = new Map<string, number>()

export function consumeGenerationSlot(identity: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const previous = attempts.get(identity)
  if (previous && now - previous < WINDOW_MS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - previous)) / 1000) }
  }

  attempts.set(identity, now)
  for (const [key, timestamp] of attempts) {
    if (now - timestamp >= WINDOW_MS) attempts.delete(key)
  }
  return { allowed: true, retryAfterSeconds: 0 }
}
