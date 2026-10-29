import { Router } from "express";
import type { InventoryService } from "./inventory.service.js";
import { createInventoryController } from "./inventory.controller.js";

export function createInventoryRouter(service: InventoryService) {
  const router = Router();
  const controller = createInventoryController(service);
  router.get("/", controller.balances);
  router.get("/transactions", controller.history);
  return router;
}
