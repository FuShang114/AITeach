/**
 * 练习视图组件
 * 支持单选题、填空题、判断题三种题型
 * 包含计划切换、前置回顾、进度条、反馈、完成界面
 */
import { learningStore } from '../storage/learning-store';
import type { LearningPlan } from '../storage/learning-store';
import { eventBus, AppEvents } from '../utils/event-bus';

// 题目类型定义
interface QuestionOption {
  l: string;  // 选项标签 A/B/C/D
  t: string;  // 选项文本
}

interface Question {
  type: '单选题' | '填空题' | '判断题';
  diff: number;
  color: string;
  bgc: string;
  text: string;
  opts?: QuestionOption[];
  fill?: boolean;
  tf?: boolean;
  ans: string;
  explain: string;
}

// 示例题目数据（后续由 AI 工具生成）
const sampleQuestions: Question[] = [
  {
    type: '单选题', diff: 3, color: '#0369a1', bgc: '#e0f2fe',
    text: '以下哪个是 Python 中正确的变量命名？',
    opts: [{ l: 'A', t: '2name' }, { l: 'B', t: 'my-name' }, { l: 'C', t: 'my_name' }, { l: 'D', t: 'class' }],
    ans: 'C',
    explain: 'Python 变量名可以包含字母、数字和下划线，但不能以数字开头，不能使用关键字。'
  },
  {
    type: '填空题', diff: 2, color: '#7c3aed', bgc: '#f5e6ff',
    text: '在 Python 中，用于定义函数的关键字是 ______ 。',
    fill: true, ans: 'def',
    explain: 'def 是 define 的缩写，用于定义函数。'
  },
  {
    type: '判断题', diff: 2, color: '#166534', bgc: '#f0fdf4',
    text: 'Python 中的列表（list）是不可变数据类型。',
    tf: true, ans: 'false',
    explain: '列表是可变数据类型，可以修改其元素。元组（tuple）才是不可变的。'
  }
];

class ExerciseView extends HTMLElement {
  // 状态
  private plans: LearningPlan[] = [];
  private currentPlanId: string | null = null;
  private questions: Question[] = sampleQuestions;
  private currentQ = 0;
  private correct = 0;
  private total = 0;
  private selectedOpt: string | null = null;
  private submitted = false;
  private xp = 0;
  private unsubscribers: Array<() => void> = [];

