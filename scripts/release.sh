#!/bin/bash
set -e

# Sicherstellen, dass wir auf dev sind
git checkout dev
git pull origin dev

# In main mergen und pushen
echo "🔄 Merging dev into main..."
git checkout main
git pull origin main
git merge dev --no-edit
git push origin main

# Zurück zu dev für die weitere Arbeit
git checkout dev

echo "✅ Alles nach GitHub geschoben. 'release-please' erstellt nun den PR in GitHub!"