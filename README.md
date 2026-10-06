<div align="center">

# 🖥️ TOTEM ESCOLAR

### Sistema digital de comunicação para ambientes educacionais

<img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20">
<img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 5">
<img src="https://img.shields.io/badge/SQLite-database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
<img src="https://img.shields.io/badge/Status-Em%20desenvolvimento-F2C94C?style=for-the-badge" alt="Em desenvolvimento">

</div>

---

## 📌 Sobre o projeto

O **Totem Escolar** é um sistema desenvolvido para transformar uma tela vertical em um ponto digital de comunicação dentro do ambiente escolar.

O sistema permite a reprodução contínua de vídeos e a exibição de avisos, com gerenciamento realizado por meio de uma interface administrativa.

A proposta é permitir que os conteúdos apresentados no totem sejam atualizados sem a necessidade de acessar fisicamente o computador responsável pela exibição.

---

<div align="center">

## 🎯 Objetivo

**Centralizar e automatizar a comunicação visual da escola.**

</div>

---

## ⚙️ Funcionalidades

<table>
<tr>
<td width="50%" valign="top">

### 🎬 Conteúdo audiovisual

- Reprodução contínua de vídeos
- Suporte à apresentação vertical 9:16
- Upload de vídeos
- Seleção do vídeo ativo
- Atualização do conteúdo do totem

</td>
<td width="50%" valign="top">

### 📢 Comunicação

- Cadastro de avisos
- Gerenciamento dos avisos
- Atualização remota
- Exibição automática
- Interface administrativa

</td>
</tr>
</table>

---

## 🧠 Arquitetura

```text
┌──────────────────────────────┐
│      PAINEL ADMINISTRATIVO   │
│                              │
│     🎬 Vídeos  |  📢 Avisos  │
└──────────────┬───────────────┘
               │
               │ HTTP
               ▼
┌──────────────────────────────┐
│          SERVIDOR            │
│                              │
│          Node.js             │
│           Express            │
│                              │
│           API REST           │
└──────────────┬───────────────┘
               │
          ┌────┴────┐
          ▼         ▼
   ┌───────────┐ ┌───────────┐
   │   SQLite  │ │  Uploads  │
   │           │ │  Vídeos   │
   └───────────┘ └───────────┘
               │
               ▼
┌──────────────────────────────┐
│            TOTEM             │
│                              │
│        📺 Vídeo              │
│        📢 Avisos             │
└──────────────────────────────┘
```

---

## 🛠️ Tecnologias

| Tecnologia | Utilização |
|---|---|
| 🟢 **Node.js** | Ambiente de execução do servidor |
| ⚡ **Express 5** | Servidor web e API |
| 🗄️ **SQLite** | Armazenamento das informações |
| 📦 **Multer** | Upload de vídeos e imagens |
| 🌐 **HTML / CSS / JavaScript** | Interface e apresentação |
| 🔧 **Git / GitHub** | Versionamento e desenvolvimento |

---

## 📁 Estrutura do projeto

```text
totem_escola/
├── dados/
│   ├── videos/          # Vídeos carregados localmente (não versionados)
│   ├── imagens/         # Imagens carregadas localmente (não versionadas)
│   └── imagem.json      # Configuração local da imagem ativa
├── database/            # Código de acesso ao SQLite
├── public/
│   ├── amostradinho/    # Painel administrativo
│   ├── login/           # Tela de autenticação
│   └── totem/           # Interface de exibição
├── package.json
├── package-lock.json
└── server.js
```

> Bancos de dados, mídias, arquivos de ambiente e backups locais são ignorados pelo Git para evitar publicar dados locais ou arquivos desnecessários.

---

## 🔌 API

O servidor disponibiliza endpoints para consulta e gerenciamento do sistema:

| Método | Endpoint | Função |
|---|---|---|
| `GET` | `/api/status` | Consulta o estado do servidor e do banco |
| `GET` | `/api/videos` | Lista os vídeos disponíveis e o vídeo ativo |
| `POST` | `/api/video` | Envia um vídeo |
| `GET` | `/api/video` | Consulta o vídeo ativo |
| `POST` | `/api/video/ativar` | Define o vídeo ativo |
| `DELETE` | `/api/videos/:video` | Exclui um vídeo que não esteja ativo |
| `GET` | `/api/avisos` | Lista os avisos |
| `POST` | `/api/avisos` | Cadastra um aviso |
| `PUT` | `/api/avisos/:id` | Atualiza um aviso |
| `DELETE` | `/api/avisos/:id` | Exclui um aviso |
| `GET` | `/api/imagem` | Consulta a imagem configurada |
| `POST` | `/api/imagem` | Envia e configura uma imagem |
| `DELETE` | `/api/imagem` | Remove a imagem configurada |

---

## 🖥️ Funcionamento

O sistema foi pensado para funcionar em uma arquitetura simples:

```text
Computador servidor
        │
        │ Rede local
        ▼
   ┌───────────┐
   │   TOTEM   │
   │           │
   │  Tela 9:16│
   └───────────┘

Outro computador
        │
        │ Rede local
        ▼
┌───────────────────┐
│ Painel            │
│ Administrativo    │
└───────────────────┘
```

O computador responsável pelo totem pode permanecer dedicado à exibição, enquanto o gerenciamento dos conteúdos pode ser realizado por outro computador conectado à mesma rede.

---

## 🎓 Aplicação educacional

O projeto foi concebido para atender uma necessidade prática do ambiente escolar e também representa uma experiência de desenvolvimento de tecnologia aplicada à educação.

Entre os conceitos envolvidos estão:

- desenvolvimento de sistemas;
- programação;
- bancos de dados;
- comunicação em rede;
- interfaces web;
- automação;
- gerenciamento de conteúdo digital;
- aplicação de tecnologias no ambiente educacional.

---

## 🚧 Desenvolvimento

O projeto está em **desenvolvimento contínuo**. Novas funcionalidades poderão ser incorporadas conforme as necessidades identificadas durante sua utilização no ambiente escolar.

### Próximas possibilidades

- 🔐 aprimoramento da autenticação;
- 📅 agendamento de conteúdos;
- ⏱️ programação de horários para vídeos e avisos;
- 📊 monitoramento do estado do totem;
- 🔄 atualização automática de conteúdos;
- 🖼️ suporte ampliado a diferentes formatos de mídia;
- 📱 melhorias na interface administrativa.

---

## 🚀 Executar localmente

Requisitos: Node.js 20 ou superior e npm.

Instale as dependências e configure as variáveis de ambiente obrigatórias antes de iniciar:

```sh
npm install
export SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_USERNAME="seu-usuario"
export ADMIN_PASSWORD="uma-senha-forte"
npm start
```

`SESSION_SECRET`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` são obrigatórias. Em ambientes hospedados, configure-as como secrets/variáveis do ambiente de execução; não as grave no repositório.

---

<div align="center">

## 👨‍🏫 Autor

### Luciano Maciel

Professor da Educação Básica, com atuação nas áreas de **Física, Robótica Educacional e tecnologias aplicadas à educação**.

Projeto desenvolvido como solução tecnológica para o ambiente escolar.

<br>

### 🟡 PROJETO EM DESENVOLVIMENTO

</div>
