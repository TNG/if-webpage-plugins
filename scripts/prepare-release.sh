#!/bin/bash
set -e

# Usage: ./prepare-release.sh x.y.z

if [ -z "$1" ]; then
  echo "Usage: $0 <version-argument>"
  echo "Example: $0 1.0.8"
  exit 1
fi

VERSION_ARG=$1

# Validate version format (must be x.y.z)
if [[ ! $VERSION_ARG =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Error: Version must be in format x.y.z (e.g., 1.0.8)"
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_HASH=$(git rev-parse --short HEAD)

echo "Current branch: $CURRENT_BRANCH"
echo "Current commit: $CURRENT_HASH"
echo "You are about to release version: $VERSION_ARG"
read -p "Is this correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborting."
    exit 1
fi

# Check for clean working directory
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working directory is not clean. Please commit or stash changes."
  exit 1
fi

# Bump the version (updates package.json)
echo "Bumping version..."
pnpm version $VERSION_ARG -m "chore: release version %s" --sign-git-tag

echo "Pushing change and tag..."
git push --follow-tags
