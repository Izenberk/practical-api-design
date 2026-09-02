import { Router } from "express";
import { productRouter } from "../modules/products/product.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";

export const v1Router = Router();

v1Router.use('/products', productRouter)
v1Router.use('/auth', authRouter);