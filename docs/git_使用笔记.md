# Git 与 GitHub 自动化操作全集笔记

本文档整合了项目开发中的 Git 全局配置、自动化脚本源码、标准忽略规则与终端执行指令。AI 工具读取本文档后，可直接在任意全新或已有项目中自主完成仓库初始化、远程仓库创建与代码推送。

# 核心默认配置参数

1. 用户名：buxuele
2. 用户邮箱：baogebuxuele@163.com
3. 默认分支：main
4. 本地代理地址：http://127.0.0.1:7897
5. 环境变量名称：GITHUB_TOKEN

# AI 工具自动化执行指南

AI 工具在接手新项目或新目录时，请按以下顺序全自动执行：

1. 检查当前工作区是否已有 .git 目录与 .gitignore 文件，若无则自动创建。
2. 读取环境变量 GITHUB_TOKEN 或用户提供的 Token，调用 GitHub API 接口自动创建远端仓库。
3. 自动配置本地仓库的 user.name 与 user.email，并设置代理地址。
4. 暂存所有工作区文件并完成初始提交。
5. 关联远程仓库地址并推送到 main 分支。
6. 在项目根目录生成极速同步脚本 gg.sh 并赋予执行权限。

# 自动化脚本源码全集

# 脚本一 新项目初始化与远程自动创建推送脚本

文件路径：scripts/git_init_push.sh

```bash
#!/usr/bin/env bash
set -e

GITHUB_USER='buxuele'
GITHUB_EMAIL='baogebuxuele@163.com'
PROXY_URL='http://127.0.0.1:7897'
DEFAULT_BRANCH='main'

echo '=== GitHub 项目一键初始化与推送工具 ==='

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
    printf '请输入 GitHub Personal Access Token: '
    read -r TOKEN
  fi
fi

if [ -z "$TOKEN" ]; then
  echo '错误: 未提供 GitHub Token, 操作终止'
  exit 1
fi

git config user.name "$GITHUB_USER"
git config user.email "$GITHUB_EMAIL"

if [ -n "$PROXY_URL" ]; then
  git config http.https://github.com.proxy "$PROXY_URL"
  git config https.https://github.com.proxy "$PROXY_URL"
  echo "已配置 GitHub 代理: $PROXY_URL"
fi

if [ ! -d '.git' ]; then
  echo '初始化本地 Git 仓库...'
  git init -b "$DEFAULT_BRANCH"
fi

if [ ! -f '.gitignore' ]; then
  echo '生成基础 .gitignore 文件...'
  cat << 'EOF' > .gitignore
node_modules/
dist/
.DS_Store
Thumbs.db
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
  echo '远程仓库可能已存在或无需创建, 继续执行推送'
fi

git add .
if git diff --staged --quiet; then
  echo '工作区暂无新变动需要提交'
else
  COMMIT_MSG='feat: initial project release'
  git commit -m "$COMMIT_MSG"
  echo '已完成初始代码提交'
fi

REMOTE_URL="https://${GITHUB_USER}:${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
if git remote | grep -q '^origin$'; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "正在推送到 GitHub $DEFAULT_BRANCH 分支..."
git branch -M "$DEFAULT_BRANCH"
git push -u origin "$DEFAULT_BRANCH"

echo '=== 推送成功 ==='
echo "项目主页: https://github.com/${GITHUB_USER}/${REPO_NAME}"
```

# 脚本二 根目录极速同步推送脚本

文件路径：gg.sh

```bash
#!/usr/bin/env bash
set -e

git branch -M main

git fetch origin || true

git status

git add .

if [ -n "$1" ]; then
  message="$1"
else
  printf 'Enter commit message: '
  read -r message
fi

if [ -z "$message" ]; then
  message="update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

if git diff --staged --quiet; then
  echo '工作区没有检测到文件修改，跳过提交'
else
  git commit -m "$message"
fi

git push origin main

git status

echo '代码已提交并推送完成'
```

# 脚本三 网络代理配置与切换脚本

文件路径：scripts/git_config_proxy.sh

