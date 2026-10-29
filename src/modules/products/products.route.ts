import { Router } from 'express';
import { authorize } from '../../common/middlewares/authorization.js';
import { createProductsController } from './products.controller.js';
import type { ProductsService } from './products.service.js';
export function createProductsRouter(service: ProductsService) {
  const router = Router(); const controller = createProductsController(service);
  router.get('/', controller.list);
  router.get('/:id', controller.detail);
  router.post('/', authorize('SUPERVISOR'), controller.create);
  return router;
}
