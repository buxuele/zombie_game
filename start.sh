#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

echo "正在检查项目依赖..."
if [ ! -d "node_modules" ]; then
  echo "首次运行，正在安装依赖包..."
  npm install
fi

echo "正在启动僵尸狂潮本地服务器..."
npx vite --open
