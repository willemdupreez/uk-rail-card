#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

bump="${1:-patch}"

npm version --no-git-tag-version "$bump"
npm run build
