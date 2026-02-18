#!/bin/bash
# Inserts a new ***WORKING*** section above the latest release in README.md
# so new release notes can be collected for the next version.

VERSION=$(node -p "require('./package.json').version")

# Insert "***WORKING***\n\n" before the line that starts with the current version
sed -i '' "s/^v${VERSION} /***WORKING***\\
\\
v${VERSION} /" README.md

git add README.md
git commit -m "docs: prepare next release notes section"
git push

# Automatisch einen Pull Request auf main erstellen (nur wenn über Release-Workflow ausgeführt)
# Voraussetzung: GitHub CLI (gh) ist installiert und authentifiziert
if [[ "$npm_lifecycle_event" == release:* ]]; then
	BRANCH=$(git rev-parse --abbrev-ref HEAD)
	gh pr create --base main --head "$BRANCH" --title "Release v${VERSION}" --body "Automatischer Release-Pull-Request"
fi
