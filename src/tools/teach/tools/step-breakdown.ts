/**
 * 教具：步骤分解 (step_breakdown)
 * 将复杂过程分解为可逐步浏览的步骤，支持自动播放
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface StepItem {
  icon: string;
  title: string;
  content: string;
}

interface StepBreakdownParams {
  title: string;
  steps: StepItem[];
  autoPlay?: boolean;
}

registerTool('step_breakdown', function (params: StepBreakdownParams): string {
  const { title, steps = [], autoPlay = false } = params;
  const uid = 'steps_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, {
    title,
    steps,
    autoPlay,
    currentStep: 0,
    autoPlayTimer: null as ReturnType<typeof setInterval> | null,
  });

  // 步骤导航点
  const dotsHTML = steps.map((_: StepItem, i: number) =>
    `<button class="steps-dot${i === 0 ? ' active' : ''}" data-step="${i}" onclick="window.__teachTools.stepsGoTo('${uid}', ${i})"></button>`
  ).join('');

  return wrapTool(
    title || '步骤分解',
    'step_breakdown',
    `<div class="tool-steps" id="${uid}">
      <div class="steps-progress">
        <div class="steps-progress-bar" id="${uid}_bar"></div>
      </div>
      <div class="steps-dots">${dotsHTML}</div>
      <div class="steps-content" id="${uid}_content">
        ${steps.length > 0 ? renderStepContent(steps[0], 0, steps.length) : '<div class="steps-empty">暂无步骤</div>'}
      </div>
      <div class="steps-counter" id="${uid}_counter">${steps.length > 0 ? '1 / ' + steps.length : ''}</div>
    </div>`,
    `<button class="btn btn-ghost btn-sm" onclick="window.__teachTools.stepsPrev('${uid}')">← 上一步</button>
     <button class="btn btn-p btn-sm" onclick="window.__teachTools.stepsNext('${uid}')">下一步 →</button>
     ${autoPlay ? `<button class="btn btn-ghost btn-sm" id="${uid}_play" onclick="window.__teachTools.stepsAutoPlay('${uid}')">自动播放</button>` : ''}`
  );
});

/**
 * 渲染步骤内容
 */
function renderStepContent(step: StepItem, index: number, total: number): string {
  return `<div class="step-item">
    <div class="si-icon">${escHTML(step.icon)}</div>
    <div class="si-title">${escHTML(step.title)}</div>
    <div class="si-content">${escHTML(step.content)}</div>
  </div>`;
}

/**
 * 更新步骤 UI
 */
function updateStepsUI(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;

  const contentEl = document.getElementById(uid + '_content');
  const counterEl = document.getElementById(uid + '_counter');
  const barEl = document.getElementById(uid + '_bar');
  const containerEl = document.getElementById(uid);

  if (!containerEl) return;

  // 更新内容
  if (contentEl && st.steps[st.currentStep]) {
    contentEl.innerHTML = renderStepContent(st.steps[st.currentStep], st.currentStep, st.steps.length);
  }

  // 更新计数器
  if (counterEl) {
    counterEl.textContent = `${st.currentStep + 1} / ${st.steps.length}`;
  }

  // 更新进度条
  if (barEl) {
    const pct = st.steps.length > 1 ? ((st.currentStep) / (st.steps.length - 1)) * 100 : 100;
    barEl.style.width = `${pct}%`;
  }

  // 更新导航点
  containerEl.querySelectorAll('.steps-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === st.currentStep);
    dot.classList.toggle('done', i < st.currentStep);
  });
}

/**
 * 下一步
 */
function stepsNext(uid: string): void {
  const st = getToolState(uid);
  if (!st || st.currentStep >= st.steps.length - 1) return;
  st.currentStep++;
  updateStepsUI(uid);
}

/**
 * 上一步
 */
function stepsPrev(uid: string): void {
  const st = getToolState(uid);
  if (!st || st.currentStep <= 0) return;
  st.currentStep--;
  updateStepsUI(uid);
}

/**
 * 跳转到指定步骤
 */
function stepsGoTo(uid: string, step: number): void {
  const st = getToolState(uid);
  if (!st || step < 0 || step >= st.steps.length) return;
  st.currentStep = step;
  updateStepsUI(uid);
}

/**
 * 自动播放
 */
function stepsAutoPlay(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;

  const playBtn = document.getElementById(uid + '_play');
  if (!playBtn) return;

  if (st.autoPlayTimer) {
    // 停止自动播放
    clearInterval(st.autoPlayTimer);
    st.autoPlayTimer = null;
    playBtn.textContent = '自动播放';
    return;
  }

  // 开始自动播放
  playBtn.textContent = '暂停';
  st.autoPlayTimer = setInterval(() => {
    if (st.currentStep >= st.steps.length - 1) {
      clearInterval(st.autoPlayTimer!);
      st.autoPlayTimer = null;
      if (playBtn) playBtn.textContent = '自动播放';
      return;
    }
    st.currentStep++;
    updateStepsUI(uid);
  }, 2000);
}

// 挂载到 window
(window as any).__teachTools = (window as any).__teachTools || {};
(window as any).__teachTools.stepsNext = stepsNext;
(window as any).__teachTools.stepsPrev = stepsPrev;
(window as any).__teachTools.stepsGoTo = stepsGoTo;
(window as any).__teachTools.stepsAutoPlay = stepsAutoPlay;
