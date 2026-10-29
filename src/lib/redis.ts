import { createClient } from 'redis';

export function createRedis(redisUrl: string) {
  const client = createClient({ url: redisUrl, disableOfflineQueue: true, socket: { connectTimeout: 3000, reconnectStrategy: false } });
  // Required error listener. Deliberately exclude connection/error objects from logs.
  client.on('error', () => console.error('Redis connection unavailable.'));
  return client;
}

export type RedisClient = ReturnType<typeof createRedis>;
