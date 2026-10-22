import html2pdf from 'html2pdf.js'
import { asBlob } from 'html-docx-js-typescript'

/**
 * 导出方案为 PDF
 * @param {string} htmlContent - 渲染后的 HTML 内容
 * @param {string} filename - 文件名（不含扩展名）
 */
export async function exportToPDF(htmlContent, filename = '活动策划方案') {
  const element = document.createElement('div')
  element.innerHTML = htmlContent

  element.style.padding = '20px'
  element.style.fontFamily = 'SimSun, STSong, serif'
  element.style.fontSize = '12pt'
  element.style.lineHeight = '1.6'
  element.style.color = '#000'

  const options = {
    margin: [15, 15, 15, 15],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  try {
    await html2pdf().from(element).set(options).save()
    return { success: true }
  } catch (error) {
    console.error('PDF 导出失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 导出方案为 Word
 * @param {string} htmlContent - 渲染后的 HTML 内容
 * @param {string} filename - 文件名（不含扩展名）
 */
export async function exportToWord(htmlContent, filename = '活动策划方案') {
  try {
    const styledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: '宋体', SimSun, serif; font-size: 12pt; line-height: 1.6; color: #000; }
    h1 { font-size: 18pt; font-weight: bold; margin: 20px 0 10px 0; }
    h2 { font-size: 16pt; font-weight: bold; margin: 18px 0 8px 0; }
    h3 { font-size: 14pt; font-weight: bold; margin: 16px 0 6px 0; }
    p { margin: 8px 0; }
    ul, ol { margin: 10px 0; padding-left: 30px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    strong { font-weight: bold; }
    em { font-style: italic; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`

    const blob = await asBlob(styledHtml)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    return { success: true }
  } catch (error) {
    console.error('Word 导出失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 导出方案为 Markdown
 * @param {string} markdownContent - Markdown 内容
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToMarkdown(markdownContent, filename = '活动策划方案') {
  try {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    return { success: true }
  } catch (error) {
    console.error('Markdown 导出失败:', error)
    return { success: false, error: error.message }
  }
}
