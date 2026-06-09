import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { getUploadsDir } from "../lib/uploads-dir";

const router = Router();

const uploadDir = getUploadsDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    const id = crypto.randomBytes(8).toString("hex");
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Apenas imagens são permitidas."));
      return;
    }
    cb(null, true);
  },
});

router.post("/upload", upload.single("imagem"), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhuma imagem foi enviada." });
      return;
    }

    const url = `/api/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  } catch (err) {
    req.log?.error({ err }, "Error uploading file");
    res.status(500).json({ error: "Erro interno no upload" });
  }
});

export default router;
