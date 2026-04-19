/**
 * 学习路径视图组件 - 多计划管理
 * 展示计划Tab切换、进度统计、阶段时间线、创建计划模态框
 * 使用纯 HTMLElement，与 app-layout.ts 和 home-view.ts 保持一致
 */
import { learningStore } from '../storage/learning-store';
import type { LearningPlan, LearningPlanPhase } from '../storage/learning-store';
import { eventBus, AppEvents } from '../utils/event-bus';

// 学科配色映射
const SUBJECT_MAP: Record<string, { color: string; bg: string; icon: string }> = {
  Python: { color: '#1cb0f6', bg: '#e0f2fe', icon: '🐍' },
  JavaScript: { color: '#f59e0b', bg: '#fef3c7', icon: '⚡' },
  数据结构: { color: '#8b5cf6', bg: '#f5f3ff', icon: '🌳' },
  算法: { color: '#ef4444', bg: '#fef2f2', icon: '🧮' },
  数据库: { color: '#06b6d4', bg: '#ecfeff', icon: '🗄️' },
  机器学习: { color: '#ec4899', bg: '#fdf2f8', icon: '🤖' },
  Go: { color: '#00add8', bg: '#e0f7fa', icon: '🌐' },
};

// 水平选项
const LEVEL_OPTIONS = [
  { value: 1, label: 'Lv.1 入门' },
  { value: 2, label: 'Lv.2 基础' },
  { value: 3, label: 'Lv.3 初级' },
  { value: 4, label: 'Lv.4 中级' },
  { value: 5, label: 'Lv.5 进阶' },
  { value: 6, label: 'Lv.6 熟练' },
  { value: 7, label: 'Lv.7 高级' },
  { value: 8, label: 'Lv.8 精通' },
  { value: 9, label: 'Lv.9 专家' },
  { value: 10, label: 'Lv.10 大师' },
];

class LearningPathView extends HTMLElement {
  private unsubscribers: Array<() => void> = [];

