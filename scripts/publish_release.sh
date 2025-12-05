#!/usr/bin/env bash

set -euf -o pipefail

if [[ $# -ne 1 ]]; then
  echo "Wrong number of arguments! Access token required."
  exit 2
fi

# publishing requires an NPM access token, that is stored in an
# environment variable with the same name as the one required in .npmrc
NPM_ACCESS_TOKEN="$1"
VERSION=$(pnpm pkg get version | jq -r)

# for prettier printing
VIOLET='\033[0;35m'
NC='\033[0m'

echo -e "${VIOLET}Starting release process for if-webpage-plugins version "${VERSION}" to NPM${NC}"

echo -e "\n${VIOLET}Installing package${NC}"
pnpm install --frozen-lockfile

echo -e "\n${VIOLET}Running tests${NC}"
pnpm run test

echo -e "${VIOLET}Building package${NC}"
pnpm run build

echo -e "\n${VIOLET}Building successful${NC}"

echo -e "\n${VIOLET}Create version tag${NC}"
git tag -a "v${VERSION}" -m "Release version ${VERSION}"
git push --tags

echo -e "\n${VIOLET}Configuring NPM authentication${NC}"
# Create a temporary .npmrc file in the current directory
echo "//registry.npmjs.org/:_authToken=${NPM_ACCESS_TOKEN}" > .npmrc

echo -e "\n${VIOLET}Publishing package${NC}"
# --no-git-checks is used because we are often in a detached HEAD state in CI
pnpm publish --access public --no-git-checks

rm .npmrc

echo -e "\n${VIOLET}Publishing successful${NC}"