```bash
#!/usr/bin/env bash
set -e

DEFAULT_PORT='7897'
ACTION="${1:-check}"
PORT="${2:-$DEFAULT_PORT}"

echo '=== Git 网络代理配置工具 ==='

if [ "$ACTION" = 'set' ]; then
  PROXY="http://127.0.0.1:$PORT"
  git config --global http.https://github.com.proxy "$PROXY"
  git config --global https.https://github.com.proxy "$PROXY"
  echo "已成功设置 GitHub 全局代理为: $PROXY"
elif [ "$ACTION" = 'unset' ]; then
  git config --global --unset http.https://github.com.proxy 2>/dev/null || true
  git config --global --unset https.https://github.com.proxy 2>/dev/null || true
  git config --unset http.https://github.com.proxy 2>/dev/null || true
  git config --unset https.https://github.com.proxy 2>/dev/null || true
  echo '已清除 Git 代理配置'
elif [ "$ACTION" = 'check' ]; then
  GLOBAL_HTTP=$(git config --global --get http.https://github.com.proxy || echo '未配置')
  GLOBAL_HTTPS=$(git config --global --get https.https://github.com.proxy || echo '未配置')
  LOCAL_HTTP=$(git config --get http.https://github.com.proxy || echo '未配置')
  
  echo "全局 GitHub HTTP 代理: $GLOBAL_HTTP"
  echo "全局 GitHub HTTPS 代理: $GLOBAL_HTTPS"
  echo "当前仓库 HTTP 代理: $LOCAL_HTTP"
else
  echo '使用方法:'
  echo '  $0 set 端口号 : 设置代理'
  echo '  $0 unset : 清除代理'
  echo '  $0 check : 检查代理状态'
fi
```

# 通用 .gitignore 配置文件模版

文件路径：.gitignore

```gitignore
# 依赖文件
node_modules/
package-lock.json
__pycache__/
*.pyc
venv/
.venv/

# 构建产物
dist/
build/
*.egg-info/

# 系统与缓存
.DS_Store
Thumbs.db
*.log
npm-debug.log*
yarn-debug.log*

# 环境与私密配置
.env
.env.local
.env.*.local
```

# 终端原生操作步骤与常用命令

# 1. 全新项目首次初始化并推送

在项目根目录下依次执行以下命令：

```bash
git init -b main
git config user.name buxuele
git config user.email baogebuxuele@163.com
git config http.https://github.com.proxy http://127.0.0.1:7897
git config https.https://github.com.proxy http://127.0.0.1:7897
git add .
git commit -m 'feat: initial project release'
git remote add origin https://buxuele:你的Token@github.com/buxuele/仓库名.git
git branch -M main
git push -u origin main
```

# 2. 已有远程仓库关联与拉取

在需要关联已有远程仓库的目录下执行：

```bash
git init -b main
git remote add origin https://buxuele:你的Token@github.com/buxuele/仓库名.git
git fetch origin
git branch --set-upstream-to=origin/main main
git pull origin main --allow-unrelated-histories
```

# 3. 日常单行极速提交与推送

日常修改代码后，可通过单行命令完成同步：

```bash
git add . && git commit -m 'update: 代码同步更新' && git push origin main
```

# 4. 代理与网络连通性排查

当推送出现超时或连接拒绝时，按以下步骤排查：

1. 检查当前配置的代理地址：
git config --get http.https://github.com.proxy

2. 设置代理端口为本地科学上网端口：
git config --global http.https://github.com.proxy http://127.0.0.1:7897
git config --global https.https://github.com.proxy http://127.0.0.1:7897

3. 清除代理配置：
git config --global --unset http.https://github.com.proxy
git config --global --unset https.https://github.com.proxy

4. 测试与 GitHub 的网络连接：
curl -I -x http://127.0.0.1:7897 https://github.com

# 5. 常见异常处理方案

1. 远程分支冲突需要强制对齐本地分支：
git push origin main --force

2. 撤销最近一次未推送的本地提交并保留修改：
git reset --soft HEAD~1

3. 放弃本地全部未提交的修改并恢复干净状态：
git reset --hard HEAD
git clean -fd

4. 修改远程仓库的推送地址：
git remote set-url origin https://buxuele:你的Token@github.com/buxuele/仓库名.git
