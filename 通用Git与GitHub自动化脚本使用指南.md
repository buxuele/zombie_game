# 通用 Git 与 GitHub 自动化脚本使用指南

本文档提供一套完全通用的 Bash 自动化脚本集，适用于任何前端、后端、Python、移动端等各类本地项目与 GitHub 的快速交互。脚本均存放于 scripts 目录下，也可以复制到系统任意目录作为全局工具使用。

# 脚本清单与功能说明

1. 新项目一键初始化与远端创建推送脚本：[scripts/git_init_push.sh](file:///Users/fanchuang/Documents/zombie_game/scripts/git_init_push.sh)
- 功能：自动检测并初始化本地 Git 仓库，自动生成标准 .gitignore，通过 GitHub API 自动创建远程仓库，自动绑定代理与远程分支，全量提交并推送到 GitHub。

2. 日常一键代码拉取、暂存、提交与推送脚本：[scripts/git_quick_sync.sh](file:///Users/fanchuang/Documents/zombie_game/scripts/git_quick_sync.sh)
- 功能：自动拉取远端变更，自动检测本地变动文件，支持传入自定义提交日志或使用精确时间戳日志，一键推送至远程对应分支。

3. 网络代理与检测切换脚本：[scripts/git_config_proxy.sh](file:///Users/fanchuang/Documents/zombie_game/scripts/git_config_proxy.sh)
- 功能：针对科学上网代理端口例如 7897 或 7899 进行一键设置、解除与状态检测。

# 详细使用步骤

1. 新建项目并首次推送到 GitHub：
- 步骤一：在任何项目根目录下打开终端。
- 步骤二：运行如下命令，传入仓库名称与 Token：
./scripts/git_init_push.sh 你的项目名 你的Token
- 步骤三：若不带参数直接运行 ./scripts/git_init_push.sh，脚本将自动采用当前文件夹名作为仓库名，并在终端提示输入 Token。

2. 日常开发一键同步与更新代码：
- 步骤一：在修改代码后，在项目目录下运行：
./scripts/git_quick_sync.sh feat: 完成新功能开发
- 步骤二：如果不输入提交说明，直接运行 ./scripts/git_quick_sync.sh，脚本将自动附带当前精确时间戳进行自动提交与推送。

3. 网络代理管理：
- 设置代理端口为 7897：
./scripts/git_config_proxy.sh set 7897
- 检查当前代理状态：
./scripts/git_config_proxy.sh check
- 清除代理配置：
./scripts/git_config_proxy.sh unset

# 环境变量一键免密配置

如果希望在全电脑任何目录下使用脚本时都免去重复输入 Token，可在系统的 ~/.zshrc 或 ~/.bashrc 文件中加入如下环境变量：

export GITHUB_TOKEN=你的PersonalAccessToken

生效后，所有自动化脚本将全自动读取该变量完成一键操作。
