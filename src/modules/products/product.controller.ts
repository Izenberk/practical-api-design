import type { RequestHandler } from 'express';
import type { ProductService } from './product.service.js';
import type { ListProductsOptions } from './product.repository.js';
import type {
  CreateProductInput,
  UpdateProductInput,
} from './product.types.js';

export class ProductController {
  constructor(private readonly service: ProductService) {}

  list: RequestHandler = async (_req, res) => {
    const options = res.locals.query as ListProductsOptions;
    const products = await this.service.list(options);

    res.json({ data: products });
  };

  getById: RequestHandler = async (_req, res) => {
    const { id } = res.locals.params as { id: string };
    const product = await this.service.getById(id);

    res.json({ data: product });
  };

  create: RequestHandler = async (req, res) => {
    const product = await this.service.create(req.body as CreateProductInput);

    res.status(201).location(`/api/v1/products/${product.id}`).json({
      data: product,
    });
  };

  update: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const product = await this.service.update(
      id,
      req.body as UpdateProductInput,
    );

    res.json({ data: product });
  };

  remove: RequestHandler = async (_req, res) => {
    const { id } = res.locals.params as { id: string };
    await this.service.remove(id);

    res.status(204).send()
  };
}