#!/usr/bin/env bash

# This script bumps the version in the package.json.
# Arguments:
#   $1: (required) version to bump to in the format vX.Y.Z
#   $2: (optional) branch name to create a commit on. If not provided, no commit is created.

set -euf -o pipefail

# for prettier printing
VIOLET='\033[0;35m'
NC='\033[0m'

echo -e "${VIOLET}Starting to bump version. Parsing arguments.${NC}"

if [[ $# -eq 1 ]]; then
  CREATE_COMMIT="false"
  echo "No branch name provided. Won't create a commit."
elif [[ $# -eq 2 ]]; then
  BRANCH=$2
  CREATE_COMMIT="true"
  echo "Branch name provided. Creating a commit."
else
  echo "Wrong number of arguments!"
  exit 2
fi

VERSION_FORMAT='^v([0-9]+\.){2}([0-9]+)$'
if [[ ! $1 =~ $VERSION_FORMAT ]]; then
  echo "Invalid version format! Version should be in format vX.Y.Z"
  exit 22
fi

VERSION=$1
SCRIPT_LOCATION=$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")
PACKAGE_JSON="${SCRIPT_LOCATION}/../package.json"
PACKAGE_LOCK="${SCRIPT_LOCATION}/../package-lock.json"

echo -e "${VIOLET}Bump version to ${VERSION}.${NC}"

jq ".version = \"${VERSION}\"" "${PACKAGE_JSON}" > "${PACKAGE_JSON}.tmp"
mv "${PACKAGE_JSON}.tmp" "${PACKAGE_JSON}"
rm -f "${PACKAGE_JSON}.tmp"

echo
echo -e "${VIOLET}Install to update package lock file${NC}"
npm install

echo

if [[ "${CREATE_COMMIT}" == "true" ]]; then
  echo -e "${VIOLET}Creating a commit${NC}"

  git switch -c "${BRANCH}"
  git add "${PACKAGE_JSON}"
  git add "${PACKAGE_LOCK}"
  git commit -s -m "Automatic commit: Bump version to ${VERSION}"

  echo
  echo -e "${VIOLET}Successfully created commit on branch ${BRANCH}${NC}"
else
  echo -e "${VIOLET}Skipping commit creation. Done${NC}"
fi