  connectedCallback() {
    // 防止重复渲染
    if (this.querySelector('.path-view')) {
      return;
    }
    this.render();

    // 监听计划变化事件，重新渲染
    this.unsubscribers.push(
      eventBus.on(AppEvents.PLAN_UPDATED, () => this.render()),
      eventBus.on(AppEvents.PLAN_DELETED, () => this.render()),
      eventBus.on(AppEvents.PLAN_SWITCHED, () => this.render()),
    );
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private async render() {
    const [plans, currentPlanId] = await Promise.all([
      learningStore.getPlans(),
      learningStore.getCurrentPlanId(),
    ]);

    // 如果没有当前计划但有计划列表，默认选第一个
    let activeId = currentPlanId;
    if (!activeId && plans.length > 0) {
      activeId = plans[0].id;
      await learningStore.setCurrentPlanId(activeId);
    }

    const currentPlan = plans.find(p => p.id === activeId) || null;

    this.innerHTML = `
      <div class="path-view">
        ${plans.length === 0
          ? this.renderEmptyState()
          : `
            ${this.renderTabs(plans, activeId!)}
            ${this.renderNewPlanBtn()}
            ${currentPlan ? this.renderPlanDetail(currentPlan) : ''}
          `
        }
        ${this.renderModal()}
      </div>
    `;

    this.bindEvents(plans, activeId);
  }

  /** 空状态 - 没有计划时显示创建引导 */
  private renderEmptyState(): string {
    return `
      <div style="text-align:center; padding:60px 20px;">
        <div style="font-size:48px; margin-bottom:12px;">🎯</div>
        <div style="font-size:18px; font-weight:700; color:var(--md-on-background);">还没有学习计划</div>
        <div style="font-size:13px; color:var(--md-on-surface-variant); margin-top:8px;">创建一个学习计划，开始你的 AI 智能学习之旅吧！</div>
        <button class="btn btn-p" id="emptyCreateBtn" style="margin-top:20px; padding:12px 24px; font-size:14px;">创建学习计划</button>
      </div>
    `;
  }

  /** 计划Tab切换栏 */
  private renderTabs(plans: LearningPlan[], currentId: string): string {
    const tabs = plans.map(plan => {
      const isActive = plan.id === currentId;
      const isPaused = plan.status === 'paused';
      return `
        <button class="path-tab ${isActive ? 'active' : ''}" data-plan-id="${plan.id}">
          <span class="pt-dot ${isPaused ? 'paused' : ''}"></span>
          ${plan.name}
        </button>
      `;
    }).join('');

    return `<div class="path-tabs">${tabs}</div>`;
  }

  /** 新建计划按钮 */
  private renderNewPlanBtn(): string {
    return `
      <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <button class="btn btn-p btn-sm" id="newPlanBtn">+ 新建计划</button>
      </div>
    `;
  }

  /** 计划头部信息 */
  private renderPlanHeader(plan: LearningPlan): string {
    const isPaused = plan.status === 'paused';
    const pauseLabel = isPaused ? '恢复' : '暂停';
    const pauseBtnClass = isPaused ? 'btn btn-p btn-sm' : 'btn btn-s btn-sm';

    return `
      <div class="path-header">
        <div class="path-header-info">
          <div class="ph-title">${plan.icon || '📚'} ${plan.name}</div>
          <div class="ph-sub">${plan.subject} · 水平 ${plan.from} → ${plan.to} · 预计 ${plan.days} 天</div>
        </div>
        <div class="path-header-actions">
          <button class="${pauseBtnClass}" id="pauseBtn">${pauseLabel}</button>
          <button class="btn btn-danger btn-sm" id="archiveBtn">归档</button>
        </div>
      </div>
    `;
  }

  /** 进度统计 - 3列网格 */
  private renderStats(plan: LearningPlan): string {
    const phaseCount = plan.phases.length;
    const levelBoost = plan.to - plan.from;

    return `
      <div class="path-stats">
        <div class="ps-box">
          <div class="ps-val" style="color:var(--md-primary);">+${levelBoost}</div>
          <div class="ps-lbl">水平提升</div>
        </div>
        <div class="ps-box">
          <div class="ps-val" style="color:var(--md-secondary);">${phaseCount}</div>
          <div class="ps-lbl">学习阶段</div>
        </div>
        <div class="ps-box">
          <div class="ps-val" style="color:var(--md-tertiary);">${plan.days}</div>
          <div class="ps-lbl">预计天数</div>
        </div>
      </div>
    `;
  }

  /** 目标卡片 */
  private renderGoal(plan: LearningPlan): string {
    return `
      <div class="path-goal">
        🎯 目标：从 ${plan.subject} 水平 ${plan.from} 提升到水平 ${plan.to}，预计 ${plan.days} 天完成
      </div>
    `;
  }

  /** 阶段时间线 */
  private renderTimeline(plan: LearningPlan): string {
    const items = plan.phases.map((phase, idx) => {
      const isDone = phase.done;
      const isCurrent = phase.current;
      const isLocked = phase.locked;

      let cardClass = 'tl-card';
      if (isDone) cardClass += ' done';
      else if (isCurrent) cardClass += ' cur';
      else if (isLocked) cardClass += ' lock';

      // 阶段圆点颜色
      let dotStyle = '';
      if (isDone) {
        dotStyle = `background:var(--md-success);`;
      } else if (isCurrent) {
        dotStyle = `background:${plan.color || 'var(--md-primary)'};`;
      } else if (isLocked) {
        dotStyle = `background:var(--md-outline-variant);`;
      } else {
        dotStyle = `background:var(--md-outline);`;
      }

      // 进度条颜色
      let fillStyle = '';
      if (isDone) {
        fillStyle = `background:var(--md-success); width:100%;`;
      } else if (isCurrent) {
        fillStyle = `background:${plan.color || 'var(--md-primary)'}; width:${phase.pct}%;`;
      } else {
        fillStyle = `background:var(--md-outline-variant); width:0%;`;
      }

      return `
        <div class="tl-item">
          <div class="tl-dot" style="${dotStyle}">${idx + 1}</div>
          <div class="${cardClass}">
            <div class="tl-title">${phase.name}</div>
            <div class="tl-desc">${this.getPhaseDescription(phase, idx)}</div>
            <div class="tl-prog">
              <div class="tl-prog-text">
                <span>${isDone ? '已完成' : isCurrent ? '进行中' : isLocked ? '未解锁' : '待开始'}</span>
                <span>${phase.pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="${fillStyle}"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="tl">${items}</div>`;
  }

  /** 获取阶段描述文本 */
  private getPhaseDescription(phase: LearningPlanPhase, idx: number): string {
    const descriptions = [
      '夯实基础，掌握核心概念和基本技能',
      '提升能力，深入理解原理并灵活运用',
      '深入精通，达到专家级别的理解和实践能力',
    ];
    return descriptions[idx] || '完成本阶段学习目标';
  }

  /** 计划详情（头部+统计+目标+时间线） */
  private renderPlanDetail(plan: LearningPlan): string {
    return `
      ${this.renderPlanHeader(plan)}
      ${this.renderStats(plan)}
      ${this.renderGoal(plan)}
      ${this.renderTimeline(plan)}
    `;
  }

  /** 创建计划模态框 */
  private renderModal(): string {
    const subjectOptions = Object.entries(SUBJECT_MAP).map(([name, cfg]) => `
      <div class="subj-opt" data-subject="${name}" role="button" tabindex="0">
        <div class="so-icon">${cfg.icon}</div>
        <div>${name}</div>
      </div>
    `).join('');

    const levelSelects = (id: string, label: string) => {
      const options = LEVEL_OPTIONS.map(lv =>
        `<option value="${lv.value}">${lv.label}</option>`
      ).join('');
      return `
        <div class="form-group">
          <label class="form-label">${label}</label>
          <select class="form-select" id="${id}">
            ${options}
          </select>
        </div>
      `;
    };

    return `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal">
          <div class="modal-header">
            <div class="mh-title">创建学习计划</div>
            <button class="modal-close" id="modalClose">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">选择学科</label>
              <div class="subj-options" id="subjectOptions">
                ${subjectOptions}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">计划名称</label>
              <input class="form-input" id="planNameInput" type="text" placeholder="例如：Python 进阶之路" />
              <div class="form-hint">留空将自动生成名称</div>
            </div>
            ${levelSelects('fromLevel', '当前水平')}
            ${levelSelects('toLevel', '目标水平')}
            <div class="modal-actions">
              <button class="btn btn-s" id="modalCancelBtn">取消</button>
              <button class="btn btn-p" id="modalCreateBtn">创建计划</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /** 绑定所有事件 */
  private bindEvents(plans: LearningPlan[], currentPlanId: string | null) {
    // 空状态 - 创建计划按钮
    const emptyCreateBtn = this.querySelector('#emptyCreateBtn');
    if (emptyCreateBtn) {
      emptyCreateBtn.addEventListener('click', () => this.startAIPlanCreation());
    }

    // 新建计划按钮
    const newPlanBtn = this.querySelector('#newPlanBtn');
    if (newPlanBtn) {
      newPlanBtn.addEventListener('click', () => this.startAIPlanCreation());
    }

    // Tab 切换
    this.querySelectorAll('.path-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        const planId = (tab as HTMLElement).dataset.planId;
        if (planId) {
          await learningStore.setCurrentPlanId(planId);
          // PLAN_SWITCHED 事件会触发重新渲染
        }
      });
    });

    // 暂停/恢复按钮
    const pauseBtn = this.querySelector('#pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', async () => {
        if (!currentPlanId) return;
        const plan = await learningStore.getPlan(currentPlanId);
        if (!plan) return;
        plan.status = plan.status === 'paused' ? 'active' : 'paused';
        await learningStore.savePlan(plan);
        // PLAN_UPDATED 事件会触发重新渲染
      });
    }

    // 归档按钮
    const archiveBtn = this.querySelector('#archiveBtn');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', async () => {
        if (!currentPlanId) return;
        const allPlans = await learningStore.getPlans();
        if (allPlans.length <= 1) {
          alert('至少需要保留一个学习计划！');
          return;
        }
        if (!confirm('确定要归档（删除）这个计划吗？此操作不可撤销。')) {
          return;
        }
        await learningStore.deletePlan(currentPlanId);
        // 切换到第一个剩余计划
        const remaining = await learningStore.getPlans();
        if (remaining.length > 0) {
          await learningStore.setCurrentPlanId(remaining[0].id);
        }
        // PLAN_DELETED 事件会触发重新渲染
      });
    }

    // 模态框事件
    this.bindModalEvents();
  }

  /** 绑定模态框事件 */
  private bindModalEvents() {
    const overlay = this.querySelector('#modalOverlay') as HTMLElement;
    const closeBtn = this.querySelector('#modalClose');
    const cancelBtn = this.querySelector('#modalCancelBtn');
    const createBtn = this.querySelector('#modalCreateBtn');
    const subjectOptions = this.querySelector('#subjectOptions');

    if (!overlay) return;

    // 关闭模态框
    const closeModal = () => overlay.classList.remove('show');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // 学科选择
    let selectedSubject = '';
    if (subjectOptions) {
      subjectOptions.querySelectorAll('.subj-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          subjectOptions.querySelectorAll('.subj-opt').forEach(o => o.classList.remove('sel'));
          opt.classList.add('sel');
          selectedSubject = (opt as HTMLElement).dataset.subject || '';
        });
      });
    }

    // 创建计划
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        if (!selectedSubject) {
          alert('请选择一个学科！');
          return;
        }

        const nameInput = this.querySelector('#planNameInput') as HTMLInputElement;
        const fromSelect = this.querySelector('#fromLevel') as HTMLSelectElement;
        const toSelect = this.querySelector('#toLevel') as HTMLSelectElement;

        const from = parseInt(fromSelect?.value || '1');
        const to = parseInt(toSelect?.value || '5');

        if (from >= to) {
          alert('目标水平必须高于当前水平！');
          return;
        }

        const cfg = SUBJECT_MAP[selectedSubject] || { color: '#4f6af6', bg: '#dce1ff', icon: '📚' };
        const planName = nameInput?.value.trim() || `${selectedSubject} Lv.${from} → Lv.${to}`;

        // 估算天数（每提升1级约15天）
        const days = (to - from) * 15;

        // 生成3个默认阶段
        const phases: LearningPlanPhase[] = [
          {
            name: '基础巩固',
            done: false,
            pct: 0,
            current: true,
            locked: false,
          },
          {
            name: '能力提升',
            done: false,
            pct: 0,
            current: false,
            locked: true,
          },
          {
            name: '深入精通',
            done: false,
            pct: 0,
            current: false,
            locked: true,
          },
        ];

        const plan: LearningPlan = {
          id: crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
          name: planName,
          subject: selectedSubject,
          icon: cfg.icon,
          color: cfg.color,
          bg: cfg.bg,
          from,
          to,
          progress: 0,
          days,
          status: 'active',
          phases,
          lessons: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await learningStore.savePlan(plan);
        await learningStore.setCurrentPlanId(plan.id);
        eventBus.emit(AppEvents.PLAN_CREATED, { plan });

        closeModal();
        // PLAN_UPDATED 事件会触发重新渲染
      });
    }
  }

  /** 通过 AI 对话引导创建学习计划 */
  private startAIPlanCreation() {
    eventBus.emit(AppEvents.AI_CREATE_PLAN_START);
  }

  /** 打开模态框 */
  private openModal() {
    const overlay = this.querySelector('#modalOverlay') as HTMLElement;
    if (overlay) {
      // 重置表单状态
      overlay.querySelectorAll('.subj-opt').forEach(o => o.classList.remove('sel'));
      const nameInput = this.querySelector('#planNameInput') as HTMLInputElement;
      if (nameInput) nameInput.value = '';
      const fromSelect = this.querySelector('#fromLevel') as HTMLSelectElement;
      if (fromSelect) fromSelect.value = '1';
      const toSelect = this.querySelector('#toLevel') as HTMLSelectElement;
      if (toSelect) toSelect.value = '5';

      overlay.classList.add('show');
    }
  }
}

customElements.define('learning-path-view', LearningPathView);
