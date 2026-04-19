/**
 * 计划预览面板组件
 * 监听 AI 流式输出事件，实时渲染学习计划预览
 * 用户可确认保存或返回修改
 */
import { eventBus, AppEvents } from '../utils/event-bus';
import { learningStore } from '../storage/learning-store';
import type { LearningPlan, LearningPlanPhase, LearningLesson } from '../storage/learning-store';

interface PlanOverview {
  name: string;
  subject: string;
  from: number;
  to: number;
  days: number;
  timePerDay: string;
}

interface PlanLessonData {
  title: string;
  duration: string;
}

interface PlanPhaseData {
  index: number;
  name: string;
  dayRange: string;
  description: string;
  lessons: PlanLessonData[];
}

class PlanPreviewPanel extends HTMLElement {
  private overview: PlanOverview | null = null;
  private phases: PlanPhaseData[] = [];
  private currentPhase: PlanPhaseData | null = null;
  private isDone = false;
  private unsubscribers: Array<() => void> = [];

  connectedCallback() {
    if (this.id !== 'planPreviewPanel') {
      this.id = 'planPreviewPanel';
    }
    this.style.display = 'none';
    this.className = 'plan-preview-panel';

    this.unsubscribers.push(
      eventBus.on(AppEvents.PLAN_PREVIEW_OVERVIEW, (data: PlanOverview) => {
        this.overview = data;
        this.phases = [];
        this.currentPhase = null;
        this.isDone = false;
        this.show();
        this.render();
      }),
      eventBus.on(AppEvents.PLAN_PREVIEW_PHASE, (data: PlanPhaseData) => {
        if (this.currentPhase) {
          this.phases.push(this.currentPhase);
        }
        this.currentPhase = data;
        this.render();
      }),
      eventBus.on(AppEvents.PLAN_PREVIEW_LESSON, (data: PlanLessonData) => {
        if (this.currentPhase) {
          this.currentPhase.lessons.push(data);
          this.render();
        }
      }),
      eventBus.on(AppEvents.PLAN_PREVIEW_DONE, () => {
        if (this.currentPhase) {
          this.phases.push(this.currentPhase);
          this.currentPhase = null;
        }
        this.isDone = true;
        this.render();
      }),
    );
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private show() {
    this.style.display = 'flex';
  }

  private hide() {
    this.style.display = 'none';
    this.overview = null;
    this.phases = [];
    this.currentPhase = null;
    this.isDone = false;
  }

  private render() {
    this.innerHTML = `
      <style>
        .plan-preview-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Noto Sans SC', system-ui, -apple-system, sans-serif;
        }
        .ppp-container {
          background: var(--md-surface-container, #f8f9fa);
          border-radius: var(--r-md, 16px);
          max-width: 640px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          padding: 24px;
        }
        .ppp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .ppp-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--md-on-surface, #1a1a2e);
        }
        .ppp-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: var(--md-surface-container-high, #e8eaed);
          color: var(--md-on-surface-variant, #5f6368);
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .ppp-close:hover {
          background: var(--md-surface-container-highest, #d2d5d9);
        }
        .ppp-overview {
          background: var(--md-primary-container, #e8f0fe);
          border-radius: var(--r-md, 12px);
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .ppp-overview-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--md-on-primary-container, #1a3a5c);
          margin-bottom: 8px;
        }
        .ppp-overview-meta {
          font-size: 13px;
          color: var(--md-on-primary-container, #1a3a5c);
          opacity: 0.8;
        }
        .ppp-phase {
          margin-bottom: 16px;
          background: var(--md-surface, #ffffff);
          border-radius: var(--r-md, 12px);
          padding: 16px;
          border: 1px solid var(--md-outline-variant, #c4c7c9);
        }
        .ppp-phase-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .ppp-phase-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--md-primary, #4285f4);
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ppp-phase-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--md-on-surface, #1a1a2e);
        }
        .ppp-phase-desc {
          font-size: 13px;
          color: var(--md-on-surface-variant, #5f6368);
          margin-bottom: 12px;
          padding-left: 36px;
        }
        .ppp-lesson {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          margin-left: 36px;
          border-radius: 8px;
          background: var(--md-surface-container-low, #f1f3f4);
          margin-bottom: 6px;
          font-size: 13px;
          color: var(--md-on-surface, #1a1a2e);
        }
        .ppp-lesson-icon {
          flex-shrink: 0;
        }
        .ppp-lesson-title {
          flex: 1;
        }
        .ppp-lesson-duration {
          font-size: 12px;
          color: var(--md-on-surface-variant, #5f6368);
          flex-shrink: 0;
        }
        .ppp-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--md-outline-variant, #c4c7c9);
        }
        .ppp-btn {
          padding: 10px 24px;
          border-radius: 20px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ppp-btn-primary {
          background: var(--md-primary, #4285f4);
          color: white;
        }
        .ppp-btn-primary:hover {
          box-shadow: 0 2px 8px rgba(66, 133, 244, 0.4);
        }
        .ppp-btn-secondary {
          background: var(--md-surface-container-high, #e8eaed);
          color: var(--md-on-surface, #1a1a2e);
        }
        .ppp-btn-secondary:hover {
          background: var(--md-surface-container-highest, #d2d5d9);
        }
        .ppp-loading {
          text-align: center;
          padding: 20px;
          color: var(--md-on-surface-variant, #5f6368);
          font-size: 14px;
        }
        .ppp-loading::after {
          content: '';
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--md-primary, #4285f4);
          margin-left: 4px;
          animation: ppp-blink 1s infinite;
        }
        @keyframes ppp-blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      </style>
      <div class="ppp-container">
        <div class="ppp-header">
          <div class="ppp-title">学习计划预览</div>
          <button class="ppp-close" id="pppClose">&times;</button>
        </div>
        ${this.renderContent()}
        ${this.isDone ? this.renderActions() : ''}
      </div>
    `;

    this.bindEvents();
  }

  private renderContent(): string {
    let html = '';

    // Overview
    if (this.overview) {
      html += `
        <div class="ppp-overview">
          <div class="ppp-overview-name">${this.overview.name}</div>
          <div class="ppp-overview-meta">
            ${this.overview.from !== undefined ? `水平 ${this.overview.from} → ${this.overview.to}` : ''}
            ${this.overview.days ? ` | 预计 ${this.overview.days} 天` : ''}
            ${this.overview.timePerDay ? ` | 每天 ${this.overview.timePerDay}` : ''}
          </div>
        </div>
      `;
    }

    // Completed phases
    for (const phase of this.phases) {
      html += this.renderPhase(phase);
    }

    // Current phase (streaming)
    if (this.currentPhase) {
      html += this.renderPhase(this.currentPhase);
    }

    // Loading indicator
    if (!this.isDone) {
      html += `<div class="ppp-loading">正在生成计划</div>`;
    }

    return html;
  }

  private renderPhase(phase: PlanPhaseData): string {
    const lessonsHtml = phase.lessons.map(lesson => `
      <div class="ppp-lesson">
        <span class="ppp-lesson-icon">📝</span>
        <span class="ppp-lesson-title">${lesson.title}</span>
        <span class="ppp-lesson-duration">${lesson.duration}</span>
      </div>
    `).join('');

    return `
      <div class="ppp-phase">
        <div class="ppp-phase-header">
          <div class="ppp-phase-num">${phase.index}</div>
          <div class="ppp-phase-name">${phase.name}</div>
        </div>
        ${phase.description ? `<div class="ppp-phase-desc">${phase.description}</div>` : ''}
        ${lessonsHtml}
      </div>
    `;
  }

  private renderActions(): string {
    return `
      <div class="ppp-actions">
        <button class="ppp-btn ppp-btn-secondary" id="pppBack">返回修改</button>
        <button class="ppp-btn ppp-btn-primary" id="pppConfirm">确认保存</button>
      </div>
    `;
  }

  private bindEvents() {
    const closeBtn = this.querySelector('#pppClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    const confirmBtn = this.querySelector('#pppConfirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmPlan());
    }

    const backBtn = this.querySelector('#pppBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.hide();
        eventBus.emit(AppEvents.L2D_OPEN_CHAT);
      });
    }
  }

  private async confirmPlan() {
    if (!this.overview) return;

    // Build LearningPlan object from parsed data
    const allPhases: PlanPhaseData[] = [...this.phases];
    if (this.currentPhase) {
      allPhases.push(this.currentPhase);
    }

    const phases: LearningPlanPhase[] = allPhases.map((phase, idx) => ({
      name: phase.name,
      done: false,
      pct: 0,
      current: idx === 0,
      locked: idx > 0,
    }));

    const lessons: LearningLesson[] = [];
    allPhases.forEach((phase, phaseIdx) => {
      phase.lessons.forEach((lesson, lessonIdx) => {
        lessons.push({
          id: `les_${String(phaseIdx + 1).padStart(3, '0')}${String(lessonIdx + 1).padStart(3, '0')}`,
          title: lesson.title,
          icon: '📝',
          duration: lesson.duration,
          done: false,
          current: phaseIdx === 0 && lessonIdx === 0,
          locked: !(phaseIdx === 0 && lessonIdx === 0),
          points: [],
          summary: '',
        });
      });
    });

    // Default styling
    const defaultIcon = '📚';
    const defaultColor = '#4f6af6';
    const defaultBg = '#dce1ff';

    const plan: LearningPlan = {
      id: crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)),
      name: this.overview.name,
      subject: this.overview.subject,
      icon: defaultIcon,
      color: defaultColor,
      bg: defaultBg,
      from: this.overview.from,
      to: this.overview.to,
      progress: 0,
      days: this.overview.days,
      status: 'active',
      phases,
      lessons,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await learningStore.savePlan(plan);
    await learningStore.setCurrentPlanId(plan.id);

    eventBus.emit(AppEvents.PLAN_PREVIEW_CONFIRMED, { plan });
    this.hide();
  }
}

customElements.define('plan-preview-panel', PlanPreviewPanel);
