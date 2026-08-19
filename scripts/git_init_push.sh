#!/usr/bin/env bash
set -e

GITHUB_USER="buxuele"
GITHUB_EMAIL="baogebuxuele@163.com"
PROXY_URL="http://127.0.0.1:7897"
DEFAULT_BRANCH="main"

echo "=== GitHub 项目一键初始化与推送工具 ==="

REPO_NAME=$(basename "$PWD")
if [ -n "$1" ]; then
  REPO_NAME="$1"
fi

echo "当前项目目录: $PWD"
echo "目标仓库名称: $REPO_NAME"

TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  if [ -n "$2" ]; then
    TOKEN="$2"
  else
    printf "请输入 GitHub Personal Access Token: "
    read -r TOKEN
  fi
fi

if [ -z "$TOKEN" ]; then
  echo "错误: 未提供 GitHub Token, 操作终止"
  exit 1
fi

git config user.name "$GITHUB_USER"
git config user.email "$GITHUB_EMAIL"

if [ -n "$PROXY_URL" ]; then
  git config http.https://github.com.proxy "$PROXY_URL"
  git config https.https://github.com.proxy "$PROXY_URL"
  echo "已配置 GitHub 代理: $PROXY_URL"
fi

if [ ! -d ".git" ]; then
  echo "初始化本地 Git 仓库..."
  git init -b "$DEFAULT_BRANCH"
fi

if [ ! -f ".gitignore" ]; then
  echo "生成基础 .gitignore 文件..."
  cat << 'EOF' > .gitignore
node_modules/
dist/
.DS_Store
*.log
.env
.env.local
EOF
fi

echo "检查或在 GitHub 创建远程仓库: $REPO_NAME ..."
CREATE_RES=$(curl -s -x "$PROXY_URL" -H "Authorization: token $TOKEN" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":false}" \
  https://api.github.com/user/repos)

REPO_CHECK=$(echo "$CREATE_RES" | grep -o '"full_name":' || true)
if [ -n "$REPO_CHECK" ]; then
  echo "GitHub 远程仓库准备就绪: $GITHUB_USER/$REPO_NAME"
else
  echo "远程仓库可能已存在或无需创建, 继续执行推送"
fi

git add .
if git diff --staged --quiet; then
  echo "工作区暂无新变动需要提交"
else
  COMMIT_MSG="feat: initial project release"
  git commit -m "$COMMIT_MSG"
  echo "已完成初始代码提交"
fi

REMOTE_URL="https://${GITHUB_USER}:${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
if git remote | grep -q "^origin$"; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "正在推送到 GitHub $DEFAULT_BRANCH 分支..."
git branch -M "$DEFAULT_BRANCH"
git push -u origin "$DEFAULT_BRANCH"

echo "=== 推送成功! ==="
echo "项目主页: https://github.com/${GITHUB_USER}/${REPO_NAME}"
