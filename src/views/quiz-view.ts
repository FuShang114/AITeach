/**
 * 测验视图组件
 * 带倒计时的综合测验，支持题目切换、提交评分、结果展示
 */
import { learningStore } from '../storage/learning-store';
import type { LearningPlan } from '../storage/learning-store';
import { eventBus, AppEvents } from '../utils/event-bus';

// 题目类型定义
interface QuizQuestion {
  type: '单选题' | '填空题' | '判断题';
  text: string;
  opts?: Array<{ l: string; t: string }>;
  fill?: boolean;
  tf?: boolean;
  ans: string;
  explain?: string;
}

// 示例测验题目数据（后续由 AI 工具生成）
const sampleQuizQuestions: QuizQuestion[] = [
  { type: '单选题', text: 'Python 中用于捕获异常的关键字组合是？', opts: [{ l: 'A', t: 'try ... catch' }, { l: 'B', t: 'try ... except' }, { l: 'C', t: 'try ... handle' }, { l: 'D', t: 'catch ... finally' }], ans: 'B', explain: 'Python 使用 try...except 来捕获异常，这是 Python 特有的语法。' },
  { type: '单选题', text: '以下哪个不是 Python 的内置数据类型？', opts: [{ l: 'A', t: 'list' }, { l: 'B', t: 'array' }, { l: 'C', t: 'dict' }, { l: 'D', t: 'tuple' }], ans: 'B', explain: 'array 不是 Python 的内置数据类型，需要导入 array 模块或使用 numpy。' },
  { type: '单选题', text: 'Python 中 "==" 和 "is" 的区别是什么？', opts: [{ l: 'A', t: '没有区别' }, { l: 'B', t: '== 比较值，is 比较身份' }, { l: 'C', t: 'is 比较值，== 比较身份' }, { l: 'D', t: '== 只能用于数字' }], ans: 'B', explain: '== 比较两个对象的值是否相等，is 比较两个对象是否是同一个对象（内存地址相同）。' },
  { type: '判断题', text: 'Python 中的字典（dict）是有序的。', tf: true, ans: 'true', explain: '从 Python 3.7 开始，字典保证插入顺序。' },
  { type: '单选题', text: '以下哪个函数可以获取列表的长度？', opts: [{ l: 'A', t: 'size()' }, { l: 'B', t: 'length()' }, { l: 'C', t: 'len()' }, { l: 'D', t: 'count()' }], ans: 'C', explain: 'len() 是 Python 的内置函数，用于获取序列（列表、字符串、元组等）的长度。' },
  { type: '单选题', text: 'Python 中列表推导式的正确写法是？', opts: [{ l: 'A', t: '[x for x in range(10)]' }, { l: 'B', t: '{x for x in range(10)}' }, { l: 'C', t: '(x for x in range(10))' }, { l: 'D', t: '<x for x in range(10)>' }], ans: 'A', explain: '列表推导式使用方括号 []，集合推导式使用 {}，生成器表达式使用 ()。' },
  { type: '填空题', text: '在 Python 中，用于导入模块的关键字是 ______ 。', fill: true, ans: 'import', explain: 'import 关键字用于导入模块，也可以使用 from...import 导入特定功能。' },
  { type: '判断题', text: 'Python 中的 None 表示空值，等同于 False。', tf: true, ans: 'false', explain: 'None 和 False 是不同的对象。在布尔上下文中，None 会被视为 False，但它们并不相等。' },
  { type: '单选题', text: '以下哪个方法可以将字符串转换为整数？', opts: [{ l: 'A', t: 'str.to_int()' }, { l: 'B', t: 'int()' }, { l: 'C', t: 'Integer.parse()' }, { l: 'D', t: 'cast(int, str)' }], ans: 'B', explain: 'int() 是 Python 的内置函数，可以将字符串或其他类型转换为整数。' },
  { type: '单选题', text: 'Python 中 with 语句的主要用途是？', opts: [{ l: 'A', t: '定义类' }, { l: 'B', t: '循环控制' }, { l: 'C', t: '上下文管理' }, { l: 'D', t: '异常处理' }], ans: 'C', explain: 'with 语句用于上下文管理，最常用于文件操作，确保资源被正确释放。' },
];

