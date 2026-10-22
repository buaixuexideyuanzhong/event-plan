#!/bin/bash
# 完整启动脚本

CONDA_PREFIX="/opt/miniconda3/envs/huodongcehua"
PROJECT_ROOT="/Users/weiyaqi/Downloads/vscode project/Agent-RAG-"

echo "🚀 启动所有服务..."

# MySQL
echo "📦 启动 MySQL..."
$CONDA_PREFIX/bin/mysqld --datadir="$CONDA_PREFIX/var/mysql" --socket=/tmp/mysql.sock --port=3306 --user=$(whoami) &
MYSQL_PID=$!
echo "  MySQL PID: $MYSQL_PID"
sleep 3

# Redis
echo "📦 启动 Redis..."
$CONDA_PREFIX/bin/redis-server --daemonize yes --port 6379
echo "  ✅ Redis 已启动"

# 后端
echo "🚀 启动后端..."
cd "$PROJECT_ROOT"
$CONDA_PREFIX/bin/uvicorn backend.api.app:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"
sleep 2

# 前端
echo "🚀 启动前端..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"
sleep 3

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           🎉 所有服务已启动！                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "PID 信息："
echo "  MySQL: $MYSQL_PID"
echo "  后端: $BACKEND_PID"
echo "  前端: $FRONTEND_PID"
echo ""
echo "访问地址："
echo "  • 前端: http://127.0.0.1:5173/"
echo "  • 案例库: http://127.0.0.1:5173/cases"
echo "  • API: http://127.0.0.1:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待所有后台进程
wait
