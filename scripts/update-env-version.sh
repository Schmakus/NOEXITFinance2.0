#!/bin/bash
# Synchronisiert die Version aus package.json in die .env-Datei
VERSION=$(node -p "require('./package.json').version")
if grep -q '^VITE_APP_VERSION=' .env; then
  sed -i '' "s/^VITE_APP_VERSION=.*/VITE_APP_VERSION=$VERSION/" .env
else
  echo "VITE_APP_VERSION=$VERSION" >> .env
fi
