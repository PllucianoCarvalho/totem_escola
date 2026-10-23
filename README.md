# Totem Escolar

Sistema web para exibição de vídeos, sequência de imagens e avisos escolares em uma tela dedicada, com painel administrativo acessado pela rede local.

## Funcionalidades

- Reprodução contínua do vídeo ativo.
- Sequência de várias imagens após o vídeo, cada uma com duração própria.
- Gerenciamento individual de imagens publicadas.
- Cadastro, edição e exclusão de avisos com período de exibição.
- Painel administrativo protegido por sessão.
- Rotas de alteração da API protegidas por autenticação.
- Armazenamento local de mídias e SQLite.
- Importação da grade de professores a partir do relatório HTML do Urânia+, com prévia revisável antes da publicação.

## Requisitos

- Linux Mint, Ubuntu ou outra distribuição Linux compatível.
- Node.js 20.6 ou superior e npm.
- Git para clonar o repositório.

Confira as versões instaladas:

```bash
node --version
npm --version
```

## Instalação

No terminal do computador que será o servidor, execute:

```bash
git clone https://github.com/PllucianoCarvalho/totem_escola.git
cd totem_escola
npm ci
cp .env.example .env
```

Crie um segredo de sessão:

```bash
openssl rand -hex 32
```

Abra o arquivo de configuração:

```bash
nano .env
```

Preencha as variáveis. Cole o resultado do comando `openssl` em `SESSION_SECRET` e defina usuário e senha fortes para o painel:

```dotenv
SESSION_SECRET=cole_aqui_o_segredo_gerado
ADMIN_USERNAME=seu_usuario
ADMIN_PASSWORD=sua_senha_forte
PORT=3000
```

Não deixe os campos obrigatórios vazios e não publique o arquivo `.env`. Ele contém credenciais locais e é ignorado pelo Git. O comando `npm start` carrega esse arquivo automaticamente por meio do recurso nativo do Node.js.

Inicie o servidor:

```bash
npm start
```

Mantenha o terminal aberto enquanto o sistema estiver em execução. Para encerrar o servidor, pressione `Ctrl+C`.

## Acesso pela rede local

Descubra o IP do servidor com:

```bash
hostname -I
```

Em outro computador da mesma rede, substitua `IP_DO_SERVIDOR` pelo endereço exibido:

- Login: `http://IP_DO_SERVIDOR:3000/login`
- Painel administrativo: `http://IP_DO_SERVIDOR:3000/amostradinho`
- Tela do Totem: `http://IP_DO_SERVIDOR:3000/totem`

Após entrar no painel, envie um vídeo em formato MP4 e clique em **Ativar**. A instalação começa sem vídeo ativo e sem avisos ou imagens cadastrados; esses dados são adicionados pelo painel.

## Resolução de problemas

- **Variáveis de ambiente ausentes:** confira se o arquivo `.env` existe e se `SESSION_SECRET`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` estão preenchidos.
- **Falha ao instalar `better-sqlite3` no Linux:** se o erro indicar ferramentas de compilação ausentes, instale-as com `sudo apt install build-essential python3 make g++` e execute `npm ci` novamente.
- **Acesso a partir de outro computador:** confirme que ambos estão na rede local e que a porta TCP 3000 não está bloqueada pelo firewall.

Se o servidor for configurado futuramente para iniciar pelo systemd executando `server.js` diretamente, a unidade também precisará carregar o arquivo `.env` (por exemplo, com `EnvironmentFile=`) ou usar a opção `--env-file` do Node.js. O comando documentado aqui é `npm start`.

## Importação dos horários escolares

A grade deve ser importada pelo painel administrativo usando o relatório geral exportado pelo Urânia+ em HTML (ou arquivo `.xls` que contenha HTML). A leitura mostra uma prévia e não publica automaticamente; revise os registros e publique somente depois de conferir os dados. A conversão do número de período em horário real usa a configuração da escola. A numeração por turno ainda precisa ser confirmada com o relatório oficial do ensino regular; não se deve presumir que os períodos reiniciam ou continuam entre turnos. O fluxo atual não usa PDFs como fonte de importação.

## API principal

As rotas de leitura usadas pela tela do Totem permanecem disponíveis sem login. As operações que alteram dados exigem sessão autenticada.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/status` | Estado do servidor e banco |
| GET | `/api/videos` | Lista vídeos e vídeo ativo |
| POST | `/api/video` | Envia um vídeo MP4 (login necessário) |
| POST | `/api/video/ativar` | Define o vídeo ativo (login necessário) |
| DELETE | `/api/videos/:video` | Exclui vídeo não ativo (login necessário) |
| GET | `/api/video` | Consulta vídeo ativo |
| GET/POST | `/api/imagem` | Consulta a lista / adiciona imagem (POST exige login) |
| DELETE | `/api/imagem/:id` | Exclui uma imagem (login necessário) |
| GET/POST/PUT/DELETE | `/api/avisos` e `/api/avisos/:id` | Consulta e gerencia avisos; alterações exigem login |

## Dados locais e versionamento

O banco SQLite é criado automaticamente em `dados/totem.db`. Vídeos, imagens e configurações locais também são gravados na pasta `dados/`; esses dados não precisam estar no GitHub e não devem ser versionados.

O `.gitignore` exclui dependências instaladas, uploads, bancos de dados, configurações locais e backups. Versione o código e os arquivos de exemplo, não os dados reais da escola.

**Importante:** arquivos de mídia, bancos e dependências que tenham sido adicionados a commits antigos continuam no histórico do GitHub, mesmo quando removidos das versões mais recentes. Para eliminá-los do histórico é necessário reescrevê-lo e verificar novamente se algum segredo foi publicado.
