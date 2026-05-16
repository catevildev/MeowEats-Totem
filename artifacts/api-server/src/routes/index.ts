import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriasRouter from "./categorias";
import produtosRouter from "./produtos";
import pedidosRouter from "./pedidos";
import fiscalRouter from "./fiscal";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriasRouter);
router.use(produtosRouter);
router.use(pedidosRouter);
router.use(fiscalRouter);
router.use(uploadRouter);

export default router;
