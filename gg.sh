#!/usr/bin/env bash
set -e

# 确保当前分支是 main
git branch -M main

# 获取远程仓库的最新信息
git fetch origin

# 显示当前的 Git 状态
git status

# 将当前目录下的所有更改添加到 Git 的暂存区
git add .

# 提示用户输入提交信息
if [ -n "$1" ]; then
  message="$1"
else
  printf "Enter commit message: "
  read -r message
fi

if [ -z "$message" ]; then
  message="update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 使用用户输入的提交信息来提交暂存区的更改
if git diff --staged --quiet; then
  echo "工作区没有检测到文件修改，跳过提交"
else
  git commit -m "$message"
fi

# 将本地的提交推送到远程仓库
git push origin main

# 显示执行 git push 后的 Git 状态
git status

# 提示操作完成
echo "代码已提交并推送完成！"
