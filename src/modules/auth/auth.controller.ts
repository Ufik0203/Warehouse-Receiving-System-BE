import type { RequestHandler } from "express";
import type { Environment } from "../../config/env.js";
import type { AuthService } from "./auth.service.js";
import type { LoginInput } from "./auth.schema.js";
import { mapUser } from "./auth.mapper.js";
import {
  saveSession,
  regenerateSession,
  destroySession,
} from "../../common/security/session.js";
import { sessionRemaining } from "../../common/cache/session-store.js";
import type { createCsrf } from "../../common/middlewares/csrf.js";

export function createAuthController(
  service: AuthService,
  environment: Environment,
  csrf: ReturnType<typeof createCsrf>,
) {
  const bootstrap: RequestHandler = async (request, response) => {
    if (!request.session.userId) {
      if (
        request.session.anonymousCreatedAt &&
        sessionRemaining(request.session, environment) <= 0
      )
        await regenerateSession(request);
      request.session.anonymousCreatedAt ??= Date.now();
    }
    const token = csrf.generateToken(request);
    request.session.cookie.maxAge = sessionRemaining(
      request.session,
      environment,
    );
    await saveSession(request);
    response.json({ data: { csrfToken: token } });
  };
  const login: RequestHandler = async (request, response) => {
    const input: LoginInput = response.locals["login"];
    const user = await service.login(input.email, input.password);
    await regenerateSession(request);
    request.session.userId = user.id;
    request.session.authVersion = user.authVersion;
    request.session.authenticatedAt = Date.now();
    request.session.lastActivityAt = request.session.authenticatedAt;
    request.session.cookie.maxAge = sessionRemaining(
      request.session,
      environment,
    );
    const token = csrf.generateToken(request, true);
    await saveSession(request);
    response.json({ data: { user: mapUser(user), csrfToken: token } });
  };
  const me: RequestHandler = (request, response) => {
    if (!request.user) throw new Error("Authentication middleware missing.");
    response.json({ data: mapUser(request.user) });
  };
  const logout: RequestHandler = async (request, response) => {
    await destroySession(request, response, environment);
    response.status(204).end();
  };
  return { bootstrap, login, me, logout };
}
