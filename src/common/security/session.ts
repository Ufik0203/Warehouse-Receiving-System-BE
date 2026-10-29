import type { Request, Response } from "express";
import type { CookieOptions } from "express";
import type { Environment } from "../../config/env.js";
import { unavailable } from "../errors/app-error.js";

export function sessionCookie(environment: Environment): {
  name: string;
  options: CookieOptions;
} {
  return {
    name:
      environment.DEPLOYMENT_MODE === "https" ? "__Host-wrs.sid" : "wrs.sid",
    options: {
      path: "/",
      httpOnly: true,
      secure: environment.SESSION_COOKIE_SECURE,
      sameSite: "lax",
    },
  };
}
export function saveSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    request.session.save((error) =>
      error ? reject(unavailable()) : resolve(),
    ),
  );
}
export function regenerateSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) =>
    request.session.regenerate((error) =>
      error ? reject(unavailable()) : resolve(),
    ),
  );
}
export async function destroySession(
  request: Request,
  response: Response,
  environment: Environment,
): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    request.session.destroy((error) =>
      error ? reject(unavailable()) : resolve(),
    ),
  );
  const cookie = sessionCookie(environment);
  response.clearCookie(cookie.name, cookie.options);
}
