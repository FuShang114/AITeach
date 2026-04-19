/**
 * 记忆卡片视图组件
 * 支持 3D 翻转动画、评估按钮、完成界面
 */
import { learningStore } from '../storage/learning-store';
import type { LearningPlan } from '../storage/learning-store';
import { eventBus, AppEvents } from '../utils/event-bus';

// 卡片数据类型
interface FlashCard {
  front: string;
  back: string;
}

// 示例卡片数据（后续由 AI 工具生成）
const sampleCards: FlashCard[] = [
  { front: 'Python 中的<strong>列表推导式</strong>是什么？', back: '列表推导式是一种简洁创建列表的方式：<br><br><code>[x**2 for x in range(10) if x%2==0]</code><br>&rarr; <code>[0, 4, 16, 36, 64]</code>' },
  { front: '<code>len()</code> 函数的作用是什么？', back: '<code>len()</code> 返回对象的长度或元素个数。<br><br><code>len([1,2,3])</code> &rarr; <code>3</code><br><code>len("hello")</code> &rarr; <code>5</code>' },
  { front: '什么是<strong>元组（tuple）</strong>？', back: '元组是不可变的有序序列，用圆括号创建：<br><br><code>t = (1, 2, 3)</code><br>元组一旦创建就不能修改其元素。' },
  { front: '<code>dict</code> 和 <code>list</code> 的区别？', back: '<b>list</b>: 有序、可变、用索引访问<br><code>[1, 2, 3]</code><br><br><b>dict</b>: 键值对、可变、用键访问<br><code>{"a": 1, "b": 2}</code>' },
  { front: '<strong>f-string</strong> 怎么用？', back: 'f-string 是 Python 3.6+ 的格式化字符串：<br><br><code>name = "Alice"</code><br><code>f"Hello, {name}!"</code><br>&rarr; <code>"Hello, Alice!"</code>' },
];

class FlashcardView extends HTMLElement {
  // 状态
  private plans: LearningPlan[] = [];
  private currentPlanId: string | null = null;
  private cards: FlashCard[] = sampleCards;
  private currentIndex = 0;
  private isFlipped = false;
  private results: Array<{ cardIdx: number; level: 'hard' | 'medium' | 'easy' }> = [];
  private unsubscribers: Array<() => void> = [];

  connectedCallback() {
    if (this.querySelector('.fc-view')) {
      return;
    }
    this.init();
  }

