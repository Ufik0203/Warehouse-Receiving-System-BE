import type { RequestHandler } from "express";
import {
  parseInput,
  searchQuery,
  idParams,
  emptyQuery,
} from "../../common/validation/input.js";
import {
  createProductSchema,
  updateProductSchema,
  productHistoryQuery,
} from "./products.schema.js";
import type { ProductsService } from "./products.service.js";

export function createProductsController(service: ProductsService) {
  const list: RequestHandler = async (req, res) => {
    res.json(await service.list(parseInput(searchQuery, req.query)));
  };
  const detail: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query);
    res.json({
      data: await service.detail(parseInput(idParams, req.params).id),
    });
  };
  const create: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query);
    res.status(201).json({
      data: await service.create(parseInput(createProductSchema, req.body)),
    });
  };
  const update: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query);
    const { id } = parseInput(idParams, req.params);
    if (!req.user) throw new Error("Authentication middleware missing.");
    res.json({
      data: await service.update(
        id,
        parseInput(updateProductSchema, req.body),
        req.user.id,
      ),
    });
  };
  const history: RequestHandler = async (req, res) => {
    const { id } = parseInput(idParams, req.params);
    res.json(
      await service.history(id, parseInput(productHistoryQuery, req.query)),
    );
  };
  return { list, detail, create, update, history };
}
