import type { RequestHandler } from 'express';
import { parseInput, searchQuery, idParams, emptyQuery } from '../../common/validation/input.js';
import { createProductSchema } from './products.schema.js';
import type { ProductsService } from './products.service.js';
export function createProductsController(service: ProductsService) {
  const list: RequestHandler = async (req, res) => { res.json(await service.list(parseInput(searchQuery, req.query))); };
  const detail: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query); res.json({ data: await service.detail(parseInput(idParams, req.params).id) });
  };
  const create: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query); res.status(201).json({ data: await service.create(parseInput(createProductSchema, req.body)) });
  };
  return { list, detail, create };
}
