#!/usr/bin/env bash

# This script bumps the package version and creates a commit if a branch name is provided.
# Arguments:
#   $1: (required) version to bump to in the format X.Y.Z
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
  BRANCH="$2"
  CREATE_COMMIT="true"
  echo "Branch name provided. Creating a commit."
else
  echo "Wrong number of arguments!"
  exit 2
fi

VERSION_FORMAT='^([0-9]+\.){2}([0-9]+)$'
if [[ ! "$1" =~ $VERSION_FORMAT ]]; then
  echo "Invalid version format! Version should be in format X.Y.Z"
  exit 22
fi

VERSION="$1"

echo -e "${VIOLET}Bump version to ${VERSION}.${NC}"
pnpm version "${VERSION}" --no-git-tag-version

echo -e "\n${VIOLET}Install to update package lock file${NC}"
pnpm install --frozen-lockfile

if [[ "${CREATE_COMMIT}" == "true" ]]; then
  echo -e "\n${VIOLET}Creating a commit${NC}"

  git switch -c "${BRANCH}"
  git add .
  git commit -s -m "Automatic commit: Bump version to ${VERSION}"

  echo -e "\n${VIOLET}Successfully created commit on branch ${BRANCH}${NC}"
else
  echo -e "\n${VIOLET}Skipping commit creation. Done${NC}"
fi
