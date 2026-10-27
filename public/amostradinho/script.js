document.querySelectorAll(".menu-opcao").forEach(botao => {
    botao.addEventListener("click", () => {
        const jaSelecionado = botao.classList.contains("ativa");

        document.querySelectorAll(".menu-opcao").forEach(opcao => {
            opcao.classList.remove("ativa");
            opcao.setAttribute("aria-pressed", "false");
        });

        document.querySelectorAll("[data-painel]").forEach(painel => {
            painel.hidden = true;
            painel.classList.remove("selecionada");
        });

        if (jaSelecionado) return;

        botao.classList.add("ativa");
        botao.setAttribute("aria-pressed", "true");

        const painelAtivo = document.querySelector(`[data-painel="${botao.dataset.secao}"]`);
        if (painelAtivo) {
            painelAtivo.hidden = false;
            painelAtivo.classList.add("selecionada");
        }
    });
});

const formVideo = document.getElementById("videoForm");
const inputVideo = document.getElementById("videoInput");
const statusVideo = document.getElementById("statusVideo");
const listaVideos = document.getElementById("listaVideos");

const formAviso = document.getElementById("avisoForm");
const mensagemInput = document.getElementById("mensagem");
const inicioInput = document.getElementById("inicio");
const fimInput = document.getElementById("fim");
const statusAviso = document.getElementById("statusAviso");
const listaAvisos = document.getElementById("listaAvisos");

let avisoEditando = null;

