const video = document.getElementById("video");
const imagem = document.getElementById("imagem");
const aviso = document.getElementById("aviso");

let videoAtual = null;
let avisosAtuais = [];

let configuracaoImagem = {
    imagem: null,
    duracao: 10
};


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

        if (!response.ok) {
            throw new Error("Erro ao consultar imagem.");
        }

        const data = await response.json();

        configuracaoImagem = {
            imagem: data.imagem || null,
            duracao: Number(data.duracao) || 10
        };

        console.log("Configuração da imagem:", configuracaoImagem);

    } catch (erro) {

        console.error("Erro ao consultar imagem:", erro);
    }
}


video.addEventListener("ended", async () => {

    if (!configuracaoImagem.imagem) {

        video.currentTime = 0;
        video.play();

        return;
    }

    console.log("Vídeo terminou. Exibindo imagem.");

    video.style.display = "none";
    imagem.style.display = "block";

    imagem.src =
        `/imagens/${encodeURIComponent(configuracaoImagem.imagem)}`;

    await new Promise(resolve => {
        setTimeout(resolve, configuracaoImagem.duracao * 1000);
    });

    console.log("Tempo da imagem terminou. Voltando para o vídeo.");

    imagem.style.display = "none";
    video.style.display = "block";

    video.currentTime = 0;

    try {
        await video.play();
    } catch (erro) {
        console.log("Autoplay aguardando interação.");
    }

});


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
verificarImagem();
verificarAvisos();

setInterval(verificarVideo, 10 * 1000);
setInterval(verificarImagem, 10 * 1000);
setInterval(verificarAvisos, 10 * 1000);
