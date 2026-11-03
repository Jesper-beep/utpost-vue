#!/usr/bin/env bash
# identitet.sh - en identitet åt pipelinen, utan lösenord (M6)
#
# GitHub Actions loggar in i Azure med OIDC. Jobbet får en kortlivad token av GitHub,
# och Azure litar på den bara för jobb som körs:
#   - i repot REPO
#   - i miljön azure-staging
# Identiteten får bara ändra resursgruppen RG.
#
# Användning (en gång per team, efter skapa-staging.sh):
#   REPO=<ägare>/<repo> RG=<resursgrupp> ./infra/azure/identitet.sh
#
# Kräver:
#   - az inloggad
#   - gh inloggad
#
# Skriver ut raderna som skapar GitHub-miljön, variablerna och secreten AZURE_RG.
#
# Två federerade identiteter skapas (en regel i Azure som säger att en token signerad av
# GitHub godtas, om subjectet i den matchar exakt). GitHub kan skicka subjectet på två sätt:
# med repots och ägarens id:n, eller bara med namnen. Azure godtar den som matchar.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
: "${RG:?Sätt RG=<resursgruppen>}"
APP="${APP:-utpost-staging}"
GH_ENV="${GH_ENV:-azure-staging}"
NAME="${NAME:-${REPO##*/}-github}"

SUB="$(az account show --query id --output tsv)"
TENANT="$(az account show --query tenantId --output tsv)"
SCOPE="/subscriptions/${SUB}/resourceGroups/${RG}"

echo "-> app registration och service principal: ${NAME}"
APPID="$(az ad app list --display-name "${NAME}" --query '[0].appId' --output tsv)"
if [ -z "${APPID}" ]; then
  APPID="$(az ad app create --display-name "${NAME}" --query appId --output tsv)"
fi
if ! az ad sp show --id "${APPID}" --output none 2>/dev/null; then
  az ad sp create --id "${APPID}" --output none
fi

echo "-> rollen Contributor på bara resursgruppen ${RG}"
ROLLEN_FINNS=""
for forsok in 1 2 3 4 5 6; do
  if az role assignment create \
    --role Contributor \
    --assignee "${APPID}" \
    --scope "${SCOPE}" \
    --output none; then
    ROLLEN_FINNS=ja
    break
  fi
  echo "   identiteten syns inte direkt, väntar 10 s (försök ${forsok}/6)"
  sleep 10
done
if [ -z "${ROLLEN_FINNS}" ]; then
  echo "FEL: rolltilldelningen gick inte igenom. Utan den blir Deploy rött med AuthorizationFailed." >&2
  echo "     Det krävs Owner eller User Access Administrator på resursgruppen." >&2
  exit 1
fi

REPO_ID="$(gh api "repos/${REPO}" --jq .id)"
OWNER_ID="$(gh api "repos/${REPO}" --jq .owner.id)"
OWNER="$(gh api "repos/${REPO}" --jq .owner.login)"
REPO_NAME="$(gh api "repos/${REPO}" --jq .name)"

skapa_federation() {
  local namn="$1"
  local subject="$2"
  local credential="{
  \"name\": \"${namn}\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"${subject}\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

  echo "-> federerad identitet ${namn}, subject: ${subject}"
  if az ad app federated-credential show \
    --id "${APPID}" \
    --federated-credential-id "${namn}" \
    --output none 2>/dev/null; then
    return
  fi
  az ad app federated-credential create \
    --id "${APPID}" \
    --parameters "${credential}" \
    --output none
}

skapa_federation "github-${GH_ENV}-id" \
  "repo:${OWNER}@${OWNER_ID}/${REPO_NAME}@${REPO_ID}:environment:${GH_ENV}"
skapa_federation "github-${GH_ENV}-namn" \
  "repo:${OWNER}/${REPO_NAME}:environment:${GH_ENV}"

FQDN="$(az containerapp show \
  --name "${APP}" \
  --resource-group "${RG}" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

SET="gh variable set"
TARGET="--env ${GH_ENV} --repo ${REPO} --body"

echo
echo "Klart. Kör raderna nedan. Id:n är variables, ett id är ingen hemlighet."
echo "Resursgruppens namn är en secret, så att det inte syns i loggen."
echo
echo "gh api -X PUT repos/${REPO}/environments/${GH_ENV} > /dev/null"
echo "${SET} AZURE_CLIENT_ID       ${TARGET} ${APPID}"
echo "${SET} AZURE_TENANT_ID       ${TARGET} ${TENANT}"
echo "${SET} AZURE_SUBSCRIPTION_ID ${TARGET} ${SUB}"
echo "gh secret set AZURE_RG --env ${GH_ENV} --repo ${REPO} --body ${RG}"
echo "${SET} AZURE_APP             ${TARGET} ${APP}"
echo "${SET} AZURE_URL             ${TARGET} https://${FQDN}"
