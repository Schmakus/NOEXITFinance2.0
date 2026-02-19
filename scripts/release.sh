#!/bin/bash
set -e
TYPE=$1

if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: npm run release:[patch|minor|major]"
  exit 1
fi

echo "🚀 Starte $TYPE Release..."

# 1. Update auf dev (Changelog & Version)
git checkout dev
git pull origin dev

# Erzeugt Changelog-Eintrag und updated package.json
npx standard-version --release-as $TYPE

NEW_VERSION=$(node -p "require('./package.json').version")

# 2. Optional: Eigene Version-Datei im Code updaten
if [ -f "./scripts/update-version-ts.sh" ]; then
  bash ./scripts/update-version-ts.sh $NEW_VERSION
  git add src/lib/version.ts
  git commit --amend --no-edit
fi

# 3. Dev hochschieben
git push origin dev

# 4. Merge nach main
echo "🔄 Merging into main..."
git checkout main
git pull origin main
git merge dev --no-edit

# 5. Alles hochschieben (inkl. Tags für das Deployment)
git push origin main --tags

# 6. Zurück auf dev für die weitere Arbeit
git checkout dev

echo "✅ Release v$NEW_VERSION erfolgreich! Changelog ist aktualisiert."