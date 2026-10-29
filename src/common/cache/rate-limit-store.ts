import { RedisStore } from "rate-limit-redis";
import type { RedisClient } from "../../lib/redis.js";
import { unavailable } from "../errors/app-error.js";

export function createRateLimitStore(redis: RedisClient, prefix: string) {
  const store = new RedisStore({
    prefix,
    sendCommand: async (...args: string[]) => {
      if (!redis.isReady) throw unavailable();
      const reply: unknown = await redis.sendCommand(args);
      if (
        typeof reply === "string" ||
        typeof reply === "number" ||
        typeof reply === "boolean"
      )
        return reply;
      if (
        Array.isArray(reply) &&
        reply.every((value: unknown) =>
          ["string", "number", "boolean"].includes(typeof value),
        )
      ) {
        return reply.map((value: unknown) => {
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          )
            return value;
          throw unavailable();
        });
      }
      throw unavailable();
    },
  });
  // Preload failures must not become unhandled promises. Requests still fail
  // closed through the readiness gate/store; this does not replace the store.
  void store.incrementScriptSha.catch(() => {});
  void store.getScriptSha.catch(() => {});
  return store;
}
