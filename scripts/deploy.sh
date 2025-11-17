#!/usr/bin/env bash

set -euo pipefail

# Required environment variables
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

BUILD_DIR="${BUILD_DIR:-out}"
SSH_PORT="${SSH_PORT:-22}"
SSH_OPTIONS="-o StrictHostKeyChecking=no"

# Choose package manager dynamically
if command -v pnpm >/dev/null 2>&1; then
  if [[ -f "pnpm-lock.yaml" ]]; then
    INSTALL_CMD="pnpm install --frozen-lockfile"
  else
    INSTALL_CMD="pnpm install --no-frozen-lockfile"
  fi
  BUILD_CMD="pnpm run deploy:build"
else
  if [[ -f "package-lock.json" ]]; then
    INSTALL_CMD="npm ci"
  else
    INSTALL_CMD="npm install"
  fi
  BUILD_CMD="npm run deploy:build"
fi

echo "▶️ Installing dependencies"
eval "$INSTALL_CMD"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "▶️ Building application"
  eval "$BUILD_CMD"
fi

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "Build output directory '$BUILD_DIR' not found" >&2
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

KEY_PATH=""
if [[ -n "${DEPLOY_KEY:-}" ]]; then
  KEY_PATH="$HOME/.ssh/id_deploy"
  printf '%s\n' "$DEPLOY_KEY" >"$KEY_PATH"
  chmod 600 "$KEY_PATH"
  SSH_OPTIONS="$SSH_OPTIONS -i $KEY_PATH"
fi

ssh-keyscan -p "$SSH_PORT" -H "$DEPLOY_HOST" >>"$HOME/.ssh/known_hosts"

echo "▶️ Syncing files to $DEPLOY_USER@$DEPLOY_HOST"
rsync -az --delete -e "ssh -p $SSH_PORT $SSH_OPTIONS" \
  "$BUILD_DIR"/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"

if [[ -n "${POST_DEPLOY_CMD:-}" ]]; then
  echo "▶️ Running post-deploy command: $POST_DEPLOY_CMD"
  ssh -p "$SSH_PORT" $SSH_OPTIONS \
    "$DEPLOY_USER@$DEPLOY_HOST" "$POST_DEPLOY_CMD"
fi

echo "✅ Deployment completed"
