# Totem Escolar

Sistema web para exibição de vídeos, sequência de imagens e avisos escolares em uma tela dedicada, com painel administrativo acessado pela rede local.

## Funcionalidades

- Reprodução contínua do vídeo ativo.
- Sequência de várias imagens após o vídeo, cada uma com duração própria.
- Gerenciamento individual de imagens publicadas.
- Cadastro, edição e exclusão de avisos com período de exibição.
- Painel protegido por sessão.
- Armazenamento local de mídias e SQLite.

## Tecnologias

- Node.js 20+
- Express 5
- SQLite com better-sqlite3
- express-session
- Multer
- HTML, CSS e JavaScript

## Como funciona

O servidor armazena os vídeos em `dados/videos/`, as imagens em `dados/imagens/`, as configurações de vídeo e avisos no SQLite e a lista de imagens em `dados/imagem.json`. Esses dados são locais à instalação e não devem ser versionados.

Após o vídeo terminar, o Totem apresenta cada imagem cadastrada na ordem atual da lista, respeitando a duração de cada item, e então reinicia o vídeo.

## Instalação

Requer Node.js 20 ou superior.

```bash
npm install
cp .env.example .env
```

Edite o arquivo `.env` no servidor com valores próprios. Gere o segredo de sessão usando:

```bash
openssl rand -hex 32
```

Defina estas variáveis no ambiente de execução:

- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `PORT` (opcional; padrão `3000`)

O arquivo `.env` é ignorado pelo Git. Não publique credenciais reais.

Inicie o sistema:

```bash
npm start
```

O painel é acessado em `/amostradinho`; a tela do Totem em `/totem`. Use o endereço IP do servidor na rede local.

## API principal

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/status` | Estado do servidor e banco |
| GET | `/api/videos` | Lista vídeos e vídeo ativo |
| POST | `/api/video` | Envia vídeo |
| POST | `/api/video/ativar` | Define o vídeo ativo |
| DELETE | `/api/videos/:video` | Exclui vídeo não ativo |
| GET | `/api/video` | Consulta vídeo ativo |
| GET/POST | `/api/imagem` | Consulta a lista / adiciona imagem |
| DELETE | `/api/imagem/:id` | Exclui uma imagem da lista |
| GET/POST/PUT/DELETE | `/api/avisos` e `/api/avisos/:id` | Gerencia avisos |

## Dados locais e versionamento

O `.gitignore` exclui dependências instaladas, uploads, bancos de dados, configurações locais e backups. Versione o código e os arquivos de exemplo, não os dados reais da escola.

**Importante:** arquivos de mídia, bancos e dependências que tenham sido adicionados a commits antigos continuam no histórico do GitHub, mesmo quando são removidos de uma versão mais recente. Para eliminá-los também do histórico público é necessário reescrever o histórico e verificar novamente se algum segredo foi publicado.
