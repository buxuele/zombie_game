#!/bin/bash
# 双击本文件即可启动 僵尸游戏
cd "$(dirname "$0")" || exit 1
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

# node 兜底：node 缺失或失效时直接指向 nvm 里最新的版本
node_status="$( { node -v >/dev/null 2>&1; echo $?; } 2>/dev/null )"
if [ "$node_status" != "0" ]; then
  nvm_root="$HOME/.nvm/versions/node"
  newest_node="$(ls -1 "$nvm_root" 2>/dev/null | sort -V | tail -1)"
  if [ -n "$newest_node" ] && [ -x "$nvm_root/$newest_node/bin/node" ]; then
    export PATH="$nvm_root/$newest_node/bin:$PATH"
  fi
fi

APP_NAME="僵尸游戏"
OPEN_URL=""

clear
echo ""
echo "  $APP_NAME 启动中"
echo "  停止服务：在此窗口按 Ctrl+C"
echo ""

if [ -n "$OPEN_URL" ] && curl --noproxy '*' -s -o /dev/null --max-time 2 "$OPEN_URL"; then
  open "$OPEN_URL" >/dev/null 2>&1
  echo "  $APP_NAME 已在运行，已直接打开浏览器"
  trap '' INT
  read -r -p "  按回车键关闭窗口"
  exit 0
fi

watcher_pid=""
if [ -n "$OPEN_URL" ]; then
  (
    for _ in $(seq 1 120); do
      if curl --noproxy '*' -s -o /dev/null --max-time 1 "$OPEN_URL"; then
        open "$OPEN_URL" >/dev/null 2>&1
        break
      fi
      sleep 0.5
    done
  ) &
  watcher_pid=$!
fi

bash ./just_run.sh
status=$?

if [ -n "$watcher_pid" ]; then
  kill "$watcher_pid" 2>/dev/null || true
fi

echo ""
if [ "$status" -eq 0 ]; then
  echo "  $APP_NAME 已结束"
else
  echo "  $APP_NAME 异常退出，错误码 $status"
  echo "  请查看上方终端输出排查"
fi

trap '' INT
read -r -p "  按回车键关闭窗口"
exit "$status"
