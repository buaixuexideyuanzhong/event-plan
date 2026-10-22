<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import HealthBadge from '../components/HealthBadge.vue'
import PlanningInput from '../components/PlanningInput.vue'
import PlanViewer from '../components/PlanViewer.vue'
import LogPanel from '../components/LogPanel.vue'
import ToastHost from '../components/ToastHost.vue'
import { usePlanner } from '../composables/usePlanner'
import { useHealth } from '../composables/useHealth'
import { useToast } from '../composables/useToast'
import { saveCase, listCases } from '../api/cases'
import { pickMeta, clipId } from '../utils/format'
import { INPUT_MAX_LENGTH } from '../constants'

const planner = usePlanner()
const { status: plannerStatus, isStreaming, planText, result, errorMsg } = planner
const { status: healthStatus, health: healthData, refresh: refreshHealth } = useHealth()
const { toasts, toast, dismiss } = useToast()

import { useRouter } from 'vue-router'
const router = useRouter()
const requestText = ref('')
const saving = ref(false)

// 统计数据
const stats = ref({
  totalCases: 0,
  recentTypes: [],
})

async function loadStats() {
  try {
    const data = await listCases(100)
    const cases = data.cases || []
    stats.value.totalCases = cases.length
    
    // 统计活动类型
    const typeCount = {}
    cases.forEach(c => {
      const t = c.activity_type || '未分类'
      typeCount[t] = (typeCount[t] || 0) + 1
    })
    stats.value.recentTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  } catch (e) {
    // 静默失败
  }
}

function goToChat() {
  router.push('/chat')
}

function goToCases() {
  router.push('/cases')
}

async function onSubmit(text) {
  await planner.start(text)
}

async function onSave() {
  const res = result.value
  if (!res?.success || !res?.plan) return
  saving.value = true
  try {
    const meta = pickMeta(res.requirements)
    const { case_id } = await saveCase({ plan_text: res.plan, metadata: meta })
    toast('success', `已保存到案例库：${clipId(case_id)}`)
    await loadStats() // 刷新统计
  } catch (e) {
    toast('error', `保存失败：${e?.message || e}`)
  } finally {
    saving.value = false
  }
}

function onNotify({ type, message }) {
  toast(type, message)
}

onMounted(loadStats)
onBeforeUnmount(() => planner.cancel())
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="app-title">
        <span class="app-logo">🎉</span>
        <div>
          <h1>活动策划多智能体系统</h1>
          <p class="app-subtitle">需求提取 → 场地 / 商家 / 流程并行搜索 → 方案整合</p>
        </div>
      </div>
      <div class="header-actions">
        <HealthBadge :status="healthStatus" :health="healthData" @refresh="refreshHealth" />
        <button class="nav-cases" @click="goToChat">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span class="nav-label">多轮对话</span>
          <span class="nav-arrow">→</span>
        </button>
        <button class="nav-cases" @click="goToCases">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </span>
          <span class="nav-label">案例库</span>
          <span v-if="stats.totalCases > 0" class="nav-badge">{{ stats.totalCases }}</span>
          <span class="nav-arrow">→</span>
        </button>
      </div>
    </header>

    <main class="app-main">
      <PlanningInput
        v-model="requestText"
        :disabled="isStreaming"
        :max-length="INPUT_MAX_LENGTH"
        :api-key-set="healthData?.api_key_set"
        @submit="onSubmit"
        @cancel="planner.cancel"
      />

      <!-- 数据统计面板 -->
      <div v-if="stats.totalCases > 0" class="stats-panel">
        <div class="stats-card">
          <div class="stats-icon">📚</div>
          <div class="stats-info">
            <div class="stats-number">{{ stats.totalCases }}</div>
            <div class="stats-label">案例总数</div>
          </div>
        </div>
        <div class="stats-card" v-for="type in stats.recentTypes" :key="type.name">
          <div class="stats-icon">🏷️</div>
          <div class="stats-info">
            <div class="stats-number">{{ type.count }}</div>
            <div class="stats-label">{{ type.name }}</div>
          </div>
        </div>
        <button class="stats-more" @click="goToCases">查看全部 →</button>
      </div>

      <div class="app-columns">
        <PlanViewer
          :status="plannerStatus"
          :plan="planText"
          :result="result"
          :error="errorMsg"
          :saving="saving"
          @save="onSave"
          @notify="onNotify"
        />
        <LogPanel
          :messages="result?.messages || []"
          :errors="result?.errors || []"
          :running="isStreaming"
        />
      </div>
    </main>

    <ToastHost :toasts="toasts" @dismiss="dismiss" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-cases {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-cases::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.08), transparent);
  transition: left 0.5s;
}

.nav-cases:hover::before {
  left: 100%;
}

.nav-cases:hover {
  border-color: #3b82f6;
  color: #1e40af;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.nav-icon {
  display: flex;
  align-items: center;
  color: #3b82f6;
}

.nav-label {
  letter-spacing: 0.3px;
}

.nav-badge {
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.nav-arrow {
  font-size: 16px;
  transition: transform 0.2s;
  opacity: 0.6;
}

.nav-cases:hover .nav-arrow {
  transform: translateX(3px);
  opacity: 1;
}

/* 统计面板 */
.stats-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin: 16px 0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  min-width: 120px;
  flex-shrink: 0;
}

.stats-icon {
  font-size: 20px;
}

.stats-number {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.stats-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.stats-more {
  margin-left: auto;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.stats-more:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
</style>
