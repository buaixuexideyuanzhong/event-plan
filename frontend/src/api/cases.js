import { httpGet, httpPost } from './http'

// 保存案例
export function saveCase({ plan_text, metadata }) {
  return httpPost('/cases', { plan_text, metadata: metadata || {} })
}

// 获取案例列表
export function listCases(limit = 50) {
  return httpGet(`/cases?limit=${limit}`)
}

// 删除案例
export async function deleteCase(caseId) {
  const resp = await fetch(`/api/v1/cases/${encodeURIComponent(caseId)}`, {
    method: 'DELETE',
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`删除失败: ${resp.status} ${text}`)
  }
  return resp.json()
}
