const video = document.getElementById("video");
const imagem = document.getElementById("imagem");
const aviso = document.getElementById("aviso");
const paginaHorarios = document.getElementById("paginaHorarios");

const TEMPO_HORARIOS_MS = 30 * 1000;
let videoAtual = null;
let avisosAtuais = [];
let imagensAtuais = [];
let transicaoEmAndamento = false;
let cicloSemVideoId = 0;
let modoSemVideoAtivo = false;

const esperar = tempo => new Promise(resolve => setTimeout(resolve, tempo));

function mostrarSomente(elemento) {
    video.style.display = elemento === video ? "block" : "none";
    imagem.style.display = elemento === imagem ? "block" : "none";
    paginaHorarios.style.display = elemento === paginaHorarios ? "block" : "none";
}

async function exibirHorariosEImagens(aindaValido) {
    mostrarSomente(paginaHorarios);
    await esperar(TEMPO_HORARIOS_MS);
    if (!aindaValido()) return;

    for (const item of imagensAtuais) {
        if (!item.imagem) continue;
        imagem.src = `/imagens/${encodeURIComponent(item.imagem)}`;
        mostrarSomente(imagem);
        await esperar((Number(item.duracao) || 10) * 1000);
        if (!aindaValido()) return;
    }
}

async function iniciarModoSemVideo() {
    if (modoSemVideoAtivo) return;

    modoSemVideoAtivo = true;
    const cicloId = ++cicloSemVideoId;

    while (modoSemVideoAtivo && cicloId === cicloSemVideoId && !videoAtual) {
        try {
            await exibirHorariosEImagens(() => modoSemVideoAtivo && cicloId === cicloSemVideoId && !videoAtual);
        } catch (erro) {
            console.error("Erro no ciclo sem vídeo:", erro);
            await esperar(1000);
        }
    }
}

function encerrarModoSemVideo() {
    modoSemVideoAtivo = false;
    cicloSemVideoId++;
}

async function verificarVideo() {
    try {
        const response = await fetch("/api/video", { cache: "no-store" });
        if (!response.ok) throw new Error("Erro ao consultar o vídeo.");

        const data = await response.json();

        if (!data.video) {
            if (videoAtual) {
                video.pause();
                video.removeAttribute("src");
                video.load();
                videoAtual = null;
            }

            if (!transicaoEmAndamento) iniciarModoSemVideo();
            return;
        }

        const novoVideo = `/videos/${encodeURIComponent(data.video)}`;
        if (videoAtual === novoVideo) return;

        encerrarModoSemVideo();
        videoAtual = novoVideo;
        video.src = novoVideo;
        video.load();

        try {
            await video.play();
            mostrarSomente(video);
        } catch (erro) {
            console.log("Autoplay aguardando interação.");
        }
    } catch (erro) {
        console.error("Erro ao consultar vídeo:", erro);
        if (!videoAtual && !transicaoEmAndamento) iniciarModoSemVideo();
    }
}

async function verificarImagem() {
    try {
        const response = await fetch("/api/imagem", { cache: "no-store" });
        if (!response.ok) throw new Error("Erro ao consultar imagens.");

        const data = await response.json();
        imagensAtuais = Array.isArray(data.imagens) ? data.imagens : [];
    } catch (erro) {
        console.error("Erro ao consultar imagens:", erro);
    }
}

video.addEventListener("ended", async () => {
    if (transicaoEmAndamento || !videoAtual) return;
    transicaoEmAndamento = true;

    try {
        await exibirHorariosEImagens(() => Boolean(videoAtual));

        if (videoAtual) {
            mostrarSomente(video);
            video.currentTime = 0;
            await video.play();
        } else {
            iniciarModoSemVideo();
        }
    } catch (erro) {
        console.error("Erro durante a transição do Totem:", erro);
        if (videoAtual) {
            mostrarSomente(video);
            try {
                video.currentTime = 0;
                await video.play();
            } catch (erroReproducao) {
                console.error("Não foi possível retomar o vídeo:", erroReproducao);
            }
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

verificarImagem();
verificarAvisos();
verificarVideo();

setInterval(verificarVideo, 10 * 1000);
setInterval(verificarImagem, 10 * 1000);
setInterval(verificarAvisos, 10 * 1000);
