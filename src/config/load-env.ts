import { join, resolve } from "node:path";
import { config } from "dotenv";
import { backendRoot } from "../../paths.js";

// Process variables take precedence; an explicit file is useful for isolated verification.
export function loadEnvironmentFile(): void {
  const explicit = process.env["BACKEND_ENV_FILE"];
  const result = config({
    path: explicit ? resolve(explicit) : join(backendRoot, "env/.env"),
    override: false,
    quiet: true,
  });
  if (explicit && result.error)
    throw new Error("Cannot read BACKEND_ENV_FILE.");
}
