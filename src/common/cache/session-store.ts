import { RedisStore } from "connect-redis";
import type { SessionData } from "express-session";
import type { RedisClient } from "../../lib/redis.js";
import type { Environment } from "../../config/env.js";

export function sessionRemaining(
  session: SessionData,
  environment: Environment,
  now = Date.now(),
): number {
  if (session.userId && session.authenticatedAt !== undefined) {
    return Math.min(
      environment.SESSION_IDLE_SECONDS * 1000,
      session.authenticatedAt +
        environment.SESSION_ABSOLUTE_SECONDS * 1000 -
        now,
      (session.lastActivityAt ?? session.authenticatedAt) +
        environment.SESSION_IDLE_SECONDS * 1000 -
        now,
    );
  }
  return (
    (session.anonymousCreatedAt ?? now) +
    environment.ANONYMOUS_SESSION_SECONDS * 1000 -
    now
  );
}
export function createSessionStore(
  redis: RedisClient,
  environment: Environment,
) {
  return new RedisStore({
    client: redis,
    prefix: `${environment.REDIS_NAMESPACE}:sess:`,
    ttl: (session) =>
      Math.max(1, Math.ceil(sessionRemaining(session, environment) / 1000)),
  });
}