async function carregarVideos() {
    try {
        const response = await fetch("/api/videos");
        if (!response.ok) throw new Error("Erro ao carregar vídeos.");

        const data = await response.json();
        listaVideos.innerHTML = "";

        if (data.videos.length === 0) {
            listaVideos.textContent = "Nenhum vídeo cadastrado.";
            return;
        }

        data.videos.forEach(video => {
            const item = document.createElement("div");
            item.className = "video-item";

            const nome = document.createElement("span");
            nome.textContent = video;
            item.appendChild(nome);

            const botoes = document.createElement("div");
            botoes.className = "botoes-video";

            if (video === data.ativo) {
                const ativo = document.createElement("strong");
                ativo.textContent = "ATIVO";
                ativo.className = "ativo";
                item.appendChild(ativo);

                const botaoDesativar = document.createElement("button");
                botaoDesativar.textContent = "Desativar";
                botaoDesativar.addEventListener("click", desativarVideo);
                botoes.appendChild(botaoDesativar);
            } else {
                const botaoAtivar = document.createElement("button");
                botaoAtivar.textContent = "Ativar";
                botaoAtivar.addEventListener("click", () => ativarVideo(video));
                botoes.appendChild(botaoAtivar);
            }

            const botaoExcluir = document.createElement("button");
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.addEventListener("click", () => excluirVideo(video));
            botoes.appendChild(botaoExcluir);
            item.appendChild(botoes);

            listaVideos.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        listaVideos.textContent = "Erro ao carregar os vídeos.";
    }
}

async function ativarVideo(video) {
    statusVideo.textContent = "Ativando vídeo...";
    try {
        const response = await fetch("/api/video/ativar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ video })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao ativar vídeo.");

        statusVideo.textContent = `Vídeo ativo: ${data.video}`;
        await carregarVideos();
    } catch (error) {
        console.error(error);
        statusVideo.textContent = "Erro: " + error.message;
    }
}

formVideo.addEventListener("submit", async event => {
    event.preventDefault();
    const arquivo = inputVideo.files[0];
    if (!arquivo) {
        statusVideo.textContent = "Selecione um vídeo.";
        return;
    }

    statusVideo.textContent = "Enviando vídeo...";
    const formData = new FormData();
    formData.append("video", arquivo);

    try {
        const response = await fetch("/api/video", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao enviar vídeo.");

        statusVideo.textContent = "Vídeo enviado com sucesso!";
        inputVideo.value = "";
        await carregarVideos();
    } catch (error) {
        console.error(error);
        statusVideo.textContent = "Erro ao enviar vídeo: " + error.message;
    }
});

async function carregarAvisos() {
    try {
        const response = await fetch("/api/avisos");
        if (!response.ok) throw new Error("Erro ao carregar avisos.");

        const data = await response.json();
        listaAvisos.innerHTML = "";

        if (data.avisos.length === 0) {
            listaAvisos.textContent = "Nenhum aviso cadastrado.";
            return;
        }

        data.avisos.forEach(aviso => {
            const item = document.createElement("div");
            item.className = "aviso-item";

            const texto = document.createElement("div");
            const forte = document.createElement("strong");
            forte.textContent = aviso.mensagem;
            const datas = document.createElement("small");
            datas.textContent = `${formatarData(aviso.inicio)} até ${formatarData(aviso.fim)}`;
            texto.appendChild(forte);
            texto.appendChild(document.createElement("br"));
            texto.appendChild(datas);

            const botoes = document.createElement("div");
            botoes.className = "botoes-aviso";

            const botaoEditar = document.createElement("button");
            botaoEditar.textContent = "Editar";
            botaoEditar.addEventListener("click", () => editarAviso(aviso));

            const botaoExcluir = document.createElement("button");
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.addEventListener("click", () => excluirAviso(aviso.id));

            botoes.appendChild(botaoEditar);
            botoes.appendChild(botaoExcluir);
            item.appendChild(texto);
            item.appendChild(botoes);
            listaAvisos.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        listaAvisos.textContent = "Erro ao carregar avisos.";
    }
}

formAviso.addEventListener("submit", async event => {
    event.preventDefault();

    const mensagem = mensagemInput.value.trim();
    const inicio = inicioInput.value;
    const fim = fimInput.value;

    if (!mensagem || !inicio || !fim) {
        statusAviso.textContent = "Preencha todos os campos.";
        return;
    }
    if (fim <= inicio) {
        statusAviso.textContent = "O horário final deve ser depois do horário inicial.";
        return;
    }

    statusAviso.textContent = "Publicando aviso...";
    try {
        const url = avisoEditando ? `/api/avisos/${avisoEditando}` : "/api/avisos";
        const metodo = avisoEditando ? "PUT" : "POST";

        const response = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mensagem, inicio, fim })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao publicar aviso.");

        statusAviso.textContent = "Aviso publicado com sucesso!";
        mensagemInput.value = "";
        inicioInput.value = "";
        fimInput.value = "";
        avisoEditando = null;
        await carregarAvisos();
    } catch (error) {
        console.error(error);
        statusAviso.textContent = "Erro: " + error.message;
    }
});

async function excluirAviso(id) {
    if (!confirm("Excluir este aviso?")) return;

    try {
        const response = await fetch(`/api/avisos/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao excluir aviso.");
        await carregarAvisos();
    } catch (error) {
        console.error(error);
        statusAviso.textContent = "Erro: " + error.message;
    }
}

function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

async function desativarVideo() {
    if (!confirm("Desativar o vídeo atual? O arquivo continuará salvo e poderá ser ativado novamente.")) return;

    statusVideo.textContent = "Desativando vídeo...";
    try {
        const response = await fetch("/api/video/desativar", { method: "POST" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao desativar vídeo.");

        statusVideo.textContent = "Vídeo desativado. O totem exibirá horários e imagens.";
        await carregarVideos();
    } catch (error) {
        console.error(error);
        statusVideo.textContent = "Erro: " + error.message;
    }
}

async function excluirVideo(video) {
    if (!confirm(`Excluir o vídeo "${video}"?`)) return;

    try {
        const response = await fetch(`/api/videos/${encodeURIComponent(video)}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao excluir vídeo.");

        statusVideo.textContent = "Vídeo excluído com sucesso.";
        await carregarVideos();
    } catch (error) {
        console.error(error);
        statusVideo.textContent = "Erro: " + error.message;
    }
}

function editarAviso(aviso) {
    avisoEditando = aviso.id;
    mensagemInput.value = aviso.mensagem;
    inicioInput.value = aviso.inicio.slice(0, 16);
    fimInput.value = aviso.fim.slice(0, 16);

    statusAviso.textContent = "Editando aviso...";
    window.scrollTo({ top: formAviso.offsetTop, behavior: "smooth" });
}

const imagemForm = document.getElementById("imagemForm");
const imagemInput = document.getElementById("imagemInput");
const duracaoImagem = document.getElementById("duracaoImagem");
const statusImagem = document.getElementById("statusImagem");

imagemForm.addEventListener("submit", async event => {
    event.preventDefault();

    const arquivo = imagemInput.files[0];
    const duracao = Number(duracaoImagem.value);

    if (!arquivo) {
        statusImagem.textContent = "Selecione uma imagem.";
        return;
    }
    if (!duracao || duracao < 1) {
        statusImagem.textContent = "Informe uma duração válida.";
        return;
    }

    const dados = new FormData();
    dados.append("imagem", arquivo);
    dados.append("duracao", duracao);
    statusImagem.textContent = "Enviando imagem...";

    try {
        const response = await fetch("/api/imagem", { method: "POST", body: dados });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.erro || "Erro ao enviar imagem.");

        statusImagem.textContent = `Imagem publicada por ${resultado.imagem.duracao} segundos.`;
        imagemForm.reset();
        duracaoImagem.value = 10;
        await carregarImagens();
    } catch (error) {
        console.error(error);
        statusImagem.textContent = `Erro: ${error.message}`;
    }
});

async function carregarImagens() {
    const lista = document.getElementById("listaImagem");

    try {
        const response = await fetch("/api/imagem");
        if (!response.ok) throw new Error("Erro ao consultar imagens.");

        const data = await response.json();
        const imagens = Array.isArray(data.imagens) ? data.imagens : [];

        if (imagens.length === 0) {
            lista.innerHTML = "<p>Nenhuma imagem publicada.</p>";
            return;
        }

        lista.innerHTML = "";
        imagens.forEach(imagem => {
            const item = document.createElement("div");
            item.className = "item-imagem";

            const miniatura = document.createElement("img");
            miniatura.src = `/imagens/${encodeURIComponent(imagem.imagem)}`;
            miniatura.alt = `Prévia de ${imagem.imagem}`;

            const detalhes = document.createElement("div");
            const nome = document.createElement("p");
            const forte = document.createElement("strong");
            forte.textContent = imagem.imagem;
            nome.appendChild(forte);

            const duracao = document.createElement("p");
            duracao.textContent = `Duração: ${imagem.duracao} segundos`;
            detalhes.appendChild(nome);
            detalhes.appendChild(duracao);

            const botaoExcluir = document.createElement("button");
            botaoExcluir.type = "button";
            botaoExcluir.textContent = "Excluir imagem";
            botaoExcluir.addEventListener("click", () => excluirImagem(imagem.id));

            item.appendChild(miniatura);
            item.appendChild(detalhes);
            item.appendChild(botaoExcluir);
            lista.appendChild(item);
        });
    } catch (error) {
        console.error(error);
        lista.innerHTML = "<p>Erro ao carregar imagens.</p>";
    }
}

async function excluirImagem(id) {
    if (!confirm("Deseja realmente excluir esta imagem?")) return;

    try {
        const response = await fetch(`/api/imagem/${id}`, { method: "DELETE" });
        const resultado = await response.json();
        if (!response.ok) throw new Error(resultado.erro || "Erro ao excluir imagem.");

        await carregarImagens();
    } catch (error) {
        console.error(error);
        alert(`Erro: ${error.message}`);
    }
}

carregarImagens();
carregarVideos();
carregarAvisos();
