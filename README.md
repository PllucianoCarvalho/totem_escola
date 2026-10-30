# Totem Escolar

Sistema web para exibição de vídeos, sequência de imagens e avisos escolares em uma tela dedicada, com painel administrativo acessado pela rede local.

## Funcionalidades

- Reprodução contínua do vídeo ativo, com opção de desativar ou excluir inclusive o vídeo atualmente ativo.
- Sequência de várias imagens após o vídeo, cada uma com duração própria.
- Gerenciamento individual de imagens publicadas.
- Cadastro, edição e exclusão de avisos com período de exibição.
- Painel administrativo protegido por sessão em `/amostradinho`; o endereço antigo `/admin` redireciona para o painel oficial.
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

## Configurar o computador que exibe o Totem (tela)

Esta etapa é feita no **computador conectado à TV/tela**, não no servidor Node.js. O computador da tela usado neste projeto foi configurado com Linux Mint, usuário dedicado `totem`, login automático e Firefox em modo quiosque (tela cheia, sem barras do navegador).

### 1. Criar/usar o usuário da tela

Se ainda não existir, crie o usuário:

```bash
sudo adduser totem
```

Configure o login automático para esse usuário em **Configurações do Sistema → Tela de Login → Login automático**. O usuário precisa entrar na sessão gráfica para que o Firefox seja iniciado.

### 2. Instalar Firefox e ferramentas de tela

```bash
sudo apt update
sudo apt install firefox x11-xserver-utils xdotool
```

Se o Firefox já estiver instalado, não é necessário reinstalá-lo.

### 3. Criar o script de inicialização da tela

Entre na sessão gráfica do usuário `totem` e crie a pasta e o script:

```bash
mkdir -p ~/bin
nano ~/bin/iniciar-totem-tela.sh
```

Conteúdo do arquivo:

```bash
#!/bin/bash

# Impede o protetor de tela e o desligamento automático do monitor nesta sessão X11
xset s off
xset s noblank
xset -dpms

# Move o ponteiro para o canto inferior direito para não ficar sobre o conteúdo
xdotool mousemove 9999 9999

# Abre a tela do Totem em modo quiosque
firefox --kiosk http://IP_DO_SERVIDOR:3000/totem
```

Troque `IP_DO_SERVIDOR` pelo IP fixo ou reservado do computador servidor. Salve e torne o script executável:

```bash
chmod +x ~/bin/iniciar-totem-tela.sh
```

> Os comandos `xset` desativam o protetor de tela/DPMS apenas na sessão gráfica atual. Para evitar suspensão do computador pelo gerenciador de energia, abra **Configurações do Sistema → Gerenciamento de energia** e configure a suspensão como **Nunca** quando ligado à tomada. Se houver opções separadas para apagar a tela, bloquear a sessão ou suspender por inatividade, desative-as também. Os nomes podem variar conforme a edição do Linux Mint.

### 4. Iniciar automaticamente em modo quiosque

Crie o arquivo de inicialização automática:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/totem.desktop
```

Conteúdo:

```ini
[Desktop Entry]
Type=Application
Name=Totem Escolar
Exec=/home/totem/bin/iniciar-totem-tela.sh
Terminal=false
X-GNOME-Autostart-enabled=true
```

Se o usuário dedicado tiver outro nome ou diretório pessoal, ajuste o caminho de `Exec`. Remova ou desative uma entrada antiga que inicie o Firefox diretamente para evitar abrir duas janelas.

Reinicie o computador e confira se o login automático abre o Firefox diretamente em `http://IP_DO_SERVIDOR:3000/totem`.

### 5. Orientação da tela

Configure a orientação como **Retrato (vertical)** em **Configurações do Sistema → Tela**. Faça a rotação pela interface gráfica e teste antes de tornar qualquer comando de rotação permanente. Uma configuração incorreta no LightDM pode causar tela preta ou ciclo de login.

### Observações

- O modo quiosque do Firefox abre a página sem a interface normal do navegador; ele não inicia o servidor. O servidor precisa estar ligado e acessível pela rede.
- Reserve um IP para o servidor no roteador ou atualize o endereço no script se o IP mudar.
- Se a sessão for Wayland, os comandos `xset` e `xdotool` podem não funcionar como esperado; esta configuração foi pensada para uma sessão X11.
- Não use suspensão automática no computador da tela. O monitor pode apagar por configurações próprias, mesmo que o navegador continue aberto.
- A configuração do servidor (Node.js/systemd/porta 3000) está documentada nas seções anteriores; esta seção trata somente do computador que exibe a página.

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

## Atualizar uma instalação existente

Depois que as alterações forem integradas à branch `main`, atualize o servidor a partir da pasta do projeto:

```bash
bash atualizar.sh
```

O script só executa na branch `main`, exige que não haja alterações locais pendentes e verifica se a atualização pode ser feita por avanço direto. Antes de atualizar, cria um arquivo compactado de backup com `.env` e toda a pasta `dados/` em `../backups-totem/`. Em seguida, busca a `main` do GitHub e instala as dependências com `npm ci`.

O atualizador não restaura nem substitui a pasta `dados/` durante a atualização: os horários versionados são atualizados pelo Git, enquanto vídeos, imagens, banco SQLite e demais dados locais permanecem no servidor. O arquivo `.env` também permanece no lugar.

O script não reinicia automaticamente o serviço, pois o nome e o método de inicialização podem variar entre servidores. Após a atualização, reinicie o serviço conforme a configuração local e confira o login do painel, a tela do Totem e os horários. Não execute o atualizador antes de a PR de desenvolvimento ser integrada à `main`.

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
| POST | `/api/video/desativar` | Desativa o vídeo atual sem apagar o arquivo (login necessário) |
| DELETE | `/api/videos/:video` | Exclui um vídeo, inclusive o atualmente ativo (login necessário) |
| GET | `/api/video` | Consulta vídeo ativo |
| GET/POST | `/api/imagem` | Consulta a lista / adiciona imagem (POST exige login) |
| DELETE | `/api/imagem/:id` | Exclui uma imagem (login necessário) |
| GET/POST/PUT/DELETE | `/api/avisos` e `/api/avisos/:id` | Consulta e gerencia avisos; alterações exigem login |

## Dados locais e versionamento

O banco SQLite é criado automaticamente em `dados/totem.db`. Vídeos, imagens enviadas e o banco de dados ficam em `dados/` e não devem ser versionados.

A grade atual de horários da escola (`dados/horarios.json`) e sua configuração (`dados/horarios-config.json`) são mantidas no GitHub intencionalmente para que a instalação publicada já tenha os horários disponíveis. Atualize esses arquivos pelo fluxo de revisão e publicação da grade quando houver mudanças.

O `.gitignore` exclui dependências instaladas, uploads de mídia, bancos de dados e backups. Não adicione credenciais, banco SQLite ou arquivos de mídia reais ao repositório.

**Importante:** arquivos de mídia, bancos e dependências que tenham sido adicionados a commits antigos continuam no histórico do GitHub, mesmo quando removidos das versões mais recentes. Para eliminá-los do histórico é necessário reescrevê-lo e verificar novamente se algum segredo foi publicado.
