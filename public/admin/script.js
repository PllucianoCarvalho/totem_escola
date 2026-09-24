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

        if (!response.ok) {
            throw new Error("Erro ao carregar vídeos.");
        }

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

            if (video === data.ativo) {

                const ativo = document.createElement("strong");

                ativo.textContent = "ATIVO";
                ativo.className = "ativo";

                item.appendChild(ativo);

            } else {

                const botoes = document.createElement("div");
                botoes.className = "botoes-video";

                const botaoAtivar = document.createElement("button");

                botaoAtivar.textContent = "Ativar";

                botaoAtivar.addEventListener("click", () => {
                    ativarVideo(video);
                });

                const botaoExcluir = document.createElement("button");

                botaoExcluir.textContent = "Excluir";

                botaoExcluir.addEventListener("click", () => {
                    excluirVideo(video);
                });

                botoes.appendChild(botaoAtivar);
                botoes.appendChild(botaoExcluir);

                item.appendChild(botoes);
            }

            listaVideos.appendChild(item);
        });

    } catch (error) {

        console.error(error);

        listaVideos.textContent =
            "Erro ao carregar os vídeos.";
    }
}


async function ativarVideo(video) {

    statusVideo.textContent = "Ativando vídeo...";

    try {

        const response = await fetch("/api/video/ativar", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                video: video
            })

        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.erro || "Erro ao ativar vídeo."
            );
        }

        statusVideo.textContent =
            `Vídeo ativo: ${data.video}`;

        await carregarVideos();

    } catch (error) {

        console.error(error);

        statusVideo.textContent =
            "Erro: " + error.message;
    }
}


formVideo.addEventListener("submit", async function (event) {

    event.preventDefault();

    const arquivo = inputVideo.files[0];

    if (!arquivo) {

        statusVideo.textContent =
            "Selecione um vídeo.";

        return;
    }

    statusVideo.textContent =
        "Enviando vídeo...";

    const formData = new FormData();

    formData.append("video", arquivo);

    try {

        const response = await fetch("/api/video", {

            method: "POST",

            body: formData
        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.erro || "Erro ao enviar vídeo."
            );
        }

        statusVideo.textContent =
            "Vídeo enviado com sucesso!";

        inputVideo.value = "";

        await carregarVideos();

    } catch (error) {

        console.error(error);

        statusVideo.textContent =
            "Erro ao enviar vídeo: " +
            error.message;
    }
});


async function carregarAvisos() {
    try {
        const response = await fetch("/api/avisos");

        if (!response.ok) {
            throw new Error("Erro ao carregar avisos.");
        }

        const data = await response.json();

        listaAvisos.innerHTML = "";

        if (data.avisos.length === 0) {
            listaAvisos.textContent = "Nenhum aviso cadastrado.";
            return;
        }

        data.avisos.forEach((aviso) => {
            const item = document.createElement("div");
            item.className = "aviso-item";

            const texto = document.createElement("div");
            texto.innerHTML = `
                <strong>${aviso.mensagem}</strong>
                <br>
                <small>
                    ${formatarData(aviso.inicio)}
                    até
                    ${formatarData(aviso.fim)}
                </small>
            `;

            const botoes = document.createElement("div");
            botoes.className = "botoes-aviso";

            const botaoEditar = document.createElement("button");
            botaoEditar.textContent = "Editar";
            botaoEditar.addEventListener("click", () => {
                editarAviso(aviso);
            });

            const botaoExcluir = document.createElement("button");
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.addEventListener("click", () => {
                excluirAviso(aviso.id);
            });

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


formAviso.addEventListener("submit", async function (event) {
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
        const url = avisoEditando
            ? `/api/avisos/${avisoEditando}`
            : "/api/avisos";

        const metodo = avisoEditando ? "PUT" : "POST";

        const response = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensagem,
                inicio,
                fim
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.erro || "Erro ao publicar aviso.");
        }

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

    if (!confirm("Excluir este aviso?")) {
        return;
    }

    try {

        const response = await fetch(
            `/api/avisos/${id}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.erro || "Erro ao excluir aviso."
            );
        }

        await carregarAvisos();

    } catch (error) {

        console.error(error);

        statusAviso.textContent =
            "Erro: " + error.message;
    }
}


function formatarData(data) {

    return new Date(data).toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}

async function excluirVideo(video) {

    if (!confirm(`Excluir o vídeo "${video}"?`)) {
        return;
    }

    try {

        const response = await fetch(
            `/api/videos/${encodeURIComponent(video)}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.erro || "Erro ao excluir vídeo."
            );
        }

        statusVideo.textContent =
            "Vídeo excluído com sucesso.";

        await carregarVideos();

    } catch (error) {

        console.error(error);

        statusVideo.textContent =
            "Erro: " + error.message;
    }
}

function editarAviso(aviso) {

    avisoEditando = aviso.id;

    mensagemInput.value = aviso.mensagem;

    inicioInput.value = aviso.inicio.slice(0, 16);
    fimInput.value = aviso.fim.slice(0, 16);

    statusAviso.textContent =
        "Editando aviso...";

    window.scrollTo({
        top: formAviso.offsetTop,
        behavior: "smooth"
    });
}

carregarVideos();
carregarAvisos();