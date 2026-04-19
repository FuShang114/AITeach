/**
 * 教具：错误演示 (error_demo)
 * 展示错误代码、错误信息，逐步修复并展示正确代码
 */
import { registerTool, wrapTool, escHTML, setToolState, getToolState } from '../tool-registry';

interface FixStep {
  desc: string;
  code: string;
}

interface ErrorDemoParams {
  errorCode: string;
  errorMessage: string;
  errorType: string;
  fixSteps: FixStep[];
  fixedCode: string;
}

registerTool('error_demo', function (params: ErrorDemoParams): string {
  const { errorCode, errorMessage, errorType, fixSteps = [], fixedCode } = params;
  const uid = 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  setToolState(uid, {
    errorCode,
    errorMessage,
    errorType,
    fixSteps,
    fixedCode,
    currentStep: -1,
  });

  // 修复步骤指示器
  const stepsIndicatorHTML = fixSteps.length > 0
    ? `<div class="err-steps-indicator" id="${uid}_steps_ind">
        ${fixSteps.map((_: FixStep, i: number) =>
          `<div class="esi-dot" data-step="${i}"></div>`
        ).join('')}
      </div>`
    : '';

  return wrapTool(
    '错误演示',
    'error_demo',
    `<div class="tool-error-demo" id="${uid}">
      <div class="err-header">
        <span class="err-type">${escHTML(errorType)}</span>
      </div>
      <div class="err-message">${escHTML(errorMessage)}</div>
      <div class="err-code-section">
        <div class="ecs-label">错误代码</div>
        <pre class="ecs-code err-code-bad">${escHTML(errorCode)}</pre>
      </div>
      ${stepsIndicatorHTML}
      <div class="err-fix-section" id="${uid}_fix" style="display:none">
        <div class="efs-label">修复步骤</div>
        <div class="efs-desc" id="${uid}_fix_desc"></div>
        <pre class="efs-code" id="${uid}_fix_code"></pre>
      </div>
      <div class="err-fixed-section" id="${uid}_fixed" style="display:none">
        <div class="efx-label">修复后的代码</div>
        <pre class="efx-code err-code-good">${escHTML(fixedCode)}</pre>
      </div>
    </div>`,
    fixSteps.length > 0
      ? `<button class="btn btn-p btn-sm" onclick="window.__teachTools.errorDemoNext('${uid}')">下一步修复 →</button>
         <button class="btn btn-ghost btn-sm" onclick="window.__teachTools.errorDemoReset('${uid}')">重置</button>`
      : ''
  );
});

/**
 * 下一步修复
 */
function errorDemoNext(uid: string): void {
  const st = getToolState(uid);
  if (!st || st.currentStep >= st.fixSteps.length - 1) {
    // 所有步骤完成，显示最终修复代码
    if (st && st.currentStep >= st.fixSteps.length - 1) {
      const fixedEl = document.getElementById(uid + '_fixed');
      if (fixedEl) fixedEl.style.display = '';
    }
    return;
  }

  st.currentStep++;
  const step = st.fixSteps[st.currentStep];

  // 显示修复区域
  const fixEl = document.getElementById(uid + '_fix');
  if (fixEl) fixEl.style.display = '';

  // 更新描述和代码
  const descEl = document.getElementById(uid + '_fix_desc');
  if (descEl) descEl.textContent = step.desc;

  const codeEl = document.getElementById(uid + '_fix_code');
  if (codeEl) codeEl.textContent = step.code;

  // 更新步骤指示器
  const indEl = document.getElementById(uid + '_steps_ind');
  if (indEl) {
    indEl.querySelectorAll('.esi-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i <= st.currentStep);
      dot.classList.toggle('current', i === st.currentStep);
    });
  }

  // 如果是最后一步，显示修复后的代码
  if (st.currentStep === st.fixSteps.length - 1) {
    const fixedEl = document.getElementById(uid + '_fixed');
    if (fixedEl) fixedEl.style.display = '';
  }
}

/**
 * 重置
 */
function errorDemoReset(uid: string): void {
  const st = getToolState(uid);
  if (!st) return;
  st.currentStep = -1;

  const fixEl = document.getElementById(uid + '_fix');
  if (fixEl) fixEl.style.display = 'none';

  const fixedEl = document.getElementById(uid + '_fixed');
  if (fixedEl) fixedEl.style.display = 'none';

  const indEl = document.getElementById(uid + '_steps_ind');
  if (indEl) {
    indEl.querySelectorAll('.esi-dot').forEach(dot => {
      dot.classList.remove('active', 'current');
    });
  }
}

// 挂载到 window
(window as any).__teachTools = (window as any).__teachTools || {};
(window as any).__teachTools.errorDemoNext = errorDemoNext;
(window as any).__teachTools.errorDemoReset = errorDemoReset;
