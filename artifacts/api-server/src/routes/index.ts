import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriasRouter from "./categorias";
import produtosRouter from "./produtos";
import pedidosRouter from "./pedidos";
import pagamentosRouter from "./pagamentos";
import tefConfigRouter from "./tef-config";
import fiscalRouter from "./fiscal";
import uploadRouter from "./upload";
import impressorasRouter from "./impressoras";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriasRouter);
router.use(produtosRouter);
router.use(pedidosRouter);
router.use(pagamentosRouter);
router.use(tefConfigRouter);
router.use(fiscalRouter);
router.use(uploadRouter);
router.use(impressorasRouter);

export default router;
