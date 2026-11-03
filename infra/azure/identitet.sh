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
# Skriver ut raderna som skapar GitHub-miljön och variablerna.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
: "${RG:?Sätt RG=<resursgruppen>}"
APP="${APP:-utpost-staging}"
GH_ENV="${GH_ENV:-azure-staging}"
NAME="${NAME:-${REPO##*/}-github}"

OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"
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
SUBJECT="repo:${OWNER}@${OWNER_ID}/${REPO_NAME}@${REPO_ID}:environment:${GH_ENV}"
CREDENTIAL_NAME="github-${GH_ENV}"
CREDENTIAL="{
  \"name\": \"${CREDENTIAL_NAME}\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"${SUBJECT}\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

echo "-> federerad identitet, subject: ${SUBJECT}"
if ! az ad app federated-credential show \
  --id "${APPID}" \
  --federated-credential-id "${CREDENTIAL_NAME}" \
  --output none 2>/dev/null; then
  az ad app federated-credential create \
    --id "${APPID}" \
    --parameters "${CREDENTIAL}" \
    --output none
fi

FQDN="$(az containerapp show \
  --name "${APP}" \
  --resource-group "${RG}" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

SET="gh variable set"
TARGET="--env ${GH_ENV} --repo ${REPO} --body"

echo
echo "Klart. Kör raderna nedan. Det är variables, inte secrets, ett id är ingen hemlighet."
echo
echo "gh api -X PUT repos/${REPO}/environments/${GH_ENV} > /dev/null"
echo "${SET} AZURE_CLIENT_ID       ${TARGET} ${APPID}"
echo "${SET} AZURE_TENANT_ID       ${TARGET} ${TENANT}"
echo "${SET} AZURE_SUBSCRIPTION_ID ${TARGET} ${SUB}"
echo "${SET} AZURE_RG              ${TARGET} ${RG}"
echo "${SET} AZURE_APP             ${TARGET} ${APP}"
echo "${SET} AZURE_URL             ${TARGET} https://${FQDN}"
