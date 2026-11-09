#!/usr/bin/env bash
# skapa-funktion.sh - bildfunktionen i Azure Functions (M7)
#
# Skapar ett lagringskonto och en function-app (Flex Consumption) i resursgruppen,
# lägger upp koden från functions/ en första gång, kopplar funktionen till staging och
# skriver ut adress och nyckel. Körs en gång per team, av en människa. Därefter
# publicerar pipelinen (jobbet Deploy till Azure Functions i ci.yml).
#
# Användning (samma REPO, RG och APP som för identitet.sh):
#   az login
#   REPO=<ägare>/<repo> RG=<resursgrupp> ./infra/azure/skapa-funktion.sh
#
# Kräver:
#   - az inloggad, och att resursgruppen redan finns
#   - rätten att skapa resurser i resursgruppen (Contributor räcker)
#   - node, npm och zip
#
# Resursgruppen ska vara samma som för skapa-staging.sh och identitet.sh. Pipelinens
# identitet får bara ändra den resursgruppen, så funktionen måste ligga där.
#
# Valfria variabler: APP (stagingappen, som i de andra skripten), FUNCTION_APP, LOC,
# STORAGE_ACCOUNT, INSTANCE_MEMORY, MAX_INSTANCES, HTTP_CONCURRENCY, NODE_VERSION, GH_ENV.
#
# Skriptet ändrar bara resursgruppen. Det sätter inga always ready-instanser, så
# funktionen skalar till noll och första anropet efter en paus är en kallstart.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
: "${RG:?Sätt RG=<resursgruppen>}"
APP="${APP:-utpost-staging}"
REPO_NAME="${REPO##*/}"
FUNCTION_APP="${FUNCTION_APP:-$(echo "${REPO_NAME}" | tr '[:upper:]' '[:lower:]')-fn}"
LOC="${LOC:-swedencentral}"
INSTANCE_MEMORY="${INSTANCE_MEMORY:-2048}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"
HTTP_CONCURRENCY="${HTTP_CONCURRENCY:-1}"
NODE_VERSION="${NODE_VERSION:-24}"
GH_ENV="${GH_ENV:-azure-staging}"
FUNCTIONS_DIR="$(cd "$(dirname "$0")/../../functions" && pwd)"

SUB="$(az account show --query id --output tsv)"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-sa$(echo -n "${SUB}${RG}${FUNCTION_APP}" | shasum | cut -c1-12)}"

ensure_provider() {
  local namespace="$1"
  local state
  state="$(az provider show --namespace "${namespace}" --query registrationState --output tsv)"
  if [ "${state}" != "Registered" ]; then
    echo "-> registrerar leverantören ${namespace}"
    az provider register --namespace "${namespace}" --wait
  fi
}

check_node_version() {
  local versions
  if ! versions="$(az functionapp list-flexconsumption-runtimes \
    --location "${LOC}" \
    --runtime node \
    --query "[].version" \
    --output tsv 2>/dev/null)"; then
    echo "   kunde inte läsa vilka Node-versioner ${LOC} stödjer, fortsätter"
    return
  fi
  if ! echo "${versions}" | grep -qx "${NODE_VERSION}"; then
    echo "FEL: Node ${NODE_VERSION} finns inte för Flex Consumption i ${LOC}." >&2
    echo "     Stöds: $(echo "${versions}" | tr '\n' ' ')" >&2
    echo "     Välj en annan med NODE_VERSION=<version>." >&2
    exit 1
  fi
}

build_package() {
  local package_dir="$1"

  echo "-> bygger functions/ (npm ci och npm run build)"
  npm --prefix "${FUNCTIONS_DIR}" ci
  npm --prefix "${FUNCTIONS_DIR}" run build

  echo "-> paketerar för Linux, så att sharp får rätt binärer"
  cp "${FUNCTIONS_DIR}/package.json" "${FUNCTIONS_DIR}/package-lock.json" \
    "${FUNCTIONS_DIR}/host.json" "${package_dir}/"
  cp -R "${FUNCTIONS_DIR}/dist" "${package_dir}/dist"
  (cd "${package_dir}" && npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc)
  (cd "${package_dir}" && zip -qr ../functions.zip .)
}

read_function_key() {
  local key
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    key="$(az functionapp keys list \
      --name "${FUNCTION_APP}" \
      --resource-group "${RG}" \
      --query functionKeys.default \
      --output tsv 2>/dev/null || true)"
    if [ -n "${key}" ] && [ "${key}" != "None" ]; then
      echo "${key}"
      return
    fi
    echo "   nyckeln finns inte än, väntar 10 s (försök ${attempt}/12)" >&2
    sleep 10
  done
  echo "FEL: hittade ingen funktionsnyckel. Kör om skriptet om en stund." >&2
  exit 1
}

