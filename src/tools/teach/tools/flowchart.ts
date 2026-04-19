/**
 * 教具：流程图动画 (flowchart)
 * 展示流程图节点和边，支持高亮活跃路径
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface FlowNode {
  id: string;
  text: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'io';
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface FlowchartParams {
  nodes: FlowNode[];
  edges: FlowEdge[];
  activePath?: string[];
}

/**
 * 节点类型对应的 CSS 类名
 */
const NODE_TYPE_CLASS: Record<string, string> = {
  start: 'fc-node-start',
  end: 'fc-node-end',
  process: 'fc-node-process',
  decision: 'fc-node-decision',
  io: 'fc-node-io',
};

/**
 * 节点类型对应的图标
 */
const NODE_TYPE_ICON: Record<string, string> = {
  start: '●',
  end: '◉',
  process: '□',
  decision: '◇',
  io: '▱',
};

registerTool('flowchart', function (params: FlowchartParams): string {
  const { nodes = [], edges = [], activePath = [] } = params;
  const uid = 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, { nodes, edges, activePath, currentStep: -1 });

  const activeSet = new Set(activePath);

  // 构建节点 ID → 节点映射
  const nodeMap: Record<string, FlowNode> = {};
  nodes.forEach((n: FlowNode) => { nodeMap[n.id] = n; });

  // 渲染节点
  const nodesHTML = nodes.map((n: FlowNode) => {
    const isActive = activeSet.has(n.id);
    const typeClass = NODE_TYPE_CLASS[n.type] || 'fc-node-process';
    const icon = NODE_TYPE_ICON[n.type] || '□';
    return `<div class="fc-node ${typeClass}${isActive ? ' fc-active' : ''}" data-id="${escHTML(n.id)}">
      <span class="fcn-icon">${icon}</span>
      <span class="fcn-text">${escHTML(n.text)}</span>
    </div>`;
  }).join('');

  // 渲染边
  const edgesHTML = edges.map((e: FlowEdge) => {
    const fromActive = activeSet.has(e.from);
    const toActive = activeSet.has(e.to);
    const edgeActive = fromActive && toActive;
    return `<div class="fc-edge${edgeActive ? ' fc-active' : ''}" data-from="${escHTML(e.from)}" data-to="${escHTML(e.to)}">
      <span class="fce-from">${escHTML(e.from)}</span>
      <span class="fce-arrow">${edgeActive ? '→' : '→'}</span>
      <span class="fce-to">${escHTML(e.to)}</span>
      ${e.label ? `<span class="fce-label">${escHTML(e.label)}</span>` : ''}
    </div>`;
  }).join('');

  return wrapTool(
    '流程图动画',
    'flowchart',
    `<div class="tool-flowchart" id="${uid}">
      <div class="fc-nodes">${nodesHTML}</div>
      <div class="fc-edges">${edgesHTML}</div>
    </div>`,
    `<button class="btn btn-p btn-sm" onclick="window.__teachTools.flowchartNext('${uid}')">下一步 →</button>
     <button class="btn btn-ghost btn-sm" onclick="window.__teachTools.flowchartReset('${uid}')">重置</button>`
  );
});

/**
 * 流程图下一步
 */
function flowchartNext(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;
  st.currentStep = (st.currentStep + 1) % (st.activePath.length + 1);

  const el = document.getElementById(uid);
  if (!el) return;

  // 重置所有节点和边的状态
  el.querySelectorAll('.fc-node').forEach(n => n.classList.remove('fc-active'));
  el.querySelectorAll('.fc-edge').forEach(e => e.classList.remove('fc-active'));

  // 高亮到当前步骤的路径
  for (let i = 0; i < st.currentStep && i < st.activePath.length; i++) {
    const nodeId = st.activePath[i];
    const nodeEl = el.querySelector(`.fc-node[data-id="${nodeId}"]`);
    if (nodeEl) nodeEl.classList.add('fc-active');

    // 高亮入边
    if (i > 0) {
      const prevId = st.activePath[i - 1];
      const edgeEl = el.querySelector(`.fc-edge[data-from="${prevId}"][data-to="${nodeId}"]`);
      if (edgeEl) edgeEl.classList.add('fc-active');
    }
  }
}

/**
 * 流程图重置
 */
function flowchartReset(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;
  st.currentStep = -1;

  const el = document.getElementById(uid);
  if (!el) return;

  el.querySelectorAll('.fc-node').forEach(n => n.classList.remove('fc-active'));
  el.querySelectorAll('.fc-edge').forEach(e => e.classList.remove('fc-active'));
}

// 挂载到 window
(window as any).__teachTools = (window as any).__teachTools || {};
(window as any).__teachTools.flowchartNext = flowchartNext;
(window as any).__teachTools.flowchartReset = flowchartReset;
