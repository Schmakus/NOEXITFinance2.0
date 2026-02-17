#!/bin/bash
# Replaces ***WORKING*** in README.md with the current version and date
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +"%d.%m.%Y")
sed -i '' "s/\*\*\*WORKING\*\*\*/v${VERSION} (${DATE})/" README.md
git add README.md
