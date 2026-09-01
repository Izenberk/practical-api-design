import { Router } from "express";
import { productRouter } from "../modules/products/product.routes.js";

export const v1Router = Router();

v1Router.use('/products', productRouter)