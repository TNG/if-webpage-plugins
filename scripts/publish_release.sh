#!/usr/bin/env bash

set -euf -o pipefail

if [[ $# -ne 1 ]]; then
  echo "Wrong number of arguments! Access token required."
  exit 2
fi

# publishing requires an NPM access token, that is stored in an
# environment variable with the same name as the one required in .npmrc
NPM_ACCESS_TOKEN=$1
VERSION=$(npm pkg get version)

# for prettier printing
VIOLET='\033[0;35m'
NC='\033[0m'

echo -e "${VIOLET}Starting release process for if-webpage-plugins version "${VERSION}" to NPM${NC}"

echo -e "\n${VIOLET}Installing package${NC}"
npm install

echo -e "\n${VIOLET}Running tests${NC}"
npm run test

echo -e "${VIOLET}Building package${NC}"
npm run build

echo -e "\n${VIOLET}Building successful${NC}"

echo -e "\n${VIOLET}Create version tag${NC}"
git tag -a ${VERSION} -m "Release version ${VERSION}"
git push --tags

echo -e "\n${VIOLET}Publishing package${NC}"
# npm publish --access public

echo -e "\n${VIOLET}Publishing successful${NC}"
