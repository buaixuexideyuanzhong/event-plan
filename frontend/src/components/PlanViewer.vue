<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { renderPlan } from '../utils/markdown'
import { formatBudget } from '../utils/format'
import { exportToPDF, exportToWord, exportToMarkdown } from '../utils/export'

const props = defineProps({
  status: { type: String, default: 'idle' },
  plan: { type: String, default: '' },
  result: { type: Object, default: null },
  error: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save', 'notify'])

const viewport = ref(null)
const html = ref('')
const tail = ref('')
const stickyBottom = ref(true)
const exporting = ref(false)
const showExportMenu = ref(false)
let rafId = null

const hasPlan = computed(() => !!props.plan)
const canSave = computed(
  () => props.status === 'done' && props.result?.success && !!props.plan && !props.saving
)
const canExport = computed(
  () => props.status === 'done' && props.result?.success && !!props.plan && !exporting.value
)

const chips = computed(() => {
  const r = props.result?.requirements
  if (!r) return []
  const list = []
  if (r.activity_type) list.push(r.activity_type)
  if (r.theme) list.push(r.theme)
  if (r.attendee_count != null) list.push(`${r.attendee_count}人`)
  if (r.budget != null) list.push(formatBudget(r.budget))
  if (r.city) list.push(r.city)
  if (r.preferred_area) list.push(r.preferred_area)
  if (r.time) list.push(r.time)
  if (r.duration) list.push(r.duration)
  return list
})

function renderNow() {
  const p = props.plan || ''
  const nl = p.lastIndexOf('\n')
  const complete = nl >= 0 ? p.slice(0, nl + 1) : ''
  tail.value = nl >= 0 ? p.slice(nl + 1) : p
  html.value = renderPlan(complete)
  if (stickyBottom.value) {
    nextTick(() => {
      const el = viewport.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }
}

watch(
  () => props.plan,
  () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(renderNow)
  },
  { immediate: true }
)

function onScroll() {
  const el = viewport.value
  if (!el) return
  stickyBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}

async function copy() {
  const text = props.result?.plan || props.plan
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    emit('notify', { type: 'success', message: '已复制到剪贴板' })
  } catch {
    emit('notify', { type: 'error', message: '复制失败，请手动选择复制' })
  }
}

function generateFilename() {
  const r = props.result?.requirements
  const parts = []
  if (r?.activity_type) parts.push(r.activity_type)
  if (r?.city) parts.push(r.city)
  if (r?.time) parts.push(r.time)
  if (parts.length > 0) {
    return `活动策划方案_${parts.join('_')}`
  }
  return '活动策划方案'
}

async function handleExportPDF() {
  if (!canExport.value) return
  showExportMenu.value = false
  exporting.value = true
  try {
    const filename = generateFilename()
    const result = await exportToPDF(html.value, filename)
    if (result.success) {
      emit('notify', { type: 'success', message: 'PDF 导出成功' })
    } else {
      emit('notify', { type: 'error', message: `导出失败: ${result.error}` })
    }
  } catch (error) {
    emit('notify', { type: 'error', message: `导出失败: ${error.message}` })
  } finally {
    exporting.value = false
  }
}

async function handleExportWord() {
  if (!canExport.value) return
  showExportMenu.value = false
  exporting.value = true
  try {
    const filename = generateFilename()
    const result = await exportToWord(html.value, filename)
    if (result.success) {
      emit('notify', { type: 'success', message: 'Word 导出成功' })
    } else {
      emit('notify', { type: 'error', message: `导出失败: ${result.error}` })
    }
  } catch (error) {
    emit('notify', { type: 'error', message: `导出失败: ${error.message}` })
  } finally {
    exporting.value = false
  }
}

function handleExportMarkdown() {
  if (!canExport.value) return
  showExportMenu.value = false
  try {
    const filename = generateFilename()
    const markdownContent = props.result?.plan || props.plan
    const result = exportToMarkdown(markdownContent, filename)
    if (result.success) {
      emit('notify', { type: 'success', message: 'Markdown 导出成功' })
    } else {
      emit('notify', { type: 'error', message: `导出失败: ${result.error}` })
    }
  } catch (error) {
    emit('notify', { type: 'error', message: `导出失败: ${error.message}` })
  }
}

function toggleExportMenu() {
  if (canExport.value) {
    showExportMenu.value = !showExportMenu.value
  }
}

function handleClickOutside(event) {
  const dropdown = event.target.closest('.export-dropdown')
  if (!dropdown) {
    showExportMenu.value = false
  }
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  document.removeEventListener('click', handleClickOutside)
})

if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
</script>

<template>
  <section class="plan-viewer card">
    <div class="viewer-header">
      <h2>策划方案</h2>
      <div class="viewer-actions">
        <span v-if="status === 'streaming'" class="streaming-indicator">生成中…</span>
        <button class="btn" :disabled="!hasPlan" @click="copy">复制</button>
        
        <!-- 导出按钮始终可见，但无方案时禁用 -->
        <div class="export-dropdown">
          <button 
            class="btn btn-export" 
            :disabled="!canExport"
            :class="{ 'btn-disabled': !canExport, 'btn-exporting': exporting }"
            @click.stop="toggleExportMenu"
          >
            <svg v-if="exporting" class="export-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {{ exporting ? '导出中...' : '导出 ▼' }}
          </button>
          <div class="export-menu" v-show="showExportMenu && canExport">
            <button @click="handleExportPDF" class="export-item">
              <span class="export-icon">📄</span>
              <span>导出 PDF</span>
            </button>
            <button @click="handleExportWord" class="export-item">
              <span class="export-icon">📝</span>
              <span>导出 Word</span>
            </button>
            <button @click="handleExportMarkdown" class="export-item">
              <span class="export-icon">📋</span>
              <span>导出 Markdown</span>
            </button>
          </div>
        </div>
        
        <button class="btn btn-primary" :disabled="!canSave" @click="emit('save')">
          {{ saving ? '保存中…' : '保存到案例库' }}
        </button>
      </div>
    </div>

    <div v-if="chips.length" class="req-chips">
      <span v-for="(c, i) in chips" :key="i" class="chip">{{ c }}</span>
    </div>

    <div ref="viewport" class="viewer-body" @scroll="onScroll">
      <div v-if="!plan && status === 'idle'" class="placeholder">
        填写需求后点击「开始策划」，方案将在此处实时生成
      </div>
      <div v-else-if="status === 'error'" class="error-box">❌ {{ error || '策划失败' }}</div>
      <template v-else-if="plan || status === 'streaming' || status === 'done'">
        <div class="md" v-html="html" />
        <span v-if="tail" class="md-tail">{{ tail }}</span>
        <span v-if="status === 'streaming'" class="caret" />
      </template>
    </div>

    <div class="details">
      <details v-if="result?.venue_info" class="detail-panel">
        <summary>🏢 场地信息</summary>
        <div class="detail-body" v-html="renderPlan(result.venue_info)" />
      </details>
      <details v-if="result?.supplier_info" class="detail-panel">
        <summary>🤝 商家资源</summary>
        <div class="detail-body" v-html="renderPlan(result.supplier_info)" />
      </details>
      <details v-if="result?.process_info" class="detail-panel">
        <summary>📋 流程参考</summary>
        <div class="detail-body" v-html="renderPlan(result.process_info)" />
      </details>
    </div>
  </section>
</template>

<style scoped>
.plan-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.viewer-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.viewer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.streaming-indicator {
  font-size: 13px;
  color: #6b7280;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #f5f5f5;
  color: #999;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.export-dropdown {
  position: relative;
  display: inline-block;
}

.btn-export {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-export:hover:not(:disabled) {
  background: #e8e8e8;
}

.btn-exporting {
  color: #3b82f6;
  border-color: #3b82f6;
}

.export-spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  z-index: 100;
  overflow: hidden;
}

.export-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background 0.2s;
}

.export-item:hover {
  background: #f5f5f5;
}

.export-icon {
  font-size: 16px;
}

.req-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.chip {
  padding: 4px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  font-size: 13px;
  color: #6b7280;
}

.viewer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.error-box {
  padding: 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
}

.md {
  line-height: 1.7;
  color: #374151;
}

.md-tail {
  color: #6b7280;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #3b82f6;
  animation: blink 1s infinite;
  vertical-align: middle;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.details {
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
}

.detail-panel {
  margin-bottom: 12px;
}

.detail-panel summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  padding: 8px 0;
  user-select: none;
}

.detail-panel summary:hover {
  color: #111827;
}

.detail-body {
  padding: 12px 0;
  line-height: 1.7;
  color: #6b7280;
}
</style>
