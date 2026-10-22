"""
对话历史管理模块

使用 Redis 存储对话历史，支持：
- 创建对话
- 添加消息
- 获取历史
- 清理过期对话
"""
import json
import time
import uuid
from typing import List, Dict, Optional, Any
from ..core.config import Config

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class ConversationManager:
    """对话历史管理器（单例）"""
    
    _instance = None
    _redis = None
    _ttl = 86400 * 7  # 7 天过期
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if REDIS_AVAILABLE and Config.REDIS_ENABLED:
            try:
                self._redis = redis.from_url(Config.REDIS_URL, decode_responses=True)
            except Exception as e:
                print(f"Redis 连接失败，对话历史将使用内存存储：{e}")
                self._redis = None
                self._memory_store = {}
        else:
            self._redis = None
            self._memory_store = {}
    
    async def create_conversation(self, user_id: str = "default") -> str:
        """创建新对话，返回 conversation_id"""
        conv_id = str(uuid.uuid4())
        conversation = {
            "id": conv_id,
            "user_id": user_id,
            "created_at": time.time(),
            "messages": [],
            "current_plan": None
        }
        
        if self._redis:
            await self._redis.setex(
                f"conversation:{conv_id}",
                self._ttl,
                json.dumps(conversation, ensure_ascii=False)
            )
        else:
            self._memory_store[conv_id] = conversation
        
        return conv_id
    
    async def add_message(self, conv_id: str, role: str, content: str, metadata: Dict = None):
        """添加消息到对话"""
        message = {
            "role": role,  # user / assistant / system
            "content": content,
            "timestamp": time.time(),
            "metadata": metadata or {}
        }
        
        if self._redis:
            conv_data = await self._redis.get(f"conversation:{conv_id}")
            if conv_data:
                conversation = json.loads(conv_data)
                conversation["messages"].append(message)
                await self._redis.setex(
                    f"conversation:{conv_id}",
                    self._ttl,
                    json.dumps(conversation, ensure_ascii=False)
                )
        else:
            if conv_id in self._memory_store:
                self._memory_store[conv_id]["messages"].append(message)
    
    async def get_conversation(self, conv_id: str) -> Optional[Dict]:
        """获取对话历史"""
        if self._redis:
            conv_data = await self._redis.get(f"conversation:{conv_id}")
            if conv_data:
                return json.loads(conv_data)
        else:
            return self._memory_store.get(conv_id)
        return None
    
    async def get_messages(self, conv_id: str, limit: int = 50) -> List[Dict]:
        """获取最近 N 条消息"""
        conv = await self.get_conversation(conv_id)
        if conv:
            return conv["messages"][-limit:]
        return []
    
    async def update_current_plan(self, conv_id: str, plan: Dict):
        """更新当前方案"""
        if self._redis:
            conv_data = await self._redis.get(f"conversation:{conv_id}")
            if conv_data:
                conversation = json.loads(conv_data)
                conversation["current_plan"] = plan
                await self._redis.setex(
                    f"conversation:{conv_id}",
                    self._ttl,
                    json.dumps(conversation, ensure_ascii=False)
                )
        else:
            if conv_id in self._memory_store:
                self._memory_store[conv_id]["current_plan"] = plan
    
    async def delete_conversation(self, conv_id: str):
        """删除对话"""
        if self._redis:
            await self._redis.delete(f"conversation:{conv_id}")
        else:
            self._memory_store.pop(conv_id, None)


# 全局单例
conversation_manager = ConversationManager.get_instance()
