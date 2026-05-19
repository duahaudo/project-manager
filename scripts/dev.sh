#!/bin/bash
export PATH=/Users/dieuson/.nvm/versions/node/v22.21.1/bin:$PATH
export NODE=/Users/dieuson/.nvm/versions/node/v22.21.1/bin/node
exec node node_modules/next/dist/bin/next dev --webpack "$@"