  disconnectedCallback() {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private async init() {
    this.plans = await learningStore.getPlans();
    this.currentPlanId = await learningStore.getCurrentPlanId();

    if (!this.currentPlanId && this.plans.length > 0) {
      this.currentPlanId = this.plans[0].id;
      await learningStore.setCurrentPlanId(this.currentPlanId);
    }

    this.render();

    this.unsubscribers.push(
      eventBus.on(AppEvents.PLAN_SWITCHED, () => this.handlePlanSwitched()),
      eventBus.on(AppEvents.PLAN_UPDATED, () => this.handlePlanSwitched()),
    );
  }

  private async handlePlanSwitched() {
    this.plans = await learningStore.getPlans();
    this.currentPlanId = await learningStore.getCurrentPlanId();
    this.updatePlanSwitcher();
  }

  private render() {
    // 空状态：没有计划时引导创建
    if (this.plans.length === 0) {
      this.innerHTML = `
        <div class="fc-view">
          <div class="empty-state">
            <div class="empty-icon">🃏</div>
            <div class="empty-title">还没有学习计划</div>
            <div class="empty-desc">创建一个学习计划后，就可以开始记忆卡片复习了！</div>
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

    this.innerHTML = `
      <div class="fc-view">
        ${this.renderPlanSwitcher()}
        ${this.renderCounter()}
        ${this.renderCard()}
        ${this.renderEvals()}
      </div>
    `;

    this.bindEvents();
  }

  /** 计划切换条 */
  private renderPlanSwitcher(): string {
    if (this.plans.length === 0) return '';
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

    switcher.querySelectorAll('.ps-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const planId = (chip as HTMLElement).dataset.planId;
        if (planId && planId !== this.currentPlanId) {
          this.currentPlanId = planId;
          await learningStore.setCurrentPlanId(planId);
          this.updatePlanSwitcher();
        }
      });
    });
  }

  /** 卡片计数器 */
  private renderCounter(): string {
    return `<div class="fc-counter">第 ${this.currentIndex + 1} / ${this.cards.length} 张</div>`;
  }

  /** 翻转卡片 */
  private renderCard(): string {
    const card = this.cards[this.currentIndex];
    if (!card) return '';

    return `
      <div class="fc-wrap">
        <div class="fc ${this.isFlipped ? 'flip' : ''}" id="flashcard">
          <div class="fc-face fc-front">
            <div class="fc-answer">${card.front}</div>
            <div class="fc-hint">&#128064; 点击翻转查看答案</div>
          </div>
          <div class="fc-face fc-back">
            <div class="fc-answer">${card.back}</div>
          </div>
        </div>
      </div>
    `;
  }

  /** 评估按钮 */
  private renderEvals(): string {
    if (!this.isFlipped) return '';

    return `
      <div class="fc-evals">
        <button class="ev-btn h" data-level="hard">&#128549; 还不会</button>
        <button class="ev-btn m" data-level="medium">&#129300; 有点难</button>
        <button class="ev-btn e" data-level="easy">&#128522; 已掌握</button>
      </div>
    `;
  }

  /** 完成界面 */
  private renderCompletion(): string {
    const hardCount = this.results.filter(r => r.level === 'hard').length;
    const mediumCount = this.results.filter(r => r.level === 'medium').length;
    const easyCount = this.results.filter(r => r.level === 'easy').length;
    const total = this.results.length;
    const mastery = total > 0 ? Math.round((easyCount / total) * 100) : 0;

    return `
      <div class="completion">
        <div class="comp-icon" style="color:var(--md-primary)">&#127942;</div>
        <div class="comp-title">复习完成！</div>
        <div class="comp-stats">
          <div class="cs-item">
            <div class="cs-val" style="color:var(--md-error)">${hardCount}</div>
            <div class="cs-label">还不会</div>
          </div>
          <div class="cs-item">
            <div class="cs-val" style="color:var(--md-warning)">${mediumCount}</div>
            <div class="cs-label">有点难</div>
          </div>
          <div class="cs-item">
            <div class="cs-val" style="color:var(--md-success)">${easyCount}</div>
            <div class="cs-label">已掌握</div>
          </div>
        </div>
        <div class="comp-actions">
          <button class="btn btn-s" id="retryCardsBtn">&#128260; 重新复习</button>
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
        }
      });
    });

    // 卡片翻转
    const flashcard = this.querySelector('#flashcard') as HTMLElement;
    if (flashcard) {
      flashcard.addEventListener('click', () => {
        if (this.isFlipped) return;
        this.isFlipped = true;
        flashcard.classList.add('flip');

        // 翻转后显示评估按钮
        setTimeout(() => {
          const evalsEl = this.querySelector('.fc-evals') as HTMLElement;
          if (evalsEl) {
            evalsEl.innerHTML = '';
          }
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = this.renderEvals();
          const newEvals = tempDiv.querySelector('.fc-evals');
          if (newEvals) {
            const viewEl = this.querySelector('.fc-view');
            if (viewEl) {
              viewEl.appendChild(newEvals);
              this.bindEvalEvents();
            }
          }
        }, 300);
      });
    }

    // 评估按钮
    this.bindEvalEvents();
  }

  /** 绑定评估按钮事件 */
  private bindEvalEvents() {
    this.querySelectorAll('.ev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = (btn as HTMLElement).dataset.level as 'hard' | 'medium' | 'easy';
        if (!level) return;

        this.results.push({ cardIdx: this.currentIndex, level });

        // 计算经验值
        const xpMap = { hard: 5, medium: 10, easy: 15 };
        learningStore.addXP(xpMap[level]);

        // 下一张卡片或完成
        if (this.currentIndex < this.cards.length - 1) {
          this.currentIndex++;
          this.isFlipped = false;
          this.updateCardContent();
        } else {
          this.showCompletion();
        }
      });
    });
  }

  /** 更新卡片内容（不重新渲染整个视图） */
  private updateCardContent() {
    // 更新计数器
    const counter = this.querySelector('.fc-counter');
    if (counter) {
      counter.textContent = `第 ${this.currentIndex + 1} / ${this.cards.length} 张`;
    }

    // 更新卡片
    const wrap = this.querySelector('.fc-wrap');
    if (wrap) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderCard();
      const newWrap = tempDiv.querySelector('.fc-wrap');
      if (newWrap) {
        wrap.replaceWith(newWrap);
      }
    }

    // 移除评估按钮
    const evalsEl = this.querySelector('.fc-evals');
    if (evalsEl) {
      evalsEl.remove();
    }

    // 重新绑定卡片事件
    this.bindCardEvents();
  }

  /** 绑定卡片翻转事件 */
  private bindCardEvents() {
    const flashcard = this.querySelector('#flashcard') as HTMLElement;
    if (flashcard) {
      flashcard.addEventListener('click', () => {
        if (this.isFlipped) return;
        this.isFlipped = true;
        flashcard.classList.add('flip');

        setTimeout(() => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = this.renderEvals();
          const newEvals = tempDiv.querySelector('.fc-evals');
          if (newEvals) {
            const viewEl = this.querySelector('.fc-view');
            if (viewEl) {
              viewEl.appendChild(newEvals);
              this.bindEvalEvents();
            }
          }
        }, 300);
      });
    }
  }

  /** 显示完成界面 */
  private showCompletion() {
    const viewEl = this.querySelector('.fc-view');
    if (!viewEl) return;

    viewEl.innerHTML = `
      ${this.renderPlanSwitcher()}
      ${this.renderCompletion()}
    `;

    // 触发完成事件
    eventBus.emit(AppEvents.FLASHCARD_REVIEWED, {
      total: this.cards.length,
      results: this.results,
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

    const retryBtn = this.querySelector('#retryCardsBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.currentIndex = 0;
        this.isFlipped = false;
        this.results = [];
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

customElements.define('flashcard-view', FlashcardView);
