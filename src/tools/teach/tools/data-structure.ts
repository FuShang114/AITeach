/**
 * 教具：数据结构可视化 (data_structure)
 * 支持 array / linkedlist / tree 三种类型的可视化展示
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface DSNode {
  value: any;
  label?: string;
  highlight?: boolean;
  children?: DSNode[];
  next?: DSNode;
}

interface DataStructureParams {
  type: 'array' | 'linkedlist' | 'tree';
  nodes: DSNode[];
  label?: string;
  root?: DSNode;
}

/**
 * 构建树的层级结构（递归）
 */
function buildTreeLevels(node: DSNode, level: number = 0, levels: DSNode[][] = []): DSNode[][] {
  if (!node) return levels;
  if (!levels[level]) levels[level] = [];
  levels[level].push(node);
  if (node.children) {
    for (const child of node.children) {
      buildTreeLevels(child, level + 1, levels);
    }
  }
  return levels;
}

/**
 * 渲染数组
 */
function renderArray(nodes: DSNode[], label: string): string {
  const itemsHTML = nodes.map((n: DSNode) =>
    `<div class="ds-array-item${n.highlight ? ' ds-highlight' : ''}">
      <span class="dsai-val">${escHTML(String(n.value))}</span>
      ${n.label ? `<span class="dsai-label">${escHTML(n.label)}</span>` : ''}
    </div>`
  ).join('');

  return `<div class="ds-array">
    ${label ? `<div class="ds-label">${escHTML(label)}</div>` : ''}
    <div class="ds-array-row">${itemsHTML}</div>
  </div>`;
}

/**
 * 渲染链表
 */
function renderLinkedList(nodes: DSNode[], label: string): string {
  const itemsHTML = nodes.map((n: DSNode, i: number) =>
    `<div class="ds-ll-item${n.highlight ? ' ds-highlight' : ''}">
      <div class="dslli-box">
        <span class="dslli-val">${escHTML(String(n.value))}</span>
      </div>
      ${i < nodes.length - 1 ? '<div class="dslli-arrow">→</div>' : '<div class="dslli-null">null</div>'}
    </div>`
  ).join('');

  return `<div class="ds-linkedlist">
    ${label ? `<div class="ds-label">${escHTML(label)}</div>` : ''}
    <div class="ds-ll-row">${itemsHTML}</div>
  </div>`;
}

/**
 * 渲染树
 */
function renderTree(root: DSNode, label: string): string {
  if (!root) return '<div class="ds-empty">空树</div>';

  const levels = buildTreeLevels(root);
  const levelsHTML = levels.map((levelNodes: DSNode[], levelIdx: number) => {
    const indent = levelIdx * 20;
    const nodesHTML = levelNodes.map((n: DSNode) =>
      `<div class="ds-tree-node${n.highlight ? ' ds-highlight' : ''}" style="margin-left:${indent}px">
        <span class="dstn-val">${escHTML(String(n.value))}</span>
        ${n.label ? `<span class="dstn-label">${escHTML(n.label)}</span>` : ''}
      </div>`
    ).join('');
    return `<div class="ds-tree-level">${nodesHTML}</div>`;
  }).join('');

  return `<div class="ds-tree">
    ${label ? `<div class="ds-label">${escHTML(label)}</div>` : ''}
    <div class="ds-tree-body">${levelsHTML}</div>
  </div>`;
}

registerTool('data_structure', function (params: DataStructureParams): string {
  const { type, nodes = [], label = '', root } = params;
  const uid = 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, { type, nodes, label, root });

  let bodyHTML = '';
  switch (type) {
    case 'array':
      bodyHTML = renderArray(nodes, label);
      break;
    case 'linkedlist':
      bodyHTML = renderLinkedList(nodes, label);
      break;
    case 'tree':
      bodyHTML = renderTree(root || nodes[0], label);
      break;
    default:
      bodyHTML = `<div class="ds-empty">未知数据结构类型: ${escHTML(type)}</div>`;
  }

  return wrapTool(
    '数据结构可视化',
    `data_structure (${escHTML(type)})`,
    `<div class="tool-ds" id="${uid}">${bodyHTML}</div>`,
    ''
  );
});
