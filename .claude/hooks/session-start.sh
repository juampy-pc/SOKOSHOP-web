#!/bin/bash
# Inicio de sesión en Claude Code (web): dependencias + mapa del código con graphify.
# Mismo archivo en SOKOSHOP-web y sokoshop-admin.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
export PATH="$HOME/.local/bin:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

# 1) Dependencias (postinstall corre `prisma generate`).
npm install --no-audit --no-fund

# 2) graphify: CLI (con soporte SQL para las migraciones del panel).
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install --quiet 'graphifyy[sql]'
  else
    python3 -m pip install --user --quiet 'graphifyy[sql]'
  fi
fi

# 3) Mapa del código (AST, sin LLM ni API keys). Si algo falla, la sesión arranca igual.
graphify update . >/dev/null 2>&1 || echo "graphify: no se pudo actualizar el grafo de $(basename "$PWD")" >&2

# Rehace el grafo solo después de cada commit y cambio de rama (en segundo plano, sin costo).
graphify hook install >/dev/null 2>&1 || true

# 4) Grafo combinado tienda + panel, si el otro repo está al lado.
here="$(basename "$PWD")"
if [ "$here" = "sokoshop-admin" ]; then store="../SOKOSHOP-web"; admin="."; else store="."; admin="../sokoshop-admin"; fi
if [ -d "$store/.claude/graphify" ] && [ -d "$admin" ] && [ "$store" != "$admin" ]; then
  other="$admin"; [ "$here" = "sokoshop-admin" ] && other="$store"
  (cd "$other" && graphify update . >/dev/null 2>&1) || true
  py="$(head -1 "$(command -v graphify)" | sed 's/^#!//')"
  "$py" "$store/.claude/graphify/cross-repo.py" "$admin" >/dev/null 2>&1 || echo "graphify: no se pudo armar el grafo combinado" >&2
fi
