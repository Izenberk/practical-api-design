import { Router } from "express";
import { productRouter } from "../modules/products/product.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { userRouter } from "../modules/users/user.routes.js";

export const v1Router = Router();

v1Router.use('/products', productRouter)
v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);