class QuizView extends HTMLElement {
  // 状态
  private plans: LearningPlan[] = [];
  private currentPlanId: string | null = null;
  private questions: QuizQuestion[] = sampleQuizQuestions;
  private currentQ = 0;
  private answers: Array<string | null> = [];  // 每题的选择
  private timer: number = 600;  // 10分钟倒计时（秒）
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private submitted = false;
  private unsubscribers: Array<() => void> = [];

  connectedCallback() {
    if (this.querySelector('.quiz-view')) {
      return;
    }
    this.init();
  }

  disconnectedCallback() {
    this.clearTimer();
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

    // 初始化答案数组
    this.answers = new Array(this.questions.length).fill(null);

    if (this.plans.length > 0) {
      this.render();
      this.startTimer();
    } else {
      this.render();
    }

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
        <div class="quiz-view">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-title">还没有学习计划</div>
            <div class="empty-desc">创建一个学习计划后，就可以开始综合测验了！</div>
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
      <div class="quiz-view">
        ${this.renderPlanSwitcher()}
        ${this.renderTopBar()}
        ${this.renderDots()}
        ${this.renderQuestion()}
        ${this.renderActions()}
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

  /** 顶部栏 - 倒计时 + 得分 */
  private renderTopBar(): string {
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return `
      <div class="quiz-top">
        <div class="quiz-timer" id="quizTimer">
          <span class="qt-icon">&#9201;</span>
          <span class="qt-text" id="timerText">${timeStr}</span>
        </div>
        <div class="quiz-score">
          <span class="qs-label">得分</span>
          <span class="qs-val" id="scoreVal">0</span>
        </div>
      </div>
    `;
  }

  /** 题目进度点 */
  private renderDots(): string {
    const dots = this.questions.map((_, idx) => {
      let dotClass = 'qz-dot';
      if (idx === this.currentQ) dotClass += ' cur';
      if (this.submitted) {
        const q = this.questions[idx];
        const userAns = this.answers[idx];
        if (userAns && userAns.toLowerCase() === q.ans.toLowerCase()) {
          dotClass += ' ok';
        } else if (userAns) {
          dotClass += ' no';
        } else {
          dotClass += ' skip';
        }
      }
      return `<div class="${dotClass}" data-idx="${idx}">${idx + 1}</div>`;
    }).join('');

    return `<div class="quiz-dots">${dots}</div>`;
  }

  /** 题目卡片 */
  private renderQuestion(): string {
    const q = this.questions[this.currentQ];
    if (!q) return '';

    const selectedAnswer = this.answers[this.currentQ];

    let bodyHTML = '';

    if (q.type === '单选题' && q.opts) {
      bodyHTML = `
        <div class="opts">
          ${q.opts.map(opt => `
            <div class="opt ${selectedAnswer === opt.l ? 'sel' : ''} ${this.submitted ? 'off' : ''}" data-label="${opt.l}">
              <span class="opt-label">${opt.l}</span>
              <span class="opt-text">${opt.t}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (q.type === '填空题') {
      bodyHTML = `
        <div class="fill-area">
          <input class="fill-input" id="fillInput" type="text" placeholder="请输入答案..." ${this.submitted ? 'disabled' : ''} value="${selectedAnswer || ''}" />
        </div>
      `;
    } else if (q.type === '判断题') {
      bodyHTML = `
        <div class="tf-row">
          <button class="tf-btn ${selectedAnswer === 'true' ? 'sel-t' : ''} ${this.submitted ? 'off' : ''}" data-tf="true">
            &#10004; 正确
          </button>
          <button class="tf-btn ${selectedAnswer === 'false' ? 'sel-f' : ''} ${this.submitted ? 'off' : ''}" data-tf="false">
            &#10008; 错误
          </button>
        </div>
      `;
    }

    return `
      <div class="q-card" style="border-left: 4px solid var(--md-primary)">
        <div class="q-type" style="background:var(--md-primary-container); color:var(--md-primary)">${q.type}</div>
        <div class="q-text">${q.text}</div>
        ${bodyHTML}
      </div>
    `;
  }

  /** 底部操作 */
  private renderActions(): string {
    if (this.submitted) {
      return '';
    }

    return `
      <div class="q-actions">
        <button class="btn btn-s" id="prevBtn" ${this.currentQ === 0 ? 'style="visibility:hidden"' : ''}>
          &#8592; 上一题
        </button>
        <button class="btn btn-p" id="submitQuizBtn">
          提交测验
        </button>
      </div>
    `;
  }

  /** 结果页面 */
  private renderResult(): string {
    let correctCount = 0;
    this.questions.forEach((q, idx) => {
      const userAns = this.answers[idx];
      if (userAns && userAns.toLowerCase() === q.ans.toLowerCase()) {
        correctCount++;
      }
    });

    const total = this.questions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score = correctCount * 10;
    const elapsed = 600 - this.timer;
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;

    const grade = accuracy >= 90 ? 'S' : accuracy >= 80 ? 'A' : accuracy >= 60 ? 'B' : 'C';
    const gradeColor = accuracy >= 90 ? 'var(--md-primary)' : accuracy >= 80 ? 'var(--md-success)' : accuracy >= 60 ? 'var(--md-warning)' : 'var(--md-error)';

    return `
      <div class="completion">
        <div class="comp-icon" style="color:${gradeColor}">${grade}</div>
        <div class="comp-title">测验完成！</div>
        <div class="comp-stats">
          <div class="cs-item">
            <div class="cs-val">${score}</div>
            <div class="cs-label">总分</div>
          </div>
          <div class="cs-item">
            <div class="cs-val" style="color:${gradeColor}">${accuracy}%</div>
            <div class="cs-label">正确率</div>
          </div>
          <div class="cs-item">
            <div class="cs-val">${correctCount} / ${total}</div>
            <div class="cs-label">正确题数</div>
          </div>
          <div class="cs-item">
            <div class="cs-val">${elapsedMin}:${elapsedSec.toString().padStart(2, '0')}</div>
            <div class="cs-label">用时</div>
          </div>
        </div>
        <div class="comp-actions">
          <button class="btn btn-s" id="reviewBtn">&#128214; 查看讲解</button>
          <button class="btn btn-p" id="toExerciseBtn">继续练习</button>
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

    // 进度点点击
    this.querySelectorAll('.qz-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        if (this.submitted) return;
        const idx = parseInt((dot as HTMLElement).dataset.idx || '0');
        if (idx !== this.currentQ) {
          this.saveCurrentAnswer();
          this.goToQuestion(idx);
        }
      });
    });

    // 单选题选项点击
    this.querySelectorAll('.opt:not(.off)').forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.submitted) return;
        this.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        this.answers[this.currentQ] = (opt as HTMLElement).dataset.label || null;
      });
    });

    // 填空题输入
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      fillInput.addEventListener('input', () => {
        this.answers[this.currentQ] = fillInput.value.trim();
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
        this.answers[this.currentQ] = tfVal || null;
      });
    });

    // 上一题按钮
    const prevBtn = this.querySelector('#prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentQ > 0) {
          this.saveCurrentAnswer();
          this.goToQuestion(this.currentQ - 1);
        }
      });
    }

    // 提交测验按钮
    const submitQuizBtn = this.querySelector('#submitQuizBtn');
    if (submitQuizBtn) {
      submitQuizBtn.addEventListener('click', () => {
        this.saveCurrentAnswer();
        this.submitQuiz();
      });
    }
  }

  /** 保存当前题目答案 */
  private saveCurrentAnswer() {
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      this.answers[this.currentQ] = fillInput.value.trim();
    }
  }

  /** 跳转到指定题目 */
  private goToQuestion(idx: number) {
    this.currentQ = idx;

    // 更新进度点
    this.querySelectorAll('.qz-dot').forEach(dot => {
      const dotIdx = parseInt((dot as HTMLElement).dataset.idx || '0');
      dot.classList.toggle('cur', dotIdx === idx);
    });

    // 更新题目卡片
    const qCard = this.querySelector('.q-card');
    if (qCard) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderQuestion();
      const newCard = tempDiv.querySelector('.q-card');
      if (newCard) {
        qCard.replaceWith(newCard);
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
        this.answers[this.currentQ] = (opt as HTMLElement).dataset.label || null;
      });
    });

    // 填空题输入
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      fillInput.addEventListener('input', () => {
        this.answers[this.currentQ] = fillInput.value.trim();
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
        this.answers[this.currentQ] = tfVal || null;
      });
    });

    // 上一题按钮
    const prevBtn = this.querySelector('#prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentQ > 0) {
          this.saveCurrentAnswer();
          this.goToQuestion(this.currentQ - 1);
        }
      });
    }

    // 提交测验按钮
    const submitQuizBtn = this.querySelector('#submitQuizBtn');
    if (submitQuizBtn) {
      submitQuizBtn.addEventListener('click', () => {
        this.saveCurrentAnswer();
        this.submitQuiz();
      });
    }
  }

  /** 启动倒计时 */
  private startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timer--;
      if (this.timer <= 0) {
        this.timer = 0;
        this.clearTimer();
        // 时间到，自动提交
        if (!this.submitted) {
          this.saveCurrentAnswer();
          this.submitQuiz();
        }
      }
      // 更新显示
      const timerText = this.querySelector('#timerText');
      if (timerText) {
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // 低于60秒时变红
      const timerEl = this.querySelector('#quizTimer');
      if (timerEl) {
        timerEl.classList.toggle('urgent', this.timer <= 60);
      }
    }, 1000);
  }

  /** 清除倒计时 */
  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /** 提交测验 */
  private submitQuiz() {
    this.submitted = true;
    this.clearTimer();

    // 计算得分
    let correctCount = 0;
    this.questions.forEach((q, idx) => {
      const userAns = this.answers[idx];
      if (userAns && userAns.toLowerCase() === q.ans.toLowerCase()) {
        correctCount++;
      }
    });

    const score = correctCount * 10;

    // 更新得分显示
    const scoreVal = this.querySelector('#scoreVal');
    if (scoreVal) {
      scoreVal.textContent = score.toString();
    }

    // 更新进度点
    const dotsEl = this.querySelector('.quiz-dots');
    if (dotsEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderDots();
      const newDots = tempDiv.querySelector('.quiz-dots');
      if (newDots) {
        dotsEl.replaceWith(newDots);
      }
    }

    // 隐藏操作区
    const actionsEl = this.querySelector('.q-actions');
    if (actionsEl) {
      actionsEl.innerHTML = '';
    }

    // 禁用题目选项
    this.querySelectorAll('.opt').forEach(opt => {
      opt.classList.add('off');
    });
    this.querySelectorAll('.tf-btn').forEach(btn => {
      btn.classList.add('off');
    });
    const fillInput = this.querySelector('#fillInput') as HTMLInputElement;
    if (fillInput) {
      fillInput.disabled = true;
    }

    // 显示结果页面（延迟一小段时间让用户看到最终状态）
    setTimeout(() => {
      this.showResult(correctCount, score);
    }, 800);
  }

  /** 显示结果页面 */
  private showResult(correctCount: number, score: number) {
    const viewEl = this.querySelector('.quiz-view');
    if (!viewEl) return;

    viewEl.innerHTML = `
      ${this.renderPlanSwitcher()}
      ${this.renderResult()}
    `;

    // 触发完成事件
    eventBus.emit(AppEvents.QUIZ_COMPLETED, {
      correct: correctCount,
      total: this.questions.length,
      score,
      accuracy: this.questions.length > 0 ? Math.round((correctCount / this.questions.length) * 100) : 0,
      elapsed: 600 - this.timer,
    });

    // 更新用户统计
    learningStore.addXP(score);

    // 绑定结果页面事件
    this.querySelectorAll('.ps-chip').forEach(chip => {
      chip.addEventListener('click', async () => {
        const planId = (chip as HTMLElement).dataset.planId;
        if (planId) {
          this.currentPlanId = planId;
          await learningStore.setCurrentPlanId(planId);
        }
      });
    });

    // 查看讲解按钮
    const reviewBtn = this.querySelector('#reviewBtn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        // 打开教具覆盖层，展示所有题目的讲解
        const script: Array<{ type: 'guide'; text: string }> = [];
        script.push({ type: 'guide', text: '测验结果回顾' });
        script.push({ type: 'guide', text: `你答对了 ${correctCount} / ${this.questions.length} 题，得分 ${score} 分。` });

        this.questions.forEach((q, idx) => {
          const userAns = this.answers[idx];
          const isCorrect = userAns && userAns.toLowerCase() === q.ans.toLowerCase();
          script.push({
            type: 'guide',
            text: `第${idx + 1}题：${isCorrect ? '正确' : '错误'} - ${q.explain || '暂无解析'}`
          });
        });

        const teachOverlay = (window as any).__teachOverlay;
        if (teachOverlay) {
          teachOverlay.open('测验讲解回顾', script, { questions: this.questions, answers: this.answers });
        }
      });
    }

    // 继续练习按钮
    const toExerciseBtn = this.querySelector('#toExerciseBtn');
    if (toExerciseBtn) {
      toExerciseBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'exercise' });
      });
    }
  }
}

customElements.define('quiz-view', QuizView);
