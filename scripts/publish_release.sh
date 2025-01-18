#!/usr/bin/env bash

set -euf -o pipefail

if [[ $# -ne 2 ]]; then
  echo "Wrong number of arguments!"
  exit 2
fi

TOKEN=$1

SCRIPT_LOCATION=$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")
PACKAGE_JSON="${SCRIPT_LOCATION}/../package.json"
VERSION=$(jq -r '.version' ${PACKAGE_JSON})

# for prettier printing
VIOLET='\033[0;35m'
NC='\033[0m'

echo -e "${VIOLET}Starting release process for if-webpage-plugins version "${VERSION}" to NPM${NC}"

echo
echo -e "${VIOLET}Installing package${NC}"
npm install

echo
echo -e "${VIOLET}Running tests${NC}"
npm run test

echo
echo -e "${VIOLET}Building package${NC}"
npm run build

echo
echo -e "${VIOLET}Building successful${NC}"

echo
echo -e "${VIOLET}Create version tag${NC}"
git tag -a ${VERSION} -m "Release version ${VERSION}"
git push origin ${VERSION}

echo
echo -e "${VIOLET}Publishing package${NC}"
# npm publish --access public

echo
echo -e "${VIOLET}Publishing successful${NC}"
