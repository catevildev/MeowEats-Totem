import { Router } from "express";
import multer from "multer";
import { getImageStorage } from "../lib/image-storage";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Apenas imagens são permitidas."));
      return;
    }
    cb(null, true);
  },
});

router.post("/upload", upload.single("imagem"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem foi enviada." });
    }

    const storage = getImageStorage();
    const { url } = await storage.upload(req.file.buffer, {
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      folder: "categorias",
    });

    res.status(201).json({ url });
  } catch (err) {
    req.log?.error({ err }, "Error uploading file");
    const message =
      err instanceof Error ? err.message : "Erro interno no upload";
    res.status(500).json({ error: message });
  }
});

export default router;
