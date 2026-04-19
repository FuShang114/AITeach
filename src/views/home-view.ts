/**
 * 首页仪表盘视图组件
 * 展示学习统计、继续学习、快捷操作和个性化推荐
 * 使用纯 HTMLElement，与 app-layout.ts 保持一致
 */
import { learningStore } from '../storage/learning-store';
import type { LearningPlan, UserStats } from '../storage/learning-store';
import { eventBus, AppEvents } from '../utils/event-bus';

class HomeView extends HTMLElement {
  async connectedCallback() {
    if (this.querySelector('.home')) {
      return;
    }
    await this.render();
  }

  private async render() {
    // 并行加载所有数据
    const [stats, plans] = await Promise.all([
      learningStore.getUserStats(),
      learningStore.getPlans(),
    ]);

    const activePlans = plans.filter(p => p.status === 'active');

    this.innerHTML = `
      <div class="home">
        ${this.renderGreeting(stats)}
        ${this.renderStats(stats, activePlans)}
        ${activePlans.length > 0
          ? this.renderContinueSection(activePlans)
          : this.renderEmptyState()
        }
        ${this.renderQuickGrid()}
        ${this.renderRecommendations(plans)}
      </div>
    `;

    this.bindEvents();
  }

  /** 问候语区域 */
  private renderGreeting(stats: UserStats): string {
    const streakText = stats.streak > 0
      ? `今天是你连续学习的第 ${stats.streak} 天，继续保持！`
      : '开始你的学习之旅吧！';
    return `
      <div class="home-greeting">
        <div class="hi">👋 你好，学习者！</div>
        <div class="hi-sub">${streakText}</div>
      </div>
    `;
  }

  /** 统计概览卡片 */
  private renderStats(stats: UserStats, activePlans: LearningPlan[]): string {
    const accuracyText = stats.accuracy > 0 ? `${stats.accuracy}%` : '--';
    return `
      <div class="stats-row">
        <div class="stat-card">
          <div class="sv">${stats.xp.toLocaleString()}</div>
          <div class="sl">总 XP</div>
          <div class="strend up">+${Math.floor(stats.xp * 0.1)} 本周</div>
        </div>
        <div class="stat-card">
          <div class="sv">${activePlans.length}</div>
          <div class="sl">进行中计划</div>
        </div>
        <div class="stat-card">
          <div class="sv">${accuracyText}</div>
          <div class="sl">平均正确率</div>
        </div>
        <div class="stat-card">
          <div class="sv">${stats.streak}</div>
          <div class="sl">连续天数</div>
          <div class="strend up">🔥</div>
        </div>
      </div>
    `;
  }

  /** 继续学习区域 */
  private renderContinueSection(activePlans: LearningPlan[]): string {
    const cards = activePlans.map(plan => {
      const currentPhase = plan.phases.find(p => p.current) || plan.phases[0];
      const phaseName = currentPhase ? currentPhase.name : '未开始';
      return `
        <div class="continue-card" data-plan-id="${plan.id}">
          <div class="continue-icon" style="background:${plan.bg || 'var(--md-primary-container)'}">
            ${plan.icon || '📚'}
          </div>
          <div class="continue-info">
            <div class="ci-title">${plan.name}</div>
            <div class="ci-sub">当前阶段：${phaseName}</div>
            <div class="ci-meta">
              <span>水平 ${plan.from} → ${plan.to}</span>
              <span>预计 ${plan.days} 天</span>
            </div>
          </div>
          <div class="continue-progress">
            <div class="cp-pct">${plan.progress}%</div>
            <div class="cp-label">总进度</div>
          </div>
          <div class="continue-arrow">›</div>
        </div>
      `;
    }).join('');

    return `
      <div class="continue-section">
        <div class="section-title">继续学习</div>
        ${cards}
      </div>
    `;
  }

  /** 空状态 */
  private renderEmptyState(): string {
    return `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <div class="empty-title">还没有学习计划</div>
        <div class="empty-desc">创建一个学习计划，开始你的 AI 智能学习之旅吧！</div>
        <button class="empty-btn" id="createPlanBtn">创建学习计划</button>
      </div>
    `;
  }

