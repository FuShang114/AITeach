/**
 * 教具：交互式代码编辑 (code_editor)
 * 提供代码编辑区、运行按钮、输出区和提示系统
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface EditorHint {
  title: string;
  content: string;
}

interface CodeEditorParams {
  initialCode: string;
  expectedOutput: string;
  hints?: EditorHint[];
  language?: string;
}

registerTool('code_editor', function (params: CodeEditorParams): string {
  const { initialCode, expectedOutput, hints = [], language = 'javascript' } = params;
  const uid = 'editor_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, {
    initialCode,
    expectedOutput,
    hints,
    language,
    currentHint: -1,
  });

  // 提示按钮列表
  const hintsHTML = hints.length > 0
    ? `<div class="editor-hints" id="${uid}_hints">
        ${hints.map((h: EditorHint, i: number) =>
          `<button class="btn btn-ghost btn-sm editor-hint-btn" onclick="window.__teachTools.showEditorHint('${uid}', ${i})">提示 ${i + 1}</button>`
        ).join('')}
      </div>`
    : '';

  return wrapTool(
    '交互式代码编辑',
    'code_editor',
    `<div class="tool-editor" id="${uid}">
      <div class="editor-area">
        <textarea class="editor-textarea" id="${uid}_code" spellcheck="false">${escHTML(initialCode)}</textarea>
      </div>
      <div class="editor-output" id="${uid}_output"></div>
      <div class="editor-expected">
        <span class="eo-label">期望输出：</span>
        <pre class="eo-code">${escHTML(expectedOutput)}</pre>
      </div>
      <div class="editor-hint-content" id="${uid}_hint"></div>
    </div>`,
    `<button class="btn btn-p btn-sm" onclick="window.__teachTools.runEditor('${uid}')">运行</button>
     <button class="btn btn-ghost btn-sm" onclick="window.__teachTools.resetEditor('${uid}')">重置</button>
     ${hintsHTML}`
  );
});

/**
 * 运行编辑器代码
 */
function runEditor(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;

  const textarea = document.getElementById(uid + '_code') as HTMLTextAreaElement;
  const outputEl = document.getElementById(uid + '_output');
  if (!textarea || !outputEl) return;

  const code = textarea.value;
  let output = '';

  try {
    // 简单的代码执行（仅用于教学演示）
    // 捕获 console.log 输出
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    try {
      // 使用 Function 构造器执行
      const fn = new Function(code);
      fn();
    } catch (err: any) {
      outputEl.innerHTML = `<span style="color:var(--md-error)">❌ ${escHTML(err.message)}</span>`;
    } finally {
      console.log = origLog;  // Always restore
    }

    output = logs.join('\n');

    // 检查输出是否匹配期望
    if (output.trim() === st.expectedOutput.trim()) {
      outputEl.className = 'editor-output editor-success';
      outputEl.textContent = output || '(无输出)';
    } else {
      outputEl.className = 'editor-output editor-fail';
      outputEl.textContent = output || '(无输出)';
    }
  } catch (err: any) {
    outputEl.className = 'editor-output editor-error';
    outputEl.textContent = `错误: ${err.message}`;
  }
}

/**
 * 重置编辑器
 */
function resetEditor(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;

  const textarea = document.getElementById(uid + '_code') as HTMLTextAreaElement;
  const outputEl = document.getElementById(uid + '_output');
  const hintEl = document.getElementById(uid + '_hint');
  if (textarea) textarea.value = st.initialCode;
  if (outputEl) { outputEl.textContent = ''; outputEl.className = 'editor-output'; }
  if (hintEl) { hintEl.textContent = ''; hintEl.className = 'editor-hint-content'; }
  st.currentHint = -1;
}

/**
 * 显示提示
 */
function showEditorHint(uid: string, index: number): void {
  const st = getToolState(uid);
  if (!st || !st.hints[index]) return;

  st.currentHint = index;
  const hintEl = document.getElementById(uid + '_hint');
  if (!hintEl) return;

  const hint = st.hints[index];
  hintEl.className = 'editor-hint-content show';
  hintEl.innerHTML = `<div class="eh-title">${escHTML(hint.title)}</div><div class="eh-content">${escHTML(hint.content)}</div>`;
}

// 挂载到 window
(window as any).__teachTools = (window as any).__teachTools || {};
(window as any).__teachTools.runEditor = runEditor;
(window as any).__teachTools.resetEditor = resetEditor;
(window as any).__teachTools.showEditorHint = showEditorHint;
