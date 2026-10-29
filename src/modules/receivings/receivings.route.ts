import { Router } from "express";
import type { ReceivingsService } from "./receivings.service.js";
import { createReceivingsController } from "./receivings.controller.js";

export function createReceivingsRouter(service: ReceivingsService) {
  const router = Router();
  const controller = createReceivingsController(service);
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.detail);
  router.post("/:id/receipts", controller.receive);
  return router;
}
