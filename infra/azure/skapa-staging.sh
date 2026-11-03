#!/usr/bin/env bash
# skapa-staging.sh - Utposts staging i Azure Container Apps (M6)
#
# Skapar miljön och appen ur staging.yaml. Körs en gång per team, av en människa.
# Pipelinen skapar inget, den byter bara avbildning i appen (jobbet Deploy i ci.yml).
#
# Användning:
#   az login
#   REPO=<ägare>/<repo> RG=<resursgrupp> SHA=<hela git-sha på main> ./infra/azure/skapa-staging.sh
#
# Kräver:
#   - att resursgruppen redan finns
#   - att avbildningarna finns i GHCR (jobbet Image på main)
#   - att paketen -api och -client är Public
#
# Valfria variabler: LOC, ENV_NAME, APP.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
: "${RG:?Sätt RG=<resursgruppen>}"
: "${SHA:?Sätt SHA=<hela git-sha:n på main som Image har publicerat>}"
LOC="${LOC:-swedencentral}"
ENV_NAME="${ENV_NAME:-utpost-env}"
APP="${APP:-utpost-staging}"
REPO_LC="$(echo "${REPO}" | tr '[:upper:]' '[:lower:]')"
IMAGE_API="ghcr.io/${REPO_LC}-api:sha-${SHA:0:7}"
IMAGE_CLIENT="ghcr.io/${REPO_LC}-client:sha-${SHA:0:7}"

JWT_SECRET="$(openssl rand -hex 32)"
DB_PASSWORD="$(openssl rand -hex 16)"

echo "-> containerapp-tillägget och leverantören Microsoft.App"
az extension add --name containerapp --upgrade --only-show-errors
az provider register --namespace Microsoft.App --wait

echo "-> resursgrupp ${RG}"
az group show --name "${RG}" --output none

echo "-> miljö ${ENV_NAME} (tar ungefär 2 minuter, loggar strömmas med az containerapp logs show)"
az containerapp env create \
  --name "${ENV_NAME}" \
  --resource-group "${RG}" \
  --location "${LOC}" \
  --logs-destination none \
  --output none

ENV_ID="$(az containerapp env show \
  --name "${ENV_NAME}" \
  --resource-group "${RG}" \
  --query id \
  --output tsv)"

echo "-> appen ${APP} ur infra/azure/staging.yaml (api ${IMAGE_API}, client ${IMAGE_CLIENT})"
TEMPLATE="$(dirname "$0")/staging.yaml"
TMP="$(mktemp)"
sed \
  -e "s|__LOCATION__|${LOC}|g" \
  -e "s|__APP__|${APP}|g" \
  -e "s|__RG__|${RG}|g" \
  -e "s|__ENV_ID__|${ENV_ID}|g" \
  -e "s|__IMAGE_API__|${IMAGE_API}|g" \
  -e "s|__IMAGE_CLIENT__|${IMAGE_CLIENT}|g" \
  -e "s|__JWT_SECRET__|${JWT_SECRET}|g" \
  -e "s|__DB_PASSWORD__|${DB_PASSWORD}|g" \
  "${TEMPLATE}" > "${TMP}"

az containerapp create \
  --resource-group "${RG}" \
  --name "${APP}" \
  --yaml "${TMP}" \
  --output none

rm -f "${TMP}"
unset JWT_SECRET DB_PASSWORD

FQDN="$(az containerapp show \
  --name "${APP}" \
  --resource-group "${RG}" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"
echo
echo "Klart. Appen: https://${FQDN}"
echo "Första anropet väcker appen från noll (fyra containrar och seed), räkna med en minut."
echo "Kontroll: curl -s https://${FQDN}/api/health"
