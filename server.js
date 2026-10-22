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

app.use(express.json({ limit: "1mb" }));

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
const horariosPath = path.join(dadosPath, "horarios");
const caminhoHorarios = path.join(dadosPath, "horarios.json");
const caminhoConfiguracaoHorarios = path.join(dadosPath, "horarios-config.json");

fs.mkdirSync(videosPath, { recursive: true });
fs.mkdirSync(imagensPath, { recursive: true });
fs.mkdirSync(horariosPath, { recursive: true });

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

const CONFIG_HORARIOS_PADRAO = {
    tipoEscola: "regular",
    inicioAulas: "07:00",
    duracaoAula: 50,
    inicioIntervalo: "09:30",
    duracaoIntervalo: 20
};

function lerConfiguracaoHorarios() {
    if (!fs.existsSync(caminhoConfiguracaoHorarios)) return { ...CONFIG_HORARIOS_PADRAO };
    try {
        const dados = JSON.parse(fs.readFileSync(caminhoConfiguracaoHorarios, "utf8"));
        return { ...CONFIG_HORARIOS_PADRAO, ...dados };
    } catch {
        return { ...CONFIG_HORARIOS_PADRAO };
    }
}

function lerHorarios() {
    if (!fs.existsSync(caminhoHorarios)) {
        return { atualizadoEm: null, professores: [], aulas: [], configuracao: lerConfiguracaoHorarios() };
    }
    const dados = JSON.parse(fs.readFileSync(caminhoHorarios, "utf8"));
    return {
        atualizadoEm: dados.atualizadoEm || null,
        professores: Array.isArray(dados.professores) ? dados.professores : [],
        aulas: Array.isArray(dados.aulas) ? dados.aulas : [],
        configuracao: lerConfiguracaoHorarios()
    };
}

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

app.get("/", (req, res) => res.redirect("/login"));

app.get("/horarios", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "horarios", "index.html"));
});

app.get("/api/horarios", (req, res) => {
    try {
        res.json(lerHorarios());
    } catch (error) {
        console.error("Erro ao ler horários:", error);
        res.status(500).json({ erro: "Não foi possível carregar os horários." });
    }
});
app.put("/api/horarios/configuracao", protegerApi, (req, res) => {
    const entrada = req.body || {};
    const tipoEscola = String(entrada.tipoEscola || "").trim();
    const inicioAulas = String(entrada.inicioAulas || "").trim();
    const inicioIntervalo = String(entrada.inicioIntervalo || "").trim();
    const duracaoAula = Number(entrada.duracaoAula);
    const duracaoIntervalo = Number(entrada.duracaoIntervalo);
    const horaValida = valor => /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);

    if (!["regular", "integral"].includes(tipoEscola)) {
        return res.status(400).json({ erro: "Selecione escola regular ou integral." });
    }
    if (!horaValida(inicioAulas) || !horaValida(inicioIntervalo)) {
        return res.status(400).json({ erro: "Informe horários válidos para o início das aulas e o intervalo." });
    }
    if (!Number.isInteger(duracaoAula) || duracaoAula < 30 || duracaoAula > 120) {
        return res.status(400).json({ erro: "A duração da aula deve estar entre 30 e 120 minutos." });
    }
    if (!Number.isInteger(duracaoIntervalo) || duracaoIntervalo < 5 || duracaoIntervalo > 120) {
        return res.status(400).json({ erro: "A duração do intervalo deve estar entre 5 e 120 minutos." });
    }

    const configuracao = { tipoEscola, inicioAulas, duracaoAula, inicioIntervalo, duracaoIntervalo };
    fs.writeFileSync(caminhoConfiguracaoHorarios, JSON.stringify(configuracao, null, 2), "utf8");
    res.json({ sucesso: true, configuracao });
});

