<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

/* Markdown 渲染样式 */
.md h1, .md h2, .md h3, .md h4, .md h5, .md h6 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.md h1 { font-size: 1.8em; }
.md h2 { font-size: 1.5em; }
.md h3 { font-size: 1.3em; }

.md p {
  margin-bottom: 0.8em;
  line-height: 1.7;
}

.md ul, .md ol {
  margin-bottom: 1em;
  padding-left: 2em;
}

.md li {
  margin-bottom: 0.3em;
  line-height: 1.6;
}

.md code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.md pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.md pre code {
  background: none;
  padding: 0;
}

.md table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
}

.md th, .md td {
  border: 1px solid #e0e0e0;
  padding: 8px 12px;
  text-align: left;
}

.md th {
  background: #f5f7fa;
  font-weight: 600;
}

.md blockquote {
  border-left: 4px solid #409eff;
  padding-left: 16px;
  margin: 1em 0;
  color: #606266;
}

.md strong {
  font-weight: 600;
  color: #2c3e50;
}

.md a {
  color: #409eff;
  text-decoration: none;
}

.md a:hover {
  text-decoration: underline;
}
</style>
