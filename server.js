const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");

const requiredEnv = ["SESSION_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD"];
const missingEnv = requiredEnv.filter(name => !process.env[name]);

if (missingEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const db = require("./database/database");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const USUARIO_ADMIN = process.env.ADMIN_USERNAME;
const SENHA_ADMIN = process.env.ADMIN_PASSWORD;

app.use(express.json());

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000
    }
}));

app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "login", "index.html")
    );
});

app.post("/login", (req, res) => {

    const { usuario, senha } = req.body;

    if (
        usuario === USUARIO_ADMIN &&
        senha === SENHA_ADMIN
    ) {
        req.session.autenticado = true;

        return res.json({
            sucesso: true
        });
    }

    res.status(401).json({
        erro: "Usuário ou senha incorretos."
    });
});

function protegerAmostradinho(req, res, next) {

    if (!req.session.autenticado) {
        return res.redirect("/login");
    }

    next();
}

app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/login");
    });
});

const videosPath = path.join(__dirname, "dados", "videos");
const imagensPath = path.join(__dirname, "dados", "imagens");

fs.mkdirSync(videosPath, { recursive: true });
fs.mkdirSync(imagensPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videosPath);
    },

    filename: (req, file, cb) => {
        const nomeOriginal = path
            .parse(file.originalname)
            .name
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        const extensao = path.extname(file.originalname);

        cb(null, `${nomeOriginal}${extensao}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024
    }
});

const storageImagem = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagensPath);
    },

    filename: (req, file, cb) => {
        const nomeOriginal = path
            .parse(file.originalname)
            .name
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        const extensao = path.extname(file.originalname);

        cb(null, `${nomeOriginal}${extensao}`);
    }
});

const uploadImagem = multer({
    storage: storageImagem,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Apenas imagens são permitidas."));
        }

        cb(null, true);
    }
});


app.use("/amostradinho", protegerAmostradinho);

app.use(express.static(path.join(__dirname, "public")));

app.use(
    "/videos",
    express.static(videosPath)
);

app.use(
    "/imagens",
    express.static(imagensPath)
);

app.get("/totem", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "totem", "index.html")
    );
});

app.get("/amostradinho", protegerAmostradinho, (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "amostradinho", "index.html")
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

app.get("/api/videos", (req, res) => {
    const arquivos = fs.readdirSync(videosPath)
        .filter(arquivo => arquivo.toLowerCase().endsWith(".mp4"));

    const config = db
        .prepare("SELECT video FROM configuracoes WHERE id = 1")
        .get();

    res.json({
        videos: arquivos,
        ativo: config.video
    });
});

app.delete("/api/videos/:video", (req, res) => {
    const video = req.params.video;

    const config = db
        .prepare("SELECT video FROM configuracoes WHERE id = 1")
        .get();

    if (config.video === video) {
        return res.status(400).json({
            erro: "Não é possível excluir o vídeo que está ativo."
        });
    }

    const caminhoVideo = path.join(videosPath, video);

    if (!fs.existsSync(caminhoVideo)) {
        return res.status(404).json({
            erro: "Vídeo não encontrado."
        });
    }

    fs.unlinkSync(caminhoVideo);

    res.json({
        sucesso: true,
        video
    });
});

app.post("/api/video/ativar", (req, res) => {
    const { video } = req.body;

    if (!video) {
        return res.status(400).json({
            erro: "Nenhum vídeo informado."
        });
    }

    const caminhoVideo = path.join(videosPath, video);

    if (!fs.existsSync(caminhoVideo)) {
        return res.status(404).json({
            erro: "Vídeo não encontrado."
        });
    }

    db.prepare(`
        UPDATE configuracoes
        SET video = ?
        WHERE id = 1
    `).run(video);

    res.json({
        sucesso: true,
        video
    });
});

app.get("/api/avisos", (req, res) => {
    const avisos = db.prepare(`
        SELECT *
        FROM avisos
        ORDER BY inicio ASC
    `).all();

    res.json({
        avisos
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

app.post("/api/avisos", (req, res) => {
    const { mensagem, inicio, fim } = req.body;

    if (!mensagem || !inicio || !fim) {
        return res.status(400).json({
            erro: "Mensagem, início e fim são obrigatórios."
        });
    }

    const resultado = db.prepare(`
        INSERT INTO avisos (mensagem, inicio, fim, ativo)
        VALUES (?, ?, ?, 1)
    `).run(mensagem, inicio, fim);

    res.json({
        sucesso: true,
        id: resultado.lastInsertRowid
    });
});

app.delete("/api/avisos/:id", (req, res) => {
    const id = Number(req.params.id);

    const resultado = db.prepare(`
        DELETE FROM avisos
        WHERE id = ?
    `).run(id);

    if (resultado.changes === 0) {
        return res.status(404).json({
            erro: "Aviso não encontrado."
        });
    }

    res.json({
        sucesso: true
    });
});

app.put("/api/avisos/:id", (req, res) => {
    const id = Number(req.params.id);
    const { mensagem, inicio, fim } = req.body;

    if (!mensagem || !inicio || !fim) {
        return res.status(400).json({
            erro: "Mensagem, início e fim são obrigatórios."
        });
    }

    if (fim <= inicio) {
        return res.status(400).json({
            erro: "O horário final deve ser depois do horário inicial."
        });
    }

    const resultado = db.prepare(`
        UPDATE avisos
        SET mensagem = ?, inicio = ?, fim = ?
        WHERE id = ?
    `).run(mensagem, inicio, fim, id);

    if (resultado.changes === 0) {
        return res.status(404).json({
            erro: "Aviso não encontrado."
        });
    }

    res.json({
        sucesso: true,
        id
    });
});

app.post("/api/video", upload.single("video"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            erro: "Nenhum vídeo foi enviado."
        });
    }

    res.json({
        sucesso: true,
        video: req.file.filename
    });
});

app.post("/api/imagem", uploadImagem.single("imagem"), (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            erro: "Nenhuma imagem foi enviada."
        });
    }

    const config = {
        imagem: req.file.filename,
        duracao: Number(req.body.duracao) || 10
    };

    fs.writeFileSync(
        path.join(__dirname, "dados", "imagem.json"),
        JSON.stringify(config, null, 4)
    );

    res.json({
        sucesso: true,
        imagem: req.file.filename,
        duracao: config.duracao
    });
});

app.get("/api/imagem", (req, res) => {

    const caminhoConfig = path.join(
        __dirname,
        "dados",
        "imagem.json"
    );

    if (!fs.existsSync(caminhoConfig)) {
        return res.json({
            imagem: null,
            duracao: 10
        });
    }

    const config = JSON.parse(
        fs.readFileSync(caminhoConfig, "utf8")
    );

    res.json(config);
});

app.delete("/api/imagem", (req, res) => {

    const caminhoConfig = path.join(
        __dirname,
        "dados",
        "imagem.json"
    );

    if (!fs.existsSync(caminhoConfig)) {
        return res.json({
            sucesso: true
        });
    }

    const config = JSON.parse(
        fs.readFileSync(caminhoConfig, "utf8")
    );

    if (config.imagem) {

        const caminhoImagem = path.join(
            imagensPath,
            config.imagem
        );

        if (fs.existsSync(caminhoImagem)) {
            fs.unlinkSync(caminhoImagem);
        }
    }

    fs.writeFileSync(
        caminhoConfig,
        JSON.stringify({
            imagem: null,
            duracao: 10
        }, null, 4)
    );

    res.json({
        sucesso: true
    });
});

app.use((err, req, res, next) => {
    console.error("ERRO NO SERVIDOR:", err);

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                erro: "O vídeo é maior que o limite permitido de 500 MB."
            });
        }

        return res.status(400).json({
            erro: `Erro no upload: ${err.message}`
        });
    }

    res.status(500).json({
        erro: err.message || "Erro interno do servidor."
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesso local: http://localhost:${PORT}`);
});
