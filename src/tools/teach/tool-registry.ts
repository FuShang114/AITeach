/**
 * 教具注册框架
 * AI 输出结构化指令 → 前端渲染交互式组件
 */

// 教具状态存储（按 uid 索引，每个教具实例独立）
const toolState: Record<string, any> = {};

// 教具渲染函数注册表
const toolRenderers: Record<string, (params: any) => string> = {};

/**
 * HTML 转义 - 防止 XSS
 */
export function escHTML(s: any): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 注册教具渲染函数
 * @param name 教具名称（与 AI 指令中的 tool 字段对应）
 * @param renderFn 渲染函数，接收 params 返回 HTML 字符串
 */
export function registerTool(name: string, renderFn: (params: any) => string): void {
  toolRenderers[name] = renderFn;
}

/**
 * 渲染教具（根据 AI 指令）
 * @param instruction AI 输出的结构化指令 { tool, params }
 * @returns 渲染后的 HTML 字符串
 */
export function renderTool(instruction: any): string {
  const { tool, params } = instruction;
  const renderer = toolRenderers[tool];
  if (!renderer) {
    return `<div class="tool-container"><div class="tool-body"><div style="color:var(--md-error);text-align:center;padding:20px">未知教具: ${escHTML(tool)}</div></div></div>`;
  }
  return renderer(params);
}

/**
 * 获取教具状态
 * @param uid 教具实例唯一标识
 */
export function getToolState(uid: string): any {
  return toolState[uid];
}

/**
 * 设置教具状态
 * @param uid 教具实例唯一标识
 * @param state 要存储的状态对象
 */
export function setToolState(uid: string, state: any): void {
  toolState[uid] = state;
}

/**
 * 教具容器包装
 * @param title 教具标题
 * @param badge 教具类型标签
 * @param bodyHTML 主体内容 HTML
 * @param controlsHTML 控制按钮 HTML（可选）
 */
export function wrapTool(title: string, badge: string, bodyHTML: string, controlsHTML: string = ''): string {
  return `<div class="tool-container">
    <div class="tool-header">
      <div class="th-title">${escHTML(title)} <span class="th-badge">${escHTML(badge)}</span></div>
    </div>
    <div class="tool-body">${bodyHTML}</div>
    ${controlsHTML ? `<div class="tool-controls">${controlsHTML}</div>` : ''}
  </div>`;
}
