/**
 * 教具：代码步进执行器 (code_stepper)
 * 逐行执行代码，展示变量变化和执行描述
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface StepperLine {
  code: string;
  desc: string;
}

interface StepperVar {
  name: string;
  value: any;
  type: string;
  name2?: string;
  value2?: any;
  type2?: string;
}

interface CodeStepperParams {
  lines: StepperLine[];
  vars: StepperVar[];
}

registerTool('code_stepper', function (params: CodeStepperParams): string {
  const { lines, vars } = params;
  const uid = 'stepper_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, { step: -1, lines, vars });

  const codeHTML = lines
    .map((l: StepperLine, i: number) =>
      `<div class="stepper-line" data-idx="${i}">${escHTML(l.code)}</div>`
    )
    .join('');

  return wrapTool(
    '代码步进执行器',
    'code_stepper',
    `<div class="tool-stepper" id="${uid}">
      <div class="stepper-code">${codeHTML}</div>
      <div class="stepper-vars" id="${uid}_vars"></div>
    </div>
    <div class="stepper-desc" id="${uid}_desc">点击"下一步"开始执行代码</div>`,
    `<button class="btn btn-p btn-sm" onclick="window.__teachTools.stepperNext('${uid}')">下一步 →</button>
     <button class="btn btn-ghost btn-sm" onclick="window.__teachTools.stepperReset('${uid}')">重置</button>`
  );
});

/**
 * 构建变量行 HTML
 */
function buildVarRow(name: string, value: any, type: string, changed: boolean): string {
  return `<div class="stepper-var${changed ? ' changed' : ''}">
    <span class="sv-name">${escHTML(name)}</span>
    <span class="sv-val">${escHTML(String(value))}</span>
    <span class="sv-type">${escHTML(type)}</span>
  </div>`;
}

/**
 * 下一步
 */
function stepperNext(uid: string): void {
  const st = getToolState(uid);
  if (!st || st.step >= st.lines.length - 1) return;
  st.step++;

  const el = document.getElementById(uid);
  if (!el) return;

  // 更新代码行高亮
  el.querySelectorAll('.stepper-line').forEach((line, i) => {
    line.classList.remove('active', 'done');
    if (i === st.step) line.classList.add('active');
    else if (i < st.step) line.classList.add('done');
  });

  // 更新变量表
  const varsEl = document.getElementById(uid + '_vars');
  if (varsEl && st.vars[st.step]) {
    const v = st.vars[st.step];
    const prev = st.step > 0 ? st.vars[st.step - 1] : null;
    const changed = prev && prev.name !== undefined && (prev.value !== v.value || prev.type !== v.type);
    let html = buildVarRow(v.name, v.value, v.type, !!changed);

    if (v.name2 !== undefined) {
      const prevV2 = prev ? prev.value2 : undefined;
      const prevT2 = prev ? prev.type2 : undefined;
      const changed2 = prevV2 !== v.value2 || prevT2 !== v.type2;
      html += buildVarRow(v.name2, v.value2, v.type2, !!changed2);
    }
    varsEl.innerHTML = html;
  }

  // 更新描述
  const descEl = document.getElementById(uid + '_desc');
  if (descEl) descEl.textContent = st.lines[st.step].desc;
}

/**
 * 重置
 */
function stepperReset(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;
  st.step = -1;

  const el = document.getElementById(uid);
  if (el) {
    el.querySelectorAll('.stepper-line').forEach(l => l.classList.remove('active', 'done'));
  }

  const varsEl = document.getElementById(uid + '_vars');
  if (varsEl) varsEl.innerHTML = '';

  const descEl = document.getElementById(uid + '_desc');
  if (descEl) descEl.textContent = '点击"下一步"开始执行代码';
}

// 挂载到 window
(window as any).__teachTools = (window as any).__teachTools || {};
(window as any).__teachTools.stepperNext = stepperNext;
(window as any).__teachTools.stepperReset = stepperReset;
