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

if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ Error: Releases must be created from main (current branch: $CURRENT_BRANCH)."
  exit 1
fi

echo "Fetching origin/main..."
git fetch origin main

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)
if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  echo "❌ Error: local main is not up to date with origin/main."
  echo "   local:  $(git rev-parse --short "$LOCAL_HASH")"
  echo "   remote: $(git rev-parse --short "$REMOTE_HASH")"
  echo "   Fast-forward main and try again."
  exit 1
fi

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
pnpm version $VERSION_ARG -m "chore: bump version to %s" --sign-git-tag

echo "Pushing change and tag..."
git push origin main --follow-tags
