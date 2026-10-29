import type { RequestHandler } from 'express';
import { parseInput, searchQuery } from '../../common/validation/input.js';
import { historyQuery } from './inventory.schema.js';
import type { InventoryService } from './inventory.service.js';
export function createInventoryController(service: InventoryService) {
  const balances: RequestHandler = async (req, res) => { res.json(await service.balances(parseInput(searchQuery, req.query))); };
  const history: RequestHandler = async (req, res) => { res.json(await service.history(parseInput(historyQuery, req.query))); };
  return { balances, history };
}
