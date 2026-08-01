#!/usr/bin/env bash
# Regenerate bundle.js — every piece concatenated into one file for the easy drop-in
# case. Order matters: theme + frame first, then the pieces. Run after editing any part.
set -e
cd "$(dirname "$0")"
cat theme.js utilbar.js utilbar-colour.js utilbar-language.js utilbar-search.js utilbar-status.js utilbar-signin.js > bundle.js
echo "bundle.js -> $(wc -l < bundle.js | tr -d ' ') lines"
