<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listCases, deleteCase } from '../api/cases'
import { renderPlan } from '../utils/markdown'
import { formatBudget, clipId } from '../utils/format'

const router = useRouter()
const cases = ref([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const selectedCase = ref(null)
const deleting = ref(false)
const batchMode = ref(false)
const selectedIds = ref(new Set())
const batchDeleting = ref(false)

async function loadCases() {
  loading.value = true
  error.value = ''
  try {
    const data = await listCases(200)
    cases.value = data.cases || []
  } catch (e) {
    error.value = `加载失败: ${e.message}`
  } finally {
    loading.value = false
  }
}

const filteredCases = computed(() => {
  if (!searchQuery.value) return cases.value
  const q = searchQuery.value.toLowerCase()
  return cases.value.filter(c => {
    const type = (c.activity_type || '').toLowerCase()
    const city = (c.city || '').toLowerCase()
    const theme = (c.theme || '').toLowerCase()
    const plan = (c.plan_text || '').toLowerCase()
    return type.includes(q) || city.includes(q) || theme.includes(q) || plan.includes(q)
  })
})

const allSelected = computed(() => {
  return filteredCases.value.length > 0 && filteredCases.value.every(c => selectedIds.value.has(c.id))
})

function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredCases.value.forEach(c => selectedIds.value.add(c.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    selectedIds.value.clear()
  }
}

function viewCase(caseItem) {
  if (batchMode.value) return
  selectedCase.value = caseItem
}

function closeDetail() {
  selectedCase.value = null
}

async function handleDelete(caseId) {
  if (!confirm('确定要删除这个案例吗？此操作不可恢复。')) return
  deleting.value = true
  try {
    await deleteCase(caseId)
    cases.value = cases.value.filter(c => c.id !== caseId)
    if (selectedCase.value?.id === caseId) {
      selectedCase.value = null
    }
  } catch (e) {
    alert(`删除失败: ${e.message}`)
  } finally {
    deleting.value = false
  }
}

async function handleBatchDelete() {
  const count = selectedIds.value.size
  if (count === 0) return
  if (!confirm(`确定要删除选中的 ${count} 个案例吗？此操作不可恢复。`)) return
  batchDeleting.value = true
  try {
    const idsToDelete = [...selectedIds.value]
    for (const id of idsToDelete) {
      await deleteCase(id)
    }
    cases.value = cases.value.filter(c => !selectedIds.value.has(c.id))
    selectedIds.value.clear()
    batchMode.value = false
    alert(`成功删除 ${count} 个案例`)
  } catch (e) {
    alert(`批量删除失败: ${e.message}`)
  } finally {
    batchDeleting.value = false
  }
}

function goHome() {
  router.push('/')
}

onMounted(loadCases)
</script>

<template>
  <div class="cases-page">
    <header class="page-header">
      <div class="header-container">
        <div class="header-left">
          <button class="btn-back" @click="goHome">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>返回</span>
          </button>
          <div class="header-title">
            <h1>案例库</h1>
            <p class="header-desc">探索成功策划方案，获取灵感与参考</p>
          </div>
        </div>
        <div class="header-right">
          <div class="search-box">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索活动类型、城市、主题..."
              class="search-input"
            />
          </div>
          <button class="btn-batch" :class="{ active: batchMode }" @click="toggleBatchMode">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>{{ batchMode ? '取消选择' : '批量管理' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 批量操作栏 -->
    <div v-if="batchMode" class="batch-bar">
      <label class="batch-select-all" @click.stop="toggleSelectAll">
        <input type="checkbox" :checked="allSelected" @click.stop="toggleSelectAll" />
        <span>全选</span>
      </label>
      <span class="batch-count">已选 {{ selectedIds.size }} 项</span>
      <button class="btn-batch-delete" :disabled="selectedIds.size === 0 || batchDeleting" @click.stop="handleBatchDelete">
        <svg v-if="batchDeleting" class="spinner-small" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>{{ batchDeleting ? '删除中...' : '删除选中' }}</span>
      </button>
    </div>

    <main class="page-main">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载案例中...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{{ error }}</p>
      </div>
      
      <div v-else-if="filteredCases.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p v-if="searchQuery">没有找到匹配的案例</p>
        <p v-else>案例库为空</p>
        <p class="empty-hint">策划活动并保存方案后，案例将显示在这里</p>
      </div>
      
      <div v-else class="cases-grid">
        <article v-for="caseItem in filteredCases" :key="caseItem.id" class="case-card" :class="{ selected: selectedIds.has(caseItem.id) }" @click="viewCase(caseItem)">
          <!-- 批量选择复选框 -->
          <div v-if="batchMode" class="card-checkbox" @click.stop="toggleSelect(caseItem.id)">
            <svg v-if="selectedIds.has(caseItem.id)" width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <polyline points="9 12 11 14 15 10" fill="none" stroke="white" stroke-width="2.5" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
          </div>

          <div class="card-header">
            <div class="card-tags">
              <span v-if="caseItem.activity_type" class="tag tag-type">
                {{ caseItem.activity_type }}
              </span>
              <span v-if="caseItem.city" class="tag tag-city">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {{ caseItem.city }}
              </span>
            </div>
            <div class="card-meta">
              <span v-if="caseItem.attendee_count" class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {{ caseItem.attendee_count }}人
              </span>
              <span v-if="caseItem.budget" class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                {{ formatBudget(caseItem.budget) }}
              </span>
            </div>
          </div>

          <div v-if="caseItem.theme" class="card-theme">{{ caseItem.theme }}</div>

          <div class="card-preview">
            {{ caseItem.plan_text.slice(0, 180) }}{{ caseItem.plan_text.length > 180 ? '...' : '' }}
          </div>

          <div class="card-footer">
            <div class="card-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {{ caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('zh-CN') : '' }}
            </div>
            <div class="card-actions">
              <button v-if="!batchMode" class="btn-view" @click.stop="viewCase(caseItem)">
                查看详情
              </button>
              <button v-if="!batchMode" class="btn-delete" :disabled="deleting" @click.stop="handleDelete(caseItem.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      </div>
    </main>

    <!-- 案例详情弹窗 -->
    <div v-if="selectedCase" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">
            <h2>{{ selectedCase.activity_type || '活动案例' }}</h2>
            <p v-if="selectedCase.theme">{{ selectedCase.theme }}</p>
          </div>
          <button class="btn-close" @click="closeDetail">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-meta">
            <div v-if="selectedCase.city" class="detail-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{{ selectedCase.city }}</span>
            </div>
            <div v-if="selectedCase.attendee_count" class="detail-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>{{ selectedCase.attendee_count }}人</span>
            </div>
            <div v-if="selectedCase.budget" class="detail-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>{{ formatBudget(selectedCase.budget) }}</span>
            </div>
          </div>
          <div class="detail-plan md" v-html="renderPlan(selectedCase.plan_text)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cases-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.header-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.header-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  max-width: 500px;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: #f8fafc;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-batch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-batch:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-batch.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* 批量操作栏 */
.batch-bar {
  max-width: 1400px;
  margin: 16px auto 0;
  padding: 12px 24px;
  background: white;
  border: 1.5px solid #3b82f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.batch-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #475569;
  user-select: none;
}

.batch-select-all input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.batch-count {
  font-size: 14px;
  color: #64748b;
  margin-left: 8px;
}

.btn-batch-delete {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-delete:hover:not(:disabled) {
  background: #dc2626;
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.page-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px 40px;
}

.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-state svg {
  color: #ef4444;
  margin-bottom: 16px;
}

.empty-state svg {
  color: #cbd5e1;
  margin-bottom: 16px;
}

.empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.case-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
}

.case-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.12);
  border-color: #cbd5e1;
}

.case-card.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.card-checkbox {
  position: absolute;
  top: 16px;
  right: 16px;
  cursor: pointer;
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.tag-type {
  background: #dbeafe;
  color: #1e40af;
}

.tag-city {
  background: #dcfce7;
  color: #166534;
}

.card-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-theme {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12px;
  line-height: 1.4;
}

.card-preview {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin-bottom: 20px;
  flex: 1;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.card-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #94a3b8;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-view {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-delete {
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 28px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.modal-title h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.modal-title p {
  margin: 0;
  font-size: 15px;
  color: #64748b;
}

.btn-close {
  padding: 8px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 32px;
  overflow-y: auto;
  flex: 1;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 28px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #475569;
  font-weight: 500;
}

.detail-item svg {
  color: #3b82f6;
}

.detail-plan {
  line-height: 1.8;
  color: #1e293b;
}
</style>
