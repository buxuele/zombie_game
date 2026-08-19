#!/usr/bin/env bash
set -e

PROXY_URL="http://127.0.0.1:7897"

echo "=== GitHub 一键代码快速同步与更新工具 ==="

if [ ! -d ".git" ]; then
  echo "错误: 当前目录不是 Git 仓库, 请先执行初始化脚本"
  exit 1
fi

if [ -n "$PROXY_URL" ]; then
  git config http.https://github.com.proxy "$PROXY_URL"
  git config https.https://github.com.proxy "$PROXY_URL"
fi

CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
fi

echo "当前工作分支: $CURRENT_BRANCH"

echo "检查远程更新..."
git pull --rebase origin "$CURRENT_BRANCH" 2>/dev/null || true

if [ -z "$(git status --porcelain)" ]; then
  echo "工作区很干净, 没有需要提交的修改"
  exit 0
fi

git status --short

COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  COMMIT_MSG="update: auto sync at $TIMESTAMP"
fi

git add .
git commit -m "$COMMIT_MSG"
echo "已完成本地提交: $COMMIT_MSG"

echo "正在推送至远程 GitHub $CURRENT_BRANCH 分支..."
git push origin "$CURRENT_BRANCH"

echo "=== 代码同步完成! ==="
