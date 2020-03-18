#!/bin/bash
node_modules/.bin/ncc build src/index.js
git commit -a -m ":wrench: Add build"