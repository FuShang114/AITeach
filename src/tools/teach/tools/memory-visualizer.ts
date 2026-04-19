/**
 * 教具：内存模型可视化 (memory_visualizer)
 * 展示栈内存和堆内存的结构，可视化指针引用关系
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface StackFrame {
  name: string;
  value: string;
  addr: string;
}

interface HeapObject {
  id: string;
  type: string;
  value: string;
  refs?: string[];
}

interface MemoryVisualizerParams {
  stack: StackFrame[];
  heap: HeapObject[];
}

registerTool('memory_visualizer', function (params: MemoryVisualizerParams): string {
  const { stack = [], heap = [] } = params;
  const uid = 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, { stack, heap });

  // 栈帧 HTML
  const stackHTML = stack.length > 0
    ? stack.map((frame: StackFrame) =>
        `<div class="mem-stack-row">
          <span class="msr-addr">${escHTML(frame.addr)}</span>
          <span class="msr-name">${escHTML(frame.name)}</span>
          <span class="msr-val">${escHTML(frame.value)}</span>
        </div>`
      ).join('')
    : '<div class="mem-empty">栈为空</div>';

  // 堆对象 HTML
  const heapHTML = heap.length > 0
    ? heap.map((obj: HeapObject) =>
        `<div class="mem-heap-obj" data-id="${escHTML(obj.id)}">
          <div class="mho-header">
            <span class="mho-type">${escHTML(obj.type)}</span>
            <span class="mho-id">${escHTML(obj.id)}</span>
          </div>
          <div class="mho-value">${escHTML(obj.value)}</div>
          ${obj.refs && obj.refs.length > 0
            ? `<div class="mho-refs">${obj.refs.map((r: string) =>
                `<span class="mho-ref">${escHTML(r)}</span>`
              ).join('')}</div>`
            : ''}
        </div>`
      ).join('')
    : '<div class="mem-empty">堆为空</div>';

  return wrapTool(
    '内存模型可视化',
    'memory_visualizer',
    `<div class="tool-memory" id="${uid}">
      <div class="mem-section mem-stack-section">
        <div class="mem-section-title">栈 (Stack)</div>
        <div class="mem-stack-body">${stackHTML}</div>
      </div>
      <div class="mem-section mem-heap-section">
        <div class="mem-section-title">堆 (Heap)</div>
        <div class="mem-heap-body">${heapHTML}</div>
      </div>
    </div>`,
    ''
  );
});
