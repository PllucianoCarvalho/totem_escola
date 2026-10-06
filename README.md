# Totem Escola

Aplicação web para exibição de vídeos informativos e avisos escolares.

## Executar

Instale as dependências e configure as variáveis de ambiente obrigatórias antes de iniciar:

```sh
npm install
export SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_USERNAME="seu-usuario"
export ADMIN_PASSWORD="uma-senha-forte"
npm start
```

`SESSION_SECRET`, `ADMIN_USERNAME` e `ADMIN_PASSWORD` são obrigatórias. Em ambientes hospedados, configure-as como secrets/variáveis do ambiente de execução; não as grave no repositório.