  connectedCallback() {
    if (this.querySelector('.exercise-view')) {
      return;
    }
    this.init();
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private async init() {
    // 加载计划数据
    this.plans = await learningStore.getPlans();
    this.currentPlanId = await learningStore.getCurrentPlanId();

    // 如果没有当前计划但有计划列表，默认选第一个
    if (!this.currentPlanId && this.plans.length > 0) {
      this.currentPlanId = this.plans[0].id;
      await learningStore.setCurrentPlanId(this.currentPlanId);
    }

    this.total = this.questions.length;
    this.render();

    // 监听计划切换事件
    this.unsubscribers.push(
      eventBus.on(AppEvents.PLAN_SWITCHED, () => this.handlePlanSwitched()),
      eventBus.on(AppEvents.PLAN_UPDATED, () => this.handlePlanSwitched()),
    );
  }

  private async handlePlanSwitched() {
    this.plans = await learningStore.getPlans();
    this.currentPlanId = await learningStore.getCurrentPlanId();
    // 更新计划切换条
    this.updatePlanSwitcher();
  }

  private render() {
    // 空状态：没有计划时引导创建
    if (this.plans.length === 0) {
      this.innerHTML = `
        <div class="exercise-view">
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-title">还没有学习计划</div>
            <div class="empty-desc">创建一个学习计划后，就可以开始练习了！</div>
            <button class="empty-btn" id="createPlanBtn">创建学习计划</button>
          </div>
        </div>
      `;
      const btn = this.querySelector('#createPlanBtn');
      if (btn) btn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'learning-path' });
      });
      return;
    }

    const currentPlan = this.plans.find(p => p.id === this.currentPlanId);

    this.innerHTML = `
      <div class="exercise-view">
        ${this.renderPlanSwitcher()}
        ${currentPlan ? this.renderPreLesson(currentPlan) : ''}
        ${this.renderProgress()}
        ${this.renderQuestion()}
        ${this.renderFeedback()}
        ${this.renderActions()}
      </div>
    `;

    this.bindEvents();
  }

  /** 计划切换条 */
  private renderPlanSwitcher(): string {
    if (this.plans.length === 0) {
      return '';
    }
    const chips = this.plans.map(plan => {
      const isActive = plan.id === this.currentPlanId;
      return `
        <button class="ps-chip ${isActive ? 'active' : ''}" data-plan-id="${plan.id}">
          <span class="pc-dot" style="background:${plan.color || 'var(--md-primary)'}"></span>
          ${plan.name}
        </button>
      `;
    }).join('');

    return `<div class="plan-switcher">${chips}</div>`;
  }

  /** 更新计划切换条（不重新渲染整个视图） */
  private updatePlanSwitcher() {
    const switcher = this.querySelector('.plan-switcher');
    if (!switcher) return;

    const chips = this.plans.map(plan => {
      const isActive = plan.id === this.currentPlanId;
      return `
        <button class="ps-chip ${isActive ? 'active' : ''}" data-plan-id="${plan.id}">
          <span class="pc-dot" style="background:${plan.color || 'var(--md-primary)'}"></span>
          ${plan.name}
        </button>
      `;
    }).join('');

    switcher.innerHTML = chips;

    // 重新绑定计划切换事件
    switcher.querySelectorAll('.ps-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const planId = (chip as HTMLElement).dataset.planId;
        if (planId && planId !== this.currentPlanId) {
          this.currentPlanId = planId;
          await learningStore.setCurrentPlanId(planId);
          this.updatePlanSwitcher();
          // 更新前置回顾
          this.updatePreLesson();
        }
      });
    });
  }

  /** 练习前置回顾 */
  private renderPreLesson(plan: LearningPlan): string {
    const currentPhase = plan.phases.find(p => p.current) || plan.phases[0];
    const currentLesson = plan.lessons.find(l => l.current) || plan.lessons[0];
    const points = currentLesson?.points || [];

    return `
      <div class="pre-lesson" id="preLesson">
        <div class="pre-lesson-toggle" id="preLessonToggle">
          <span class="plt-title">${plan.icon || ''} ${currentLesson?.title || currentPhase?.name || plan.name}</span>
          <span class="plt-arrow" id="pltArrow">&#9660;</span>
        </div>
        <div class="pre-lesson-content" id="preLessonContent">
          ${points.length > 0
            ? `<div class="plc-points">
                ${points.map(p => `<div class="plc-point">${p}</div>`).join('')}
              </div>`
            : `<div class="plc-desc">当前阶段：${currentPhase?.name || '未开始'} - ${currentPhase ? (currentPhase.done ? '已完成' : '进行中') : ''}</div>`
          }
        </div>
      </div>
    `;
  }

  /** 更新前置回顾 */
  private updatePreLesson() {
    const currentPlan = this.plans.find(p => p.id === this.currentPlanId);
    const preLesson = this.querySelector('#preLesson');
    if (!preLesson || !currentPlan) return;

    const currentPhase = currentPlan.phases.find(p => p.current) || currentPlan.phases[0];
    const currentLesson = currentPlan.lessons.find(l => l.current) || currentPlan.lessons[0];
    const points = currentLesson?.points || [];

    const toggle = preLesson.querySelector('.plt-title');
    if (toggle) {
      toggle.textContent = `${currentPlan.icon || ''} ${currentLesson?.title || currentPhase?.name || currentPlan.name}`;
    }

    const content = preLesson.querySelector('#preLessonContent');
    if (content) {
      content.innerHTML = points.length > 0
        ? `<div class="plc-points">
            ${points.map(p => `<div class="plc-point">${p}</div>`).join('')}
          </div>`
        : `<div class="plc-desc">当前阶段：${currentPhase?.name || '未开始'} - ${currentPhase ? (currentPhase.done ? '已完成' : '进行中') : ''}</div>`;
    }
  }

  /** 进度条 */
  private renderProgress(): string {
    const q = this.questions[this.currentQ];
    const diffStars = q ? '&#9733;'.repeat(q.diff) + '&#9734;'.repeat(5 - q.diff) : '';
    return `
      <div class="ex-progress">
        <div class="ex-prog-left">
          <span class="ex-prog-text">${this.currentQ + 1} / ${this.total}</span>
          <span class="ex-prog-diff">${diffStars}</span>
        </div>
        <div class="ex-prog-right">
          <span class="ex-xp">${this.xp} XP</span>
        </div>
      </div>
    `;
  }

  /** 题目卡片 */
  private renderQuestion(): string {
    const q = this.questions[this.currentQ];
    if (!q) return '';

    const typeColor = q.color || 'var(--md-primary)';
    const typeBg = q.bgc || 'var(--md-primary-container)';

    let bodyHTML = '';

    if (q.type === '单选题' && q.opts) {
      bodyHTML = `
        <div class="opts">
          ${q.opts.map(opt => `
            <div class="opt ${this.selectedOpt === opt.l ? 'sel' : ''} ${this.submitted ? 'off' : ''}" data-label="${opt.l}">
              <span class="opt-label">${opt.l}</span>
              <span class="opt-text">${opt.t}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (q.type === '填空题') {
      bodyHTML = `
        <div class="fill-area">
          <input class="fill-input" id="fillInput" type="text" placeholder="请输入答案..." ${this.submitted ? 'disabled' : ''} value="${this.selectedOpt || ''}" />
        </div>
      `;
    } else if (q.type === '判断题') {
      bodyHTML = `
        <div class="tf-row">
          <button class="tf-btn ${this.selectedOpt === 'true' ? 'sel-t' : ''} ${this.submitted ? 'off' : ''}" data-tf="true">
            &#10004; 正确
          </button>
          <button class="tf-btn ${this.selectedOpt === 'false' ? 'sel-f' : ''} ${this.submitted ? 'off' : ''}" data-tf="false">
            &#10008; 错误
          </button>
        </div>
      `;
    }

    return `
      <div class="q-card" style="border-left: 4px solid ${typeColor}">
        <div class="q-type" style="background:${typeBg}; color:${typeColor}">${q.type}</div>
        <div class="q-text">${q.text}</div>
        ${bodyHTML}
      </div>
    `;
  }

  /** 反馈区 */
  private renderFeedback(): string {
    if (!this.submitted) {
      return `<div class="fb" id="feedback"></div>`;
    }

    const q = this.questions[this.currentQ];
    if (!q) return '';

    const isCorrect = this.selectedOpt?.toLowerCase() === q.ans.toLowerCase();

    if (isCorrect) {
      return `
        <div class="fb show ok" id="feedback">
          <div class="fb-icon">&#9989; 回答正确！</div>
          <div class="fb-explain">${q.explain}</div>
        </div>
      `;
    } else {
      return `
        <div class="fb show no" id="feedback">
          <div class="fb-icon">&#10060; 回答错误</div>
          <div class="fb-answer">正确答案：${q.type === '判断题' ? (q.ans === 'true' ? '正确' : '错误') : q.ans}</div>
          <div class="fb-explain">${q.explain}</div>
          <button class="fb-ai-btn" id="aiExplainBtn">&#128214; AI 详细讲解</button>
        </div>
      `;
    }
  }

  /** 底部操作 */
  private renderActions(): string {
    if (this.submitted && this.currentQ >= this.total - 1) {
      // 最后一题已提交，显示查看结果
      return `
        <div class="q-actions">
          <button class="btn btn-p" id="showResultBtn">查看结果</button>
        </div>
      `;
    }

    return `
      <div class="q-actions">
        <button class="btn btn-p ${this.submitted ? '' : 'disabled'}" id="submitBtn" ${this.submitted ? 'style="display:none"' : ''}>
          提交答案
        </button>
      </div>
    `;
  }

  /** 完成界面 */
  private renderCompletion(): string {
    const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
    const grade = accuracy >= 90 ? 'S' : accuracy >= 80 ? 'A' : accuracy >= 60 ? 'B' : 'C';
    const gradeColor = accuracy >= 90 ? 'var(--md-primary)' : accuracy >= 80 ? 'var(--md-success)' : accuracy >= 60 ? 'var(--md-warning)' : 'var(--md-error)';

    return `
      <div class="completion">
        <div class="comp-icon" style="color:${gradeColor}">${grade}</div>
        <div class="comp-title">练习完成！</div>
        <div class="comp-stats">
          <div class="cs-item">
            <div class="cs-val">${this.correct} / ${this.total}</div>
            <div class="cs-label">正确题数</div>
          </div>
          <div class="cs-item">
            <div class="cs-val" style="color:${gradeColor}">${accuracy}%</div>
            <div class="cs-label">正确率</div>
          </div>
          <div class="cs-item">
            <div class="cs-val" style="color:var(--md-primary)">+${this.xp}</div>
            <div class="cs-label">获得 XP</div>
          </div>
        </div>
        <div class="comp-actions">
          <button class="btn btn-s" id="retryBtn">重新练习</button>
          <button class="btn btn-p" id="backHomeBtn">返回首页</button>
        </div>
      </div>
    `;
  }

  /** 绑定事件 */
  private bindEvents() {
    // 计划切换
    this.querySelectorAll('.ps-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const planId = (chip as HTMLElement).dataset.planId;
        if (planId && planId !== this.currentPlanId) {
          this.currentPlanId = planId;
          await learningStore.setCurrentPlanId(planId);
          this.updatePlanSwitcher();
          this.updatePreLesson();
        }
      });
    });

    // 前置回顾折叠
    const toggle = this.querySelector('#preLessonToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const content = this.querySelector('#preLessonContent') as HTMLElement;
        const arrow = this.querySelector('#pltArrow');
        if (content) {
          content.classList.toggle('show');
          if (arrow) {
            arrow.innerHTML = content.classList.contains('show') ? '&#9650;' : '&#9660;';
          }
        }
      });
    }

    // 单选题选项点击
    this.querySelectorAll('.opt:not(.off)').forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.submitted) return;
        // 清除之前的选中
        this.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        // 选中当前
        opt.classList.add('sel');
        this.selectedOpt = (opt as HTMLElement).dataset.label || null;
        // 显示提交按钮
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.remove('disabled');
        }
      });
    });

    // 填空题输入
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      fillInput.addEventListener('input', () => {
        this.selectedOpt = fillInput.value.trim();
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.toggle('disabled', !this.selectedOpt);
        }
      });
    }

    // 判断题按钮点击
    this.querySelectorAll('.tf-btn:not(.off)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.submitted) return;
        // 清除之前的选中
        this.querySelectorAll('.tf-btn').forEach(b => {
          b.classList.remove('sel-t', 'sel-f');
        });
        // 选中当前
        const tfVal = (btn as HTMLElement).dataset.tf;
        if (tfVal === 'true') {
          btn.classList.add('sel-t');
        } else {
          btn.classList.add('sel-f');
        }
        this.selectedOpt = tfVal || null;
        // 显示提交按钮
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.remove('disabled');
        }
      });
    });

    // 提交按钮
    const submitBtn = this.querySelector('#submitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!this.selectedOpt || this.submitted) return;
        this.handleSubmit();
      });
    }

    // AI 讲解按钮
    const aiBtn = this.querySelector('#aiExplainBtn');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        const q = this.questions[this.currentQ];
        if (!q) return;
        // 打开教具覆盖层
        const teachOverlay = (window as any).__teachOverlay;
        if (teachOverlay) {
          teachOverlay.open(
            `${q.type} - AI 详细讲解`,
            [
              { type: 'guide', text: `正在为你讲解这道${q.type}...` },
              { type: 'guide', text: q.explain },
              { type: 'guide', text: '你可以继续提问，了解更多细节。' },
            ],
            { question: q }
          );
        }
      });
    }

    // 查看结果按钮
    const showResultBtn = this.querySelector('#showResultBtn');
    if (showResultBtn) {
      showResultBtn.addEventListener('click', () => {
        this.showCompletion();
      });
    }

    // 重新练习按钮
    const retryBtn = this.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.currentQ = 0;
        this.correct = 0;
        this.xp = 0;
        this.selectedOpt = null;
        this.submitted = false;
        this.render();
      });
    }

    // 返回首页按钮
    const backHomeBtn = this.querySelector('#backHomeBtn');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'home' });
      });
    }
  }

  /** 提交答案 */
  private handleSubmit() {
    this.submitted = true;
    const q = this.questions[this.currentQ];
    if (!q) return;

    const isCorrect = this.selectedOpt?.toLowerCase() === q.ans.toLowerCase();

    if (isCorrect) {
      this.correct++;
      // 根据难度计算 XP
      const xpGain = q.diff * 10;
      this.xp += xpGain;
      learningStore.addXP(xpGain);

      // 标记正确选项
      this.querySelectorAll('.opt').forEach(opt => {
        if ((opt as HTMLElement).dataset.label === q.ans) {
          opt.classList.add('correct');
        }
      });
    } else {
      // 标记错误选项和正确选项
      this.querySelectorAll('.opt').forEach(opt => {
        const label = (opt as HTMLElement).dataset.label;
        if (label === this.selectedOpt) {
          opt.classList.add('wrong');
        }
        if (label === q.ans) {
          opt.classList.add('correct');
        }
      });
    }

    // 更新反馈和操作区
    const feedbackEl = this.querySelector('#feedback');
    if (feedbackEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderFeedback();
      const newFeedback = tempDiv.querySelector('#feedback');
      if (newFeedback) {
        feedbackEl.replaceWith(newFeedback);
      }
    }

    // 更新操作区
    const actionsEl = this.querySelector('.q-actions');
    if (actionsEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderActions();
      const newActions = tempDiv.querySelector('.q-actions');
      if (newActions) {
        actionsEl.replaceWith(newActions);
      }
    }

    // 重新绑定新元素的事件
    this.bindNewEvents();

    // 2.2 秒后自动下一题
    setTimeout(() => {
      if (this.currentQ < this.total - 1) {
        this.nextQuestion();
      }
    }, 2200);
  }

  /** 绑定新渲染元素的事件 */
  private bindNewEvents() {
    // AI 讲解按钮
    const aiBtn = this.querySelector('#aiExplainBtn');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        const q = this.questions[this.currentQ];
        if (!q) return;
        const teachOverlay = (window as any).__teachOverlay;
        if (teachOverlay) {
          teachOverlay.open(
            `${q.type} - AI 详细讲解`,
            [
              { type: 'guide', text: `正在为你讲解这道${q.type}...` },
              { type: 'guide', text: q.explain },
              { type: 'guide', text: '你可以继续提问，了解更多细节。' },
            ],
            { question: q }
          );
        }
      });
    }

    // 查看结果按钮
    const showResultBtn = this.querySelector('#showResultBtn');
    if (showResultBtn) {
      showResultBtn.addEventListener('click', () => {
        this.showCompletion();
      });
    }
  }

  /** 下一题 */
  private nextQuestion() {
    this.currentQ++;
    this.selectedOpt = null;
    this.submitted = false;

    // 更新进度
    const progressEl = this.querySelector('.ex-progress');
    if (progressEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderProgress();
      const newProgress = tempDiv.querySelector('.ex-progress');
      if (newProgress) {
        progressEl.replaceWith(newProgress);
      }
    }

    // 更新题目
    const qCard = this.querySelector('.q-card');
    if (qCard) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderQuestion();
      const newCard = tempDiv.querySelector('.q-card');
      if (newCard) {
        qCard.replaceWith(newCard);
      }
    }

    // 更新反馈
    const feedbackEl = this.querySelector('#feedback');
    if (feedbackEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderFeedback();
      const newFeedback = tempDiv.querySelector('#feedback');
      if (newFeedback) {
        feedbackEl.replaceWith(newFeedback);
      }
    }

    // 更新操作区
    const actionsEl = this.querySelector('.q-actions');
    if (actionsEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderActions();
      const newActions = tempDiv.querySelector('.q-actions');
      if (newActions) {
        actionsEl.replaceWith(newActions);
      }
    }

    // 重新绑定题目事件
    this.bindQuestionEvents();
  }

  /** 绑定题目相关事件（切换题目后使用） */
  private bindQuestionEvents() {
    // 单选题选项点击
    this.querySelectorAll('.opt:not(.off)').forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.submitted) return;
        this.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        this.selectedOpt = (opt as HTMLElement).dataset.label || null;
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.remove('disabled');
        }
      });
    });

    // 填空题输入
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      fillInput.addEventListener('input', () => {
        this.selectedOpt = fillInput.value.trim();
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.toggle('disabled', !this.selectedOpt);
        }
      });
    }

    // 判断题按钮点击
    this.querySelectorAll('.tf-btn:not(.off)').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.submitted) return;
        this.querySelectorAll('.tf-btn').forEach(b => {
          b.classList.remove('sel-t', 'sel-f');
        });
        const tfVal = (btn as HTMLElement).dataset.tf;
        if (tfVal === 'true') {
          btn.classList.add('sel-t');
        } else {
          btn.classList.add('sel-f');
        }
        this.selectedOpt = tfVal || null;
        const submitBtn = this.querySelector('#submitBtn');
        if (submitBtn) {
          submitBtn.classList.remove('disabled');
        }
      });
    });

    // 提交按钮
    const submitBtn = this.querySelector('#submitBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!this.selectedOpt || this.submitted) return;
        this.handleSubmit();
      });
    }
  }

  /** 显示完成界面 */
  private showCompletion() {
    const viewEl = this.querySelector('.exercise-view');
    if (!viewEl) return;

    viewEl.innerHTML = `
      ${this.renderPlanSwitcher()}
      ${this.renderCompletion()}
    `;

    // 触发完成事件
    eventBus.emit(AppEvents.EXERCISE_COMPLETED, {
      correct: this.correct,
      total: this.total,
      xp: this.xp,
      accuracy: this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0,
    });

    // 绑定完成界面事件
    this.querySelectorAll('.ps-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const planId = (chip as HTMLElement).dataset.planId;
        if (planId) {
          this.currentPlanId = planId;
          await learningStore.setCurrentPlanId(planId);
        }
      });
    });

    const retryBtn = this.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.currentQ = 0;
        this.correct = 0;
        this.xp = 0;
        this.selectedOpt = null;
        this.submitted = false;
        this.render();
      });
    }

    const backHomeBtn = this.querySelector('#backHomeBtn');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'home' });
      });
    }
  }
}

customElements.define('exercise-view', ExerciseView);
