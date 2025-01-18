#!/usr/bin/env bash

set -euf -o pipefail

if [[ $# -ne 1 ]]; then
  echo "Wrong number of arguments! Access token required."
  exit 2
fi

NPM_ACCESS_TOKEN=$1
VERSION=$(npm pkg get version)

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
git push --tags

echo
echo -e "${VIOLET}Publishing package${NC}"
# requires an access token, that is stored in an
# environment variable with the same name as the on required in .npmrc
# npm publish --access public

echo
echo -e "${VIOLET}Publishing successful${NC}"
