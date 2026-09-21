#!/usr/bin/env bash
set -euo pipefail
cd /opt/our-own-leads/source
test -z "$(git status --porcelain)" || { echo 'Deployment checkout has local changes; refusing to overwrite them.'; exit 1; }
git pull --ff-only origin main
cp deploy/compose.yaml /opt/our-own-leads/deploy/compose.yaml
cd /opt/our-own-leads/deploy
docker compose build
docker compose up -d --wait --wait-timeout 120
git -C /opt/our-own-leads/source rev-parse HEAD
