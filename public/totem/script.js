const video = document.getElementById("video");
const aviso = document.getElementById("aviso");

let videoAtual = null;
let avisosAtuais = [];


async function verificarVideo() {

    try {

        const response = await fetch("/api/video");

        if (!response.ok) {
            throw new Error("Erro ao consultar o vídeo.");
        }

        const data = await response.json();

        if (!data.video) {
            console.log("Nenhum vídeo configurado.");
            return;
        }

        const novoVideo = `/videos/${encodeURIComponent(data.video)}`;

        if (videoAtual === novoVideo) {
            return;
        }

        console.log("Novo vídeo detectado:", data.video);

        videoAtual = novoVideo;

        video.src = novoVideo;
        video.load();

        try {
            await video.play();
        } catch (erro) {
            console.log("Autoplay aguardando interação.");
        }

    } catch (erro) {

        console.error("Erro ao consultar vídeo:", erro);
    }
}


async function verificarAvisos() {

    try {

        const response = await fetch("/api/avisos");

        if (!response.ok) {
            throw new Error("Erro ao consultar avisos.");
        }

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

        return (
            aviso.ativo == 1 &&
            agora >= inicio &&
            agora <= fim
        );

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
verificarAvisos();

setInterval(verificarVideo, 1 * 60 * 1000);
setInterval(verificarAvisos, 10 * 1000);