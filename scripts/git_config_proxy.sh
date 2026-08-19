#!/usr/bin/env bash
set -e

DEFAULT_PORT="7897"
ACTION="${1:-check}"
PORT="${2:-$DEFAULT_PORT}"

echo "=== Git 网络代理配置工具 ==="

if [ "$ACTION" = "set" ]; then
  PROXY="http://127.0.0.1:$PORT"
  git config --global http.https://github.com.proxy "$PROXY"
  git config --global https.https://github.com.proxy "$PROXY"
  echo "已成功设置 GitHub 全局代理为: $PROXY"
elif [ "$ACTION" = "unset" ]; then
  git config --global --unset http.https://github.com.proxy 2>/dev/null || true
  git config --global --unset https.https://github.com.proxy 2>/dev/null || true
  git config --unset http.https://github.com.proxy 2>/dev/null || true
  git config --unset https.https://github.com.proxy 2>/dev/null || true
  echo "已清除 Git 代理配置"
elif [ "$ACTION" = "check" ]; then
  GLOBAL_HTTP=$(git config --global --get http.https://github.com.proxy || echo "未配置")
  GLOBAL_HTTPS=$(git config --global --get https.https://github.com.proxy || echo "未配置")
  LOCAL_HTTP=$(git config --get http.https://github.com.proxy || echo "未配置")
  
  echo "全局 GitHub HTTP 代理: $GLOBAL_HTTP"
  echo "全局 GitHub HTTPS 代理: $GLOBAL_HTTPS"
  echo "当前仓库 HTTP 代理: $LOCAL_HTTP"
else
  echo "使用方法:"
  echo "  $0 set [端口号, 默认 7897]  : 设置代理"
  echo "  $0 unset                   : 清除代理"
  echo "  $0 check                   : 检查代理状态"
fi
