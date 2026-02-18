#!/bin/bash
# Synchronisiert die Version aus package.json in src/lib/version.ts
VERSION=$(node -p "require('./package.json').version")
echo "// This file is auto-generated. Do not edit manually." > src/lib/version.ts
echo "export const APP_VERSION = \"$VERSION\";" >> src/lib/version.ts
