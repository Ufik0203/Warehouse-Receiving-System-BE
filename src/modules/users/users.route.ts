import { Router } from 'express';
import { authorize } from '../../common/middlewares/authorization.js';
import { createUsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
export function createUsersRouter(service: UsersService) {
  const router = Router(); const controller = createUsersController(service);
  router.use(authorize('SUPERVISOR'));
  router.get('/', controller.list); router.post('/', controller.create);
  router.get('/:id', controller.detail); router.patch('/:id', controller.update); router.delete('/:id', controller.remove);
  return router;
}
