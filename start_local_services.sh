#!/bin/bash
# 本地服务启动脚本（替代 Docker）
# 启动 MySQL、Redis、Milvus Lite

set -e

echo "🚀 启动本地服务..."

# 激活 conda 环境
CONDA_PREFIX="/opt/miniconda3/envs/huodongcehua"

# ===== 启动 MySQL =====
echo "📦 启动 MySQL..."
MYSQL_DATADIR="$CONDA_PREFIX/var/mysql"
MYSQL_SOCKET="/tmp/mysql.sock"

# 检查是否已经在运行
if lsof -i :3306 > /dev/null 2>&1; then
    echo "✅ MySQL 已在运行"
else
    mysqld --datadir="$MYSQL_DATADIR" --socket="$MYSQL_SOCKET" --port=3306 --user=$(whoami) &
    MYSQL_PID=$!
    echo "⏳ 等待 MySQL 启动..."
    sleep 3
    
    # 检查是否启动成功
    if kill -0 $MYSQL_PID 2>/dev/null; then
        echo "✅ MySQL 启动成功 (PID: $MYSQL_PID)"
    else
        echo "❌ MySQL 启动失败"
        exit 1
    fi
fi

# 创建数据库（如果不存在）
echo "📋 检查数据库..."
mysql -u root --socket="$MYSQL_SOCKET" -e "CREATE DATABASE IF NOT EXISTS event_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -u root --socket="$MYSQL_SOCKET" -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';" 2>/dev/null || true
echo "✅ 数据库 event_planner 已就绪"

# ===== 启动 Redis =====
echo "📦 启动 Redis..."
if lsof -i :6379 > /dev/null 2>&1; then
    echo "✅ Redis 已在运行"
else
    redis-server --daemonize yes --port 6379
    echo "✅ Redis 启动成功"
fi

# ===== Milvus Lite =====
echo "📦 Milvus Lite 模式..."
echo "✅ Milvus Lite 将随后端自动启动（本地文件模式）"

echo ""
echo "=========================================="
echo "✅ 所有服务启动完成！"
echo "=========================================="
echo "MySQL: localhost:3306 (root/123456)"
echo "Redis: localhost:6379"
echo "Milvus: 本地文件模式 (./milvus_data.db)"
echo "=========================================="
echo ""
echo "停止服务命令："
echo "  mysqladmin -u root -p --socket=$MYSQL_SOCKET shutdown"
echo "  redis-cli shutdown"
echo ""
