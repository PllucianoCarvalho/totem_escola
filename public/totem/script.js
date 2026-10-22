const video = document.getElementById("video");
const imagem = document.getElementById("imagem");
const aviso = document.getElementById("aviso");
const paginaHorarios = document.getElementById("paginaHorarios");

// Alternância automática: 90 s de vídeos/fotos e 30 s de horários.
const TEMPO_MIDIA_MS = 90 * 1000;
const TEMPO_HORARIOS_MS = 30 * 1000;
let exibindoHorarios = false;

let videoAtual = null;
let avisosAtuais = [];
let imagensAtuais = [];
let transicaoEmAndamento = false;

async function verificarVideo() {
    try {
        const response = await fetch("/api/video");
        if (!response.ok) throw new Error("Erro ao consultar o vídeo.");

        const data = await response.json();
        if (!data.video) {
            console.log("Nenhum vídeo configurado.");
            return;
        }

        const novoVideo = `/videos/${encodeURIComponent(data.video)}`;
        if (videoAtual === novoVideo) return;

        videoAtual = novoVideo;
        video.src = novoVideo;
        video.load();

        imagem.style.display = "none";
        video.style.display = "block";

        try {
            await video.play();
        } catch (erro) {
            console.log("Autoplay aguardando interação.");
        }
    } catch (erro) {
        console.error("Erro ao consultar vídeo:", erro);
    }
}

async function verificarImagem() {
    try {
        const response = await fetch("/api/imagem");
        if (!response.ok) throw new Error("Erro ao consultar imagens.");

        const data = await response.json();
        imagensAtuais = Array.isArray(data.imagens) ? data.imagens : [];

        console.log("Imagens disponíveis:", imagensAtuais);
    } catch (erro) {
        console.error("Erro ao consultar imagens:", erro);
    }
}

video.addEventListener("ended", async () => {
    if (transicaoEmAndamento) return;

    if (imagensAtuais.length === 0) {
        video.currentTime = 0;
        try {
            await video.play();
        } catch (erro) {
            console.log("Autoplay aguardando interação.");
        }
        return;
    }

    transicaoEmAndamento = true;

    try {
        video.style.display = "none";
        imagem.style.display = "block";

        for (let i = 0; i < imagensAtuais.length; i++) {
            const imagemAtual = imagensAtuais[i];

            console.log(
                `Exibindo imagem ${i + 1}/${imagensAtuais.length}: ${imagemAtual.imagem} por ${imagemAtual.duracao}s`
            );

            imagem.src = `/imagens/${encodeURIComponent(imagemAtual.imagem)}`;

            await new Promise(resolve => {
                setTimeout(resolve, (Number(imagemAtual.duracao) || 10) * 1000);
            });
        }

        imagem.style.display = "none";
        video.style.display = "block";
        video.currentTime = 0;

        try {
            await video.play();
        } catch (erro) {
            console.log("Autoplay aguardando interação.");
        }
    } finally {
        transicaoEmAndamento = false;
    }
});

async function verificarAvisos() {
    try {
        const response = await fetch("/api/avisos");
        if (!response.ok) throw new Error("Erro ao consultar avisos.");

        const data = await response.json();
        avisosAtuais = data.avisos || [];
        atualizarAviso();
    } catch (erro) {
        console.error("Erro ao consultar avisos:", erro);
    }
}

function atualizarAviso() {
    const agora = new Date();
    const avisoAtivo = avisosAtuais.find(aviso => {
        const inicio = new Date(aviso.inicio);
        const fim = new Date(aviso.fim);
        return aviso.ativo == 1 && agora >= inicio && agora <= fim;
    });

    if (!avisoAtivo) {
        aviso.textContent = "";
        aviso.style.display = "none";
        return;
    }

    aviso.textContent = avisoAtivo.mensagem;
    aviso.style.display = "block";
}

verificarVideo();
verificarImagem();
verificarAvisos();

setInterval(verificarVideo, 10 * 1000);
setInterval(verificarImagem, 10 * 1000);
setInterval(verificarAvisos, 10 * 1000);


function programarAlternancia() {
    const duracao = exibindoHorarios ? TEMPO_HORARIOS_MS : TEMPO_MIDIA_MS;
    window.setTimeout(async () => {
        exibindoHorarios = !exibindoHorarios;
        paginaHorarios.style.display = exibindoHorarios ? "block" : "none";

        if (exibindoHorarios) {
            video.pause();
        } else if (video.style.display !== "none" && video.src) {
            try {
                await video.play();
            } catch (erro) {
                console.log("Reprodução aguardando autoplay permitido pelo navegador.");
            }
        }

        programarAlternancia();
    }, duracao);
}

// Começa exibindo vídeos/fotos; depois alterna automaticamente para a grade.
paginaHorarios.style.display = "none";
programarAlternancia();
