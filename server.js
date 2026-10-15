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
    cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login", "index.html"));
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === USUARIO_ADMIN && senha === SENHA_ADMIN) {
        req.session.autenticado = true;
        return res.json({ sucesso: true });
    }

    res.status(401).json({ erro: "Usuário ou senha incorretos." });
});

function protegerAmostradinho(req, res, next) {
    if (!req.session.autenticado) return res.redirect("/login");
    next();
}

function protegerApi(req, res, next) {
    if (!req.session.autenticado) {
        return res.status(401).json({ erro: "Faça login para realizar esta operação." });
    }
    next();
}

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

const dadosPath = path.join(__dirname, "dados");
const videosPath = path.join(dadosPath, "videos");
const imagensPath = path.join(dadosPath, "imagens");
const caminhoConfigImagens = path.join(dadosPath, "imagem.json");

fs.mkdirSync(videosPath, { recursive: true });
fs.mkdirSync(imagensPath, { recursive: true });

const storageVideo = multer.diskStorage({
    destination: (req, file, cb) => cb(null, videosPath),
    filename: (req, file, cb) => {
        const nome = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${nome}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storageVideo,
    limits: { fileSize: 500 * 1024 * 1024 }
});

const storageImagem = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imagensPath),
    filename: (req, file, cb) => {
        const nome = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${nome}${path.extname(file.originalname)}`);
    }
});

const uploadImagem = multer({
    storage: storageImagem,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Apenas imagens são permitidas."));
        }
        cb(null, true);
    }
});

app.use("/amostradinho", protegerAmostradinho);
app.use(express.static(path.join(__dirname, "public")));
app.use("/videos", express.static(videosPath));
app.use("/imagens", express.static(imagensPath));

app.get("/totem", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "totem", "index.html"));
});

app.get("/amostradinho", protegerAmostradinho, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "amostradinho", "index.html"));
});

app.get("/api/status", (req, res) => {
    const config = db.prepare("SELECT * FROM configuracoes WHERE id = 1").get();
    res.json({ servidor: "online", banco: "SQLite conectado", configuracao: config });
});

app.get("/api/videos", (req, res) => {
    const arquivos = fs.readdirSync(videosPath)
        .filter(arquivo => arquivo.toLowerCase().endsWith(".mp4"));
    const config = db.prepare("SELECT video FROM configuracoes WHERE id = 1").get();
    res.json({ videos: arquivos, ativo: config.video });
});

app.delete("/api/videos/:video", protegerApi, (req, res) => {
    const video = req.params.video;
    const config = db.prepare("SELECT video FROM configuracoes WHERE id = 1").get();

    if (config.video === video) {
        return res.status(400).json({ erro: "Não é possível excluir o vídeo que está ativo." });
    }

    const caminhoVideo = path.join(videosPath, path.basename(video));
    if (!fs.existsSync(caminhoVideo)) {
        return res.status(404).json({ erro: "Vídeo não encontrado." });
    }

    fs.unlinkSync(caminhoVideo);
    res.json({ sucesso: true, video });
});

app.post("/api/video", protegerApi, upload.single("video"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ erro: "Nenhum vídeo foi enviado." });
    }

    if (path.extname(req.file.originalname).toLowerCase() !== ".mp4") {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ erro: "Envie um arquivo MP4." });
    }

    res.json({ sucesso: true, video: req.file.filename });
});

app.post("/api/video/ativar", protegerApi, (req, res) => {
    const { video } = req.body;
    if (!video) return res.status(400).json({ erro: "Nenhum vídeo informado." });

    const caminhoVideo = path.join(videosPath, path.basename(video));
    if (!fs.existsSync(caminhoVideo)) {
        return res.status(404).json({ erro: "Vídeo não encontrado." });
    }

    db.prepare("UPDATE configuracoes SET video = ? WHERE id = 1").run(video);
    res.json({ sucesso: true, video });
});

app.get("/api/video", (req, res) => {
    const config = db.prepare("SELECT video FROM configuracoes WHERE id = 1").get();
    res.json({ video: config.video });
});

app.get("/api/avisos", (req, res) => {
    const avisos = db.prepare("SELECT * FROM avisos ORDER BY inicio ASC").all();
    res.json({ avisos });
});

app.post("/api/avisos", protegerApi, (req, res) => {
    const { mensagem, inicio, fim } = req.body;
    if (!mensagem || !inicio || !fim) {
        return res.status(400).json({ erro: "Mensagem, início e fim são obrigatórios." });
    }
    if (fim <= inicio) {
        return res.status(400).json({ erro: "O horário final deve ser depois do horário inicial." });
    }

    const resultado = db.prepare(
        "INSERT INTO avisos (mensagem, inicio, fim, ativo) VALUES (?, ?, ?, 1)"
    ).run(mensagem, inicio, fim);

    res.json({ sucesso: true, id: resultado.lastInsertRowid });
});

app.put("/api/avisos/:id", protegerApi, (req, res) => {
    const id = Number(req.params.id);
    const { mensagem, inicio, fim } = req.body;
    if (!mensagem || !inicio || !fim) {
        return res.status(400).json({ erro: "Mensagem, início e fim são obrigatórios." });
    }
    if (fim <= inicio) {
        return res.status(400).json({ erro: "O horário final deve ser depois do horário inicial." });
    }

    const resultado = db.prepare(
        "UPDATE avisos SET mensagem = ?, inicio = ?, fim = ? WHERE id = ?"
    ).run(mensagem, inicio, fim, id);

    if (resultado.changes === 0) {
        return res.status(404).json({ erro: "Aviso não encontrado." });
    }
    res.json({ sucesso: true, id });
});

app.delete("/api/avisos/:id", protegerApi, (req, res) => {
    const id = Number(req.params.id);
    const resultado = db.prepare("DELETE FROM avisos WHERE id = ?").run(id);
    if (resultado.changes === 0) return res.status(404).json({ erro: "Aviso não encontrado." });
    res.json({ sucesso: true });
});

function lerConfigImagens() {
    if (!fs.existsSync(caminhoConfigImagens)) return { imagens: [] };

    const config = JSON.parse(fs.readFileSync(caminhoConfigImagens, "utf8"));
    if (Array.isArray(config.imagens)) return config;

    // Migra o formato antigo de uma única imagem para a nova lista.
    if (config.imagem) {
        const migrada = {
            imagens: [{
                id: Date.now(),
                imagem: config.imagem,
                duracao: Number(config.duracao) || 10
            }]
        };
        fs.writeFileSync(caminhoConfigImagens, JSON.stringify(migrada, null, 4));
        return migrada;
    }

    return { imagens: [] };
}

app.get("/api/imagem", (req, res) => {
    try {
        res.json(lerConfigImagens());
    } catch (error) {
        console.error("Erro ao ler configuração de imagens:", error);
        res.status(500).json({ erro: "Erro ao carregar imagens." });
    }
});

app.post("/api/imagem", protegerApi, uploadImagem.single("imagem"), (req, res) => {
    if (!req.file) return res.status(400).json({ erro: "Nenhuma imagem foi enviada." });

    const duracao = Number(req.body.duracao);
    if (!Number.isFinite(duracao) || duracao < 1) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ erro: "Informe uma duração válida." });
    }

    try {
        const config = lerConfigImagens();
        const novaImagem = {
            id: Date.now(),
            imagem: req.file.filename,
            duracao
        };

        config.imagens.push(novaImagem);
        fs.writeFileSync(caminhoConfigImagens, JSON.stringify(config, null, 4));

        res.json({ sucesso: true, imagem: novaImagem });
    } catch (error) {
        console.error("Erro ao salvar imagem:", error);
        res.status(500).json({ erro: "Erro ao salvar imagem." });
    }
});

app.delete("/api/imagem/:id", protegerApi, (req, res) => {
    const id = Number(req.params.id);

    try {
        const config = lerConfigImagens();
        const indice = config.imagens.findIndex(item => item.id === id);
        if (indice === -1) {
            return res.status(404).json({ erro: "Imagem não encontrada." });
        }

        const [removida] = config.imagens.splice(indice, 1);
        const nomeSeguro = path.basename(removida.imagem);
        const caminhoImagem = path.join(imagensPath, nomeSeguro);

        fs.writeFileSync(caminhoConfigImagens, JSON.stringify(config, null, 4));

        if (fs.existsSync(caminhoImagem)) fs.unlinkSync(caminhoImagem);
        res.json({ sucesso: true });
    } catch (error) {
        console.error("Erro ao excluir imagem:", error);
        res.status(500).json({ erro: "Erro ao excluir imagem." });
    }
});

app.use((err, req, res, next) => {
    console.error("ERRO NO SERVIDOR:", err);
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            const mensagem = err.field === "imagem"
                ? "A imagem excede o limite permitido de 10 MB."
                : "O vídeo é maior que o limite permitido de 500 MB.";
            return res.status(413).json({ erro: mensagem });
        }
        return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
    }
    res.status(500).json({ erro: err.message || "Erro interno do servidor." });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesso local: http://localhost:${PORT}`);
});