connect_staging() {
  local function_url="$1"
  local function_key="$2"

  if ! az containerapp show --name "${APP}" --resource-group "${RG}" --output none 2>/dev/null; then
    echo "   hittar ingen stagingapp som heter ${APP} i ${RG}, hoppar över kopplingen"
    return
  fi

  echo "-> kopplar funktionen till ${APP}: nyckeln som secret, adressen som variabel"
  az containerapp secret set \
    --name "${APP}" \
    --resource-group "${RG}" \
    --secrets "image-function-key=${function_key}" \
    --output none
  az containerapp update \
    --name "${APP}" \
    --resource-group "${RG}" \
    --container-name api \
    --set-env-vars \
      "IMAGE_FUNCTION_URL=${function_url}" \
      "IMAGE_FUNCTION_KEY=secretref:image-function-key" \
    --revision-suffix "fn-$(date +%H%M%S)" \
    --output none
}

echo "-> leverantörer och resursgrupp ${RG}"
ensure_provider Microsoft.Web
ensure_provider Microsoft.Storage
az group show --name "${RG}" --output none

echo "-> kontroll av Node ${NODE_VERSION} i ${LOC}"
check_node_version

echo "-> lagringskonto ${STORAGE_ACCOUNT}"
if ! az storage account show --name "${STORAGE_ACCOUNT}" --resource-group "${RG}" --output none 2>/dev/null; then
  az storage account create \
    --name "${STORAGE_ACCOUNT}" \
    --resource-group "${RG}" \
    --location "${LOC}" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access false \
    --min-tls-version TLS1_2 \
    --output none
fi

echo "-> function-app ${FUNCTION_APP} (Flex Consumption, Node ${NODE_VERSION}, ${INSTANCE_MEMORY} MB)"
if ! az functionapp show --name "${FUNCTION_APP}" --resource-group "${RG}" --output none 2>/dev/null; then
  az functionapp create \
    --name "${FUNCTION_APP}" \
    --resource-group "${RG}" \
    --storage-account "${STORAGE_ACCOUNT}" \
    --flexconsumption-location "${LOC}" \
    --runtime node \
    --runtime-version "${NODE_VERSION}" \
    --instance-memory "${INSTANCE_MEMORY}" \
    --maximum-instance-count "${MAX_INSTANCES}" \
    --output none
fi

echo "-> ett anrop i taget per instans (HTTP_CONCURRENCY=${HTTP_CONCURRENCY})"
az functionapp scale config set \
  --name "${FUNCTION_APP}" \
  --resource-group "${RG}" \
  --trigger-type http \
  --trigger-settings "perInstanceConcurrency=${HTTP_CONCURRENCY}" \
  --output none

WORK_DIR="$(mktemp -d)"
mkdir "${WORK_DIR}/package"
build_package "${WORK_DIR}/package"

echo "-> laddar upp koden"
az functionapp deployment source config-zip \
  --name "${FUNCTION_APP}" \
  --resource-group "${RG}" \
  --src "${WORK_DIR}/functions.zip" \
  --output none
rm -rf "${WORK_DIR}"

FUNCTION_KEY="$(read_function_key)"
HOST_NAME="$(az functionapp show \
  --name "${FUNCTION_APP}" \
  --resource-group "${RG}" \
  --query defaultHostName \
  --output tsv)"
FUNCTION_URL="https://${HOST_NAME}/api/process-image"

connect_staging "${FUNCTION_URL}" "${FUNCTION_KEY}"

echo
echo "Klart. Funktionens adress:"
echo "  ${FUNCTION_URL}"
echo
echo "Nyckeln visas bara här. Dela den inte och skriv den inte i någon fil i repot:"
echo "  ${FUNCTION_KEY}"
echo
echo "Kontroll (första anropet efter en paus är en kallstart):"
echo "  curl -s -X POST -H 'x-functions-key: <nyckeln>' -H 'Content-Type: image/jpeg' \\"
echo "    --data-binary @<bild.jpg> ${FUNCTION_URL}"
echo
echo "Till pipelinen (steg 5):"
echo "  gh variable set AZURE_FUNCTION_APP --env ${GH_ENV} --repo ${REPO} --body ${FUNCTION_APP}"

unset FUNCTION_KEY