  /** 快捷操作网格 */
  private renderQuickGrid(): string {
    const items = [
      { id: 'exercise', icon: '✏️', label: '练习题', desc: '巩固知识' },
      { id: 'quiz', icon: '📋', label: '综合测验', desc: '检验成果' },
      { id: 'flashcard', icon: '🃏', label: '记忆卡片', desc: '间隔复习' },
      { id: 'evaluation', icon: '📊', label: '水平评估', desc: '能力测评' },
    ];
    const cards = items.map(item => `
      <div class="quick-item" data-view="${item.id}">
        <div class="qi-icon">${item.icon}</div>
        <div class="qi-label">${item.label}</div>
        <div class="qi-desc">${item.desc}</div>
      </div>
    `).join('');

    return `
      <div>
        <div class="section-title">快捷操作</div>
        <div class="quick-grid">${cards}</div>
      </div>
    `;
  }

  /** 个性化推荐 */
  private renderRecommendations(plans: LearningPlan[]): string {
    // 基于计划数据生成推荐项
    const recs: Array<{ icon: string; title: string; sub: string; badge: string; bg: string }> = [];

    // 如果有计划，基于进度推荐
    const activePlans = plans.filter(p => p.status === 'active');
    if (activePlans.length > 0) {
      // 找出进度最低的计划作为薄弱点
      const weakest = activePlans.reduce((min, p) => p.progress < min.progress ? p : min, activePlans[0]);
      if (weakest.progress < 50) {
        recs.push({
          icon: '💪',
          title: `${weakest.name} - 薄弱点强化`,
          sub: `当前进度仅 ${weakest.progress}%，建议加强练习`,
          badge: '薄弱点',
          bg: 'var(--md-error-container)',
        });
      }

      // 间隔复习推荐
      recs.push({
        icon: '🔄',
        title: '间隔复习提醒',
        sub: '根据遗忘曲线，建议复习最近学习的内容',
        badge: '复习',
        bg: 'var(--md-info-container)',
      });
    }

    // 新内容推荐（静态）
    recs.push(
      {
        icon: '🆕',
        title: '探索新知识领域',
        sub: '尝试学习一个全新的学科，拓展你的知识面',
        badge: '新内容',
        bg: 'var(--md-success-container)',
      },
      {
        icon: '🏆',
        title: '挑战高难度测验',
        sub: '通过综合测验检验你的综合能力',
        badge: '挑战',
        bg: 'var(--md-warning-container)',
      },
    );

    const items = recs.map(rec => `
      <div class="rec-item">
        <div class="rec-icon" style="background:${rec.bg}">${rec.icon}</div>
        <div class="rec-info">
          <div class="ri-title">${rec.title}</div>
          <div class="ri-sub">${rec.sub}</div>
        </div>
        <span class="rec-badge">${rec.badge}</span>
      </div>
    `).join('');

    return `
      <div>
        <div class="section-title">为你推荐</div>
        <div class="rec-list">${items}</div>
      </div>
    `;
  }

  /** 绑定事件 */
  private bindEvents() {
    // 继续学习卡片点击 -> 切换到 exercise 视图
    this.querySelectorAll('.continue-card').forEach(card => {
      card.addEventListener('click', () => {
        const planId = (card as HTMLElement).dataset.planId;
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'exercise', planId });
      });
    });

    // 快捷操作点击
    this.querySelectorAll('.quick-item').forEach(item => {
      item.addEventListener('click', () => {
        const viewId = (item as HTMLElement).dataset.view;
        if (viewId) {
          eventBus.emit(AppEvents.VIEW_CHANGE, { viewId });
        }
      });
    });

    // 空状态 - 创建计划按钮
    const createBtn = this.querySelector('#createPlanBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'learning-path' });
      });
    }

    // 推荐项点击
    this.querySelectorAll('.rec-item').forEach(item => {
      item.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'exercise' });
      });
    });
  }
}

customElements.define('home-view', HomeView);
