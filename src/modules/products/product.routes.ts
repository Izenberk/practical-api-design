import { Router } from "express";
import { ProductController } from "./product.controller.js";
import { ProductService } from "./product.service.js";
import { InMemoryProductRepository } from "./product.repository.memory.js";
import { validate } from "../../middleware/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsSchema,
} from "./product.schema.js"
import { container } from "../../core/container.js";

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
  validate(productIdSchema, 'params'),
  validate(updateProductSchema),
  controller.update,
);

productRouter.delete(
  '/:id',
  validate(productIdSchema, 'params'),
  controller.remove,
);

