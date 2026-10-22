# 本地环境安装说明（替代 Docker）

当 Docker 无法使用时，可以直接在 conda 环境中安装 MySQL、Redis 和 Milvus Lite。

## ✅ 已安装的组件

所有组件已安装到 conda 环境 `huodongcehua` 中：

- **MySQL 9.7.2** - 案例库存储
- **Redis 8.10.2** - 缓存服务
- **Milvus Lite 2.4.12** - 向量数据库（本地文件模式）
- **pymilvus 2.4.15** - Milvus Python 客户端

## 🚀 快速启动

### 1. 启动所有服务

```bash
conda activate huodongcehua
cd "/Users/weiyaqi/Downloads/vscode project/Agent-RAG-"
./start_local_services.sh
```

启动后会看到：
```
✅ 所有服务启动完成！
==========================================
MySQL: localhost:3306 (root/123456)
Redis: localhost:6379
Milvus: 本地文件模式 (./milvus_data.db)
==========================================
```

### 2. 启动后端

```bash
conda activate huodongcehua
cd "/Users/weiyaqi/Downloads/vscode project/Agent-RAG-"
uvicorn backend.api.app:app --port 8000 --reload
```

### 3. 启动前端

```bash
cd "/Users/weiyaqi/Downloads/vscode project/Agent-RAG-/frontend"
npm install  # 仅首次
npm run dev
```

访问 http://localhost:5173

## 🛑 停止服务

```bash
./stop_local_services.sh
```

或手动停止：
```bash
# 停止 MySQL
mysqladmin -u root -p123456 --socket=/tmp/mysql.sock shutdown

# 停止 Redis
redis-cli shutdown
```

## 📊 服务状态检查

```bash
# 检查 MySQL
lsof -i :3306

# 检查 Redis
lsof -i :6379

# 连接 MySQL
mysql -u root -p123456 --socket=/tmp/mysql.sock
```

## 📁 数据存储位置

- **MySQL 数据**: `/opt/miniconda3/envs/huodongcehua/var/mysql/`
- **Milvus 数据**: `./milvus_data.db`（项目根目录）
- **Redis 数据**: 内存（默认配置）

## ⚙️ 配置说明

### Milvus Lite 模式

默认使用 Milvus Lite（本地文件模式），数据存储在 `./milvus_data.db`。

如需切换回 Docker 模式，修改 `.env` 文件：
```bash
VECTOR_DB_URL=http://localhost:19530
MILVUS_LITE_ENABLED=false
```

### MySQL 配置

- 用户名: `root`
- 密码: `123456`
- 数据库: `event_planner`
- Socket: `/tmp/mysql.sock`
- 端口: `3306`

### Redis 配置

- 端口: `6379`
- 无密码（本地模式）

## 🔧 常见问题

### MySQL 启动失败

```bash
# 检查端口占用
lsof -i :3306

# 清理 socket 文件
rm -f /tmp/mysql.sock

# 重新启动
./start_local_services.sh
```

### Redis 启动失败

```bash
# 检查端口占用
lsof -i :6379

# 手动启动
redis-server --daemonize yes --port 6379
```

### Milvus Lite 问题

Milvus Lite 是嵌入式数据库，无需单独启动。如果向量检索失败：

```bash
# 删除数据文件重建
rm -f milvus_data.db
```

## 📝 与 Docker 模式的区别

| 特性 | Docker 模式 | 本地模式 |
|------|------------|---------|
| MySQL | Docker 容器 | conda 安装 |
| Redis | Docker 容器 | conda 安装 |
| Milvus | Docker 容器 (standalone) | Milvus Lite (本地文件) |
| 数据持久化 | Docker volume | 本地文件系统 |
| 启动命令 | `docker compose up -d` | `./start_local_services.sh` |
| 性能 | 容器化开销 | 原生性能 |

## 🎯 验证安装

```bash
# 1. 检查 conda 环境
conda activate huodongcehua

# 2. 检查 MySQL
mysql -u root -p123456 --socket=/tmp/mysql.sock -e "SELECT VERSION();"

# 3. 检查 Redis
redis-cli ping

# 4. 检查 Milvus Lite
python -c "from pymilvus import MilvusClient; client = MilvusClient(uri='./milvus_data.db'); print('Milvus Lite OK')"
```

## 💡 提示

- 本地模式更适合开发和测试环境
- 生产环境建议使用 Docker 或独立数据库服务器
- Milvus Lite 适合小规模数据（< 100 万向量）
- 数据备份：定期复制 `milvus_data.db` 和 MySQL 数据目录
