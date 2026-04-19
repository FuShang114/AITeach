/**
 * 教具：对比展示 (compare)
 * 并排对比两段代码，支持行高亮和差异描述
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface CompareSide {
  title: string;
  code: string;
  highlights?: number[];
}

interface CompareParams {
  left: CompareSide;
  right: CompareSide;
  diffDesc?: string;
}

/**
 * 渲染代码块（带行高亮）
 */
function renderCodeBlock(side: CompareSide, sideClass: string): string {
  const lines = side.code.split('\n');
  const highlightSet = new Set(side.highlights || []);

  const linesHTML = lines.map((line: string, i: number) =>
    `<div class="cmp-line${highlightSet.has(i) ? ' cmp-hl' : ''} ${sideClass}">
      <span class="cmp-ln">${i + 1}</span>
      <span class="cmp-code">${escHTML(line)}</span>
    </div>`
  ).join('');

  return `<div class="cmp-panel ${sideClass}">
    <div class="cmp-panel-title">${escHTML(side.title)}</div>
    <div class="cmp-code-block">${linesHTML}</div>
  </div>`;
}

registerTool('compare', function (params: CompareParams): string {
  const { left, right, diffDesc = '' } = params;
  const uid = 'cmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, { left, right, diffDesc });

  const leftHTML = renderCodeBlock(left, 'cmp-left');
  const rightHTML = renderCodeBlock(right, 'cmp-right');

  return wrapTool(
    '对比展示',
    'compare',
    `<div class="tool-compare" id="${uid}">
      <div class="cmp-body">
        <div class="cmp-side">${leftHTML}</div>
        <div class="cmp-divider"></div>
        <div class="cmp-side">${rightHTML}</div>
      </div>
      ${diffDesc ? `<div class="cmp-desc">${escHTML(diffDesc)}</div>` : ''}
    </div>`,
    ''
  );
});
