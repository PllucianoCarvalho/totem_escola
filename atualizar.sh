#!/usr/bin/env bash
set -Eeuo pipefail

# Atualizador seguro do Totem Escolar.
# Execute na raiz do projeto, depois que a PR de desenvolvimento for integrada à main.

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '\n[Totem] %s\n' "$*"; }
fail() { printf '\n[ERRO] %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "Git não está instalado."
command -v node >/dev/null 2>&1 || fail "Node.js não está instalado."
command -v npm >/dev/null 2>&1 || fail "npm não está instalado."

BRANCH="$(git branch --show-current)"
[ "$BRANCH" = "main" ] || fail "A atualização deve ser executada na branch main. Branch atual: $BRANCH"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Esta pasta não é um repositório Git."
git diff --quiet || fail "Há alterações locais não commitadas. Faça backup e resolva-as antes de atualizar."
git diff --cached --quiet || fail "Há alterações preparadas no Git. Faça commit ou resolva-as antes de atualizar."

[ -f ".env" ] || fail "Arquivo .env não encontrado. A atualização foi cancelada para proteger a configuração."
[ -f "package-lock.json" ] || fail "package-lock.json não encontrado."

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
NODE_MINOR="$(node -p 'Number(process.versions.node.split(".")[1])')"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 6 ]; }; then
  fail "Node.js 20.6 ou superior é necessário. Versão atual: $(node --version)"
fi

OLD_COMMIT="$(git rev-parse HEAD)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$(dirname "$ROOT")/backups-totem"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/totem-backup-$STAMP.tar.gz"

log "Criando backup de .env e da pasta dados/..."
BACKUP_ITEMS=()
[ -f ".env" ] && BACKUP_ITEMS+=(".env")
[ -d "dados" ] && BACKUP_ITEMS+=("dados")
[ "${#BACKUP_ITEMS[@]}" -gt 0 ] || fail "Não encontrei .env nem dados para proteger."
tar -czf "$BACKUP_FILE" "${BACKUP_ITEMS[@]}" || fail "Falha ao criar backup. Atualização cancelada."
log "Backup salvo em: $BACKUP_FILE"

log "Buscando atualizações da branch main..."
git fetch origin main || fail "Não foi possível buscar origin/main."
git merge-base --is-ancestor HEAD origin/main || fail "A main remota não é avanço direto da versão local. Atualização cancelada para evitar sobrescrever histórico."
git pull --ff-only origin main || fail "Falha ao atualizar o código. O backup foi preservado."

log "Instalando dependências conforme package-lock.json..."
if ! npm ci; then
  printf '\n[ERRO] npm ci falhou. O backup foi preservado em: %s\n' "$BACKUP_FILE" >&2
  printf '[ERRO] O código pode já ter sido atualizado; não reinicie o serviço até corrigir a instalação.\n' >&2
  exit 1
fi

NEW_COMMIT="$(git rev-parse --short HEAD)"
log "Atualização concluída."
printf 'Versão anterior: %s\n' "$OLD_COMMIT"
printf 'Versão instalada: %s\n' "$NEW_COMMIT"
printf 'Backup: %s\n' "$BACKUP_FILE"
printf '\nO serviço não foi reiniciado automaticamente. Reinicie o serviço do Totem conforme a configuração do servidor e confira /api/status e /amostradinho/.\n'
