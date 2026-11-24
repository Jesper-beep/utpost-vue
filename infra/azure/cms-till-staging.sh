#!/usr/bin/env bash
# cms-till-staging.sh - ger stagingappen det den behöver för CMS:et (M9)
#
# Läser CONTENTFUL_SPACE_ID, CONTENTFUL_DELIVERY_TOKEN och CONTENTFUL_PREVIEW_TOKEN ur .env i repots rot
# och lägger nycklarna som secrets på containerappen. api-containern får dem som variabler som pekar på
# hemligheterna (secretref). Värdena skrivs aldrig ut. Webhook-hemligheten slumpas här om den inte finns i .env.
#
# Management-token (CONTENTFUL_MANAGEMENT_TOKEN) följer inte med till molnet, eftersom appen aldrig använder den.
#
# Användning:
#   az login
#   RG=<resursgrupp> ./infra/azure/cms-till-staging.sh
#
# Valfri variabel: APP (stagingappen, som i de andra skripten).
set -euo pipefail

: "${RG:?Sätt RG=<resursgruppen>}"
APP="${APP:-utpost-staging}"

cd "$(dirname "$0")/../.."
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${CONTENTFUL_SPACE_ID:?saknas i .env}"
: "${CONTENTFUL_DELIVERY_TOKEN:?saknas i .env}"
: "${CONTENTFUL_PREVIEW_TOKEN:?saknas i .env}"
WEBHOOK_SECRET="${CMS_WEBHOOK_SECRET:-$(openssl rand -hex 24)}"

echo "-> nycklarna som secrets på ${APP}"
az containerapp secret set \
  --name "${APP}" \
  --resource-group "${RG}" \
  --secrets \
    "contentful-delivery-token=${CONTENTFUL_DELIVERY_TOKEN}" \
    "contentful-preview-token=${CONTENTFUL_PREVIEW_TOKEN}" \
    "cms-webhook-secret=${WEBHOOK_SECRET}" \
  --output none

echo "-> variablerna till api-containern (space-id är ingen hemlighet och sätts som vanligt värde)"
az containerapp update \
  --name "${APP}" \
  --resource-group "${RG}" \
  --container-name api \
  --set-env-vars \
    "CONTENTFUL_SPACE_ID=${CONTENTFUL_SPACE_ID}" \
    "CONTENTFUL_DELIVERY_TOKEN=secretref:contentful-delivery-token" \
    "CONTENTFUL_PREVIEW_TOKEN=secretref:contentful-preview-token" \
    "CMS_WEBHOOK_SECRET=secretref:cms-webhook-secret" \
  --revision-suffix "cms-$(date +%H%M%S)" \
  --output none

FQDN="$(az containerapp show \
  --name "${APP}" \
  --resource-group "${RG}" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

echo
echo "CMS-nycklarna ligger som secrets på ${APP}, och api har fått variablerna."
echo
echo "Webhooken i Contentful (Settings > Webhooks > Add webhook):"
echo "  URL:     POST https://${FQDN}/api/cms/webhook"
echo "  Trigger: Entry - Publish och Unpublish"
echo "  Header:  X-Utpost-Webhook-Secret (välj Secret header). Värdet läser du ut med:"
echo "    az containerapp secret show --name ${APP} --resource-group ${RG} --secret-name cms-webhook-secret --query value --output tsv"
echo "  På Mac: lägg till | pbcopy sist, så hamnar värdet i urklipp utan att visas."
