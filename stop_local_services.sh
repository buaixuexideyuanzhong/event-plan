#!/bin/bash
# 停止本地服务

echo "🛑 停止本地服务..."

# 停止 MySQL
echo "📦 停止 MySQL..."
mysqladmin -u root -p123456 --socket=/tmp/mysql.sock shutdown 2>/dev/null || echo "MySQL 未运行或已停止"

# 停止 Redis
echo "📦 停止 Redis..."
redis-cli shutdown 2>/dev/null || echo "Redis 未运行或已停止"

echo ""
echo "✅ 所有服务已停止"
