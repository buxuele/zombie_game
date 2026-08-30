#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "首次运行，正在安装依赖包..."
  npm install
fi

npx vite --open
