#!/usr/bin/env bash
set -euo pipefail

node --check front-end/shared/db.js
node --check front-end/shared/audit.js
node --check front-end/shared/errors.js
node --check front-end/medlux-control/app.js
node --check front-end/medlux-reflective-control/app.js

echo "Smoke test OK"
