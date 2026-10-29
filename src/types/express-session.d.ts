import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    authVersion?: number;
    authenticatedAt?: number;
    lastActivityAt?: number;
    anonymousCreatedAt?: number;
  }
}
