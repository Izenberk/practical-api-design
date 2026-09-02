import { Router } from "express";
import { ProductController } from "./product.controller.js";
import { ProductService } from "./product.service.js";
import { validate } from "../../middleware/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsSchema,
} from "./product.schema.js"
import { container } from "../../core/container.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";

const service = new ProductService(container.products);
const controller = new ProductController(service);


export const productRouter = Router();

productRouter.get(
  '/',
  validate(listProductsSchema, 'query'),
  controller.list,
);

productRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  controller.create,
);

productRouter.get(
  '/:id',
  validate(productIdSchema, 'params'),
  controller.getById,
);

productRouter.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(productIdSchema, 'params'),
  validate(updateProductSchema),
  controller.update,
);

productRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(productIdSchema, 'params'),
  controller.remove,
);