app.post("/api/horarios/importar", protegerApi, (req, res) => {
    const { aulas } = req.body;
    if (!Array.isArray(aulas) || aulas.length === 0) return res.status(400).json({ erro: "Nenhuma aula válida foi identificada nos relatórios." });
    const normalizadas = aulas.map(a => ({
        dia: String(a.dia || "").trim(), inicio: String(a.inicio || "").trim(), fim: String(a.fim || "").trim(),
        turma: String(a.turma || "").trim(), componente: String(a.componente || "").trim(),
        professor: String(a.professor || "").trim(), turno: String(a.turno || "").trim(), origem: String(a.origem || "").trim()
    })).filter(a => a.dia && a.inicio && a.fim && a.turma && a.professor && a.componente);
    if (!normalizadas.length) return res.status(400).json({ erro: "Os dados extraídos não contêm aulas completas com professor, turma e componente." });
    const anterior = lerHorarios();
    const dados = { pdf: anterior.pdf, atualizadoEm: new Date().toISOString(), aulas: normalizadas, professores: normalizadas.map(a => ({ professor: a.professor, sala: "", turma: a.turma, componente: a.componente, horario: a.dia + " " + a.inicio, dia: a.dia, inicio: a.inicio, fim: a.fim, turno: a.turno })) };
    fs.writeFileSync(caminhoHorarios, JSON.stringify(dados, null, 2), "utf8");
    res.json({ sucesso: true, total: normalizadas.length, atualizadoEm: dados.atualizadoEm });
});
app.put("/api/horarios", protegerApi, (req, res) => {
    const { professores, aulas } = req.body;
    if (!Array.isArray(professores)) {
        return res.status(400).json({ erro: "A lista de horários é inválida." });
    }

    const normalizados = professores.map((item) => ({
        professor: String(item.professor || "").trim(),
        sala: String(item.sala || "").trim(),
        turma: String(item.turma || "").trim(),
        componente: String(item.componente || "").trim(),
        horario: String(item.horario || "").trim(),
        dia: String(item.dia || "").trim(),
        inicio: String(item.inicio || "").trim(),
        fim: String(item.fim || "").trim(),
        turno: String(item.turno || "").trim(),
        periodo: String(item.periodo || "").trim(),
        origem: String(item.origem || "").trim()
    }));

    if (normalizados.some(item => !item.professor || !item.turma || !item.componente)) {
        return res.status(400).json({ erro: "Preencha professor, turma e componente em todas as linhas." });
    }

    const anterior = lerHorarios();
    const aulasRecebidas = Array.isArray(aulas) ? aulas : normalizados;
    const aulasNormalizadas = aulasRecebidas.map((item) => {
        let dia = String(item.dia || "").trim();
        let inicio = String(item.inicio || "").trim();
        let fim = String(item.fim || "").trim();
        const horario = String(item.horario || "").trim();
        if ((!dia || !inicio || !fim) && horario) {
            const m = horario.match(/^(segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo)\s+(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})$/i);
            if (m) { dia = dia || m[1]; inicio = inicio || m[2]; fim = fim || m[3]; }
        }
        return {
            dia, inicio, fim,
            turma: String(item.turma || "").trim(),
            componente: String(item.componente || "").trim(),
            professor: String(item.professor || "").trim(),
            turno: String(item.turno || "").trim(),
            horario: String(item.horario || "").trim(),
            periodo: String(item.periodo || "").trim(),
            origem: String(item.origem || "").trim()
        };
    }).filter(item => item.professor && item.turma && item.componente);

    const dados = {
        atualizadoEm: new Date().toISOString(),
        professores: normalizados,
        aulas: aulasNormalizadas.length ? aulasNormalizadas : anterior.aulas
    };

    fs.writeFileSync(caminhoHorarios, JSON.stringify(dados, null, 2), "utf8");
    res.json({ sucesso: true, total: normalizados.length, totalAulas: dados.aulas.length, atualizadoEm: dados.atualizadoEm });
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
