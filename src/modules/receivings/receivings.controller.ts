import type { RequestHandler } from 'express';
import { parseInput, idParams, emptyQuery, uuid } from '../../common/validation/input.js';
import { createReceivingSchema, receiptSchema, receivingQuery } from './receivings.schema.js';
import type { ReceivingsService } from './receivings.service.js';
export function createReceivingsController(service: ReceivingsService) {
  const list: RequestHandler = async (req, res) => { res.json(await service.list(parseInput(receivingQuery, req.query))); };
  const detail: RequestHandler = async (req, res) => { parseInput(emptyQuery, req.query); res.json({ data: await service.detail(parseInput(idParams, req.params).id) }); };
  const create: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query);
    if (!req.user) throw new Error('Authentication middleware missing.');
    res.status(201).json({ data: await service.create(req.user.id, parseInput(createReceivingSchema, req.body)) });
  };
  const receive: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query);
    const id = parseInput(idParams, req.params).id;
    const key = parseInput(uuid, req.get('Idempotency-Key'));
    const input = parseInput(receiptSchema, req.body);
    if (!req.user) throw new Error('Authentication middleware missing.');
    const result = await service.receive(id, req.user.id, key, input);
    res.set('Idempotency-Replayed', String(result.replayed)).status(result.replayed ? 200 : 201).json({ data: result.receipt });
  };
  return { list, detail, create, receive };
}
