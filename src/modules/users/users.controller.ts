import type { Request, RequestHandler } from 'express';
import { parseInput, idParams, emptyQuery } from '../../common/validation/input.js';
import { usersQuery, createUserSchema, updateUserSchema } from './users.schema.js';
import type { UsersService } from './users.service.js';
function actorId(req: Request) { if (!req.user) throw new Error('Authentication middleware missing.'); return req.user.id; }
export function createUsersController(service: UsersService) {
  const list: RequestHandler = async (req, res) => { res.json(await service.list(parseInput(usersQuery, req.query))); };
  const detail: RequestHandler = async (req, res) => { parseInput(emptyQuery, req.query); res.json({ data: await service.detail(parseInput(idParams, req.params).id) }); };
  const create: RequestHandler = async (req, res) => { parseInput(emptyQuery, req.query); res.status(201).json({ data: await service.create(actorId(req), parseInput(createUserSchema, req.body)) }); };
  const update: RequestHandler = async (req, res) => {
    parseInput(emptyQuery, req.query); res.json({ data: await service.update(actorId(req), parseInput(idParams, req.params).id, parseInput(updateUserSchema, req.body)) });
  };
  const remove: RequestHandler = async (req, res) => { parseInput(emptyQuery, req.query); await service.remove(actorId(req), parseInput(idParams, req.params).id); res.status(204).end(); };
  return { list, detail, create, update, remove };
}
