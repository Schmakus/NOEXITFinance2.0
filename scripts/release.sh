#!/bin/bash

# Abbruch bei Fehlern
set -e

TYPE=$1 # patch, minor, oder major

if [[ ! "$TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: npm run release:[patch|minor|major]"
  exit 1
fi

echo "🚀 Starte $TYPE Release..."

# 1. Sicherstellen, dass wir auf dev sind und alles aktuell ist
git checkout dev
git pull origin dev

# 2. Version in package.json erhöhen (erstellt automatisch einen Commit und Tag)
# Wir nutzen --no-git-tag-version, um den Tag erst nach dem Merge auf main zu setzen
npm version $TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

# 3. Version in den Code schreiben (falls dein Script existiert)
if [ -f "./scripts/update-version-ts.sh" ]; then
  bash ./scripts/update-version-ts.sh $NEW_VERSION
fi

git add package.json package-lock.json src/lib/version.ts
git commit -m "chore: release v$NEW_VERSION"

# 4. Dev hochschieben
git push origin dev

# 5. In main mergen
echo "🔄 Merging dev into main..."
git checkout main
git pull origin main
git merge dev --no-edit

# 6. Tag setzen und alles pushen
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main --tags

# NEU: Erstelle ein echtes GitHub Release (das triggert die Actions zuverlässig)
echo "🎁 Erstelle GitHub Release..."
gh release create "v$NEW_VERSION" --title "Release v$NEW_VERSION" --notes "Automatisches Release v$NEW_VERSION"

# 7. Zurück zu dev
git checkout dev

echo "✅ Release v$NEW_VERSION erfolgreich veröffentlicht!"