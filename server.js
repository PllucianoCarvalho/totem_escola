const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const db = require("./database/database");

const app = express();
const PORT = process.env.PORT || 3000;

const videosPath = path.join(__dirname, "uploads", "videos");

fs.mkdirSync(videosPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videosPath);
    },
    filename: (req, file, cb) => {
        cb(null, "video-atual.mp4");
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("O arquivo precisa ser um vídeo."));
        }
    }
});

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(
    "/videos",
    express.static(videosPath)
);

app.get("/totem", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "totem", "index.html")
    );
});

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "admin", "index.html")
    );
});

app.get("/api/status", (req, res) => {
    const config = db
        .prepare("SELECT * FROM configuracoes WHERE id = 1")
        .get();

    res.json({
        servidor: "online",
        banco: "SQLite conectado",
        configuracao: config
    });
});

app.get("/api/video", (req, res) => {
    const config = db
        .prepare("SELECT video FROM configuracoes WHERE id = 1")
        .get();

    res.json({
        video: config.video
    });
});

app.post("/api/video", upload.single("video"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            erro: "Nenhum vídeo foi enviado."
        });
    }

    db.prepare(`
        UPDATE configuracoes
        SET video = ?
        WHERE id = 1
    `).run(req.file.filename);

    res.json({
        sucesso: true,
        video: req.file.filename
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});