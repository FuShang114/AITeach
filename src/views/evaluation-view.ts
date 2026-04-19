/**
 * 评估视图组件
 * 4步评估流程：选学科 → 自述水平 → 答题 → 结果
 */
import { eventBus, AppEvents } from '../utils/event-bus';

// 学科数据
interface Subject {
  icon: string;
  name: string;
  id: string;
}

const subjects: Subject[] = [
  { icon: '\uD83D\uDC0D', name: 'Python', id: 'python' },
  { icon: '\u2728', name: 'JavaScript', id: 'javascript' },
  { icon: '\uD83D\uDCCA', name: '数据结构', id: 'data-structure' },
  { icon: '\uD83E\uDDE9', name: '算法', id: 'algorithm' },
  { icon: '\uD83D\uDDC4\uFE0F', name: '数据库', id: 'database' },
  { icon: '\uD83E\uDD16', name: 'ML', id: 'ml' },
];

// 自述水平标签
const levelTags = [
  { label: '零基础', id: 'none' },
  { label: '了解基本概念', id: 'basic' },
  { label: '能独立完成小项目', id: 'intermediate' },
  { label: '熟练掌握', id: 'advanced' },
  { label: '精通', id: 'expert' },
];

// 评估题目
interface EvalQuestion {
  text: string;
  opts: Array<{ l: string; t: string }>;
  ans: string;
}

const evalQuestions: EvalQuestion[] = [
  { text: '<code>print(type([]) is list)</code> 的输出是？', opts: [{ l: 'A', t: 'True' }, { l: 'B', t: 'False' }, { l: 'C', t: "<class 'list'>" }, { l: 'D', t: '报错' }], ans: 'A' },
  { text: '以下哪个方法可以给列表添加元素？', opts: [{ l: 'A', t: 'list.append()' }, { l: 'B', t: 'list.add()' }, { l: 'C', t: 'list.push()' }, { l: 'D', t: 'list.insert()' }], ans: 'A' },
  { text: 'Python 中 <code>**kwargs</code> 的作用是？', opts: [{ l: 'A', t: '接收位置参数' }, { l: 'B', t: '接收关键字参数' }, { l: 'C', t: '解包列表' }, { l: 'D', t: '定义类属性' }], ans: 'B' },
  { text: '<code>[x for x in range(5) if x % 2 == 0]</code> 的结果是？', opts: [{ l: 'A', t: '[1, 3]' }, { l: 'B', t: '[0, 2, 4]' }, { l: 'C', t: '[0, 1, 2, 3, 4]' }, { l: 'D', t: '[2, 4]' }], ans: 'B' },
  { text: '以下哪个不是 Python 的合法标识符？', opts: [{ l: 'A', t: '_var' }, { l: 'B', t: 'var2' }, { l: 'C', t: '2var' }, { l: 'D', t: '__var__' }], ans: 'C' },
];

// 步骤名称
const stepNames = ['选学科', '自述水平', '答题', '结果'];

class EvaluationView extends HTMLElement {
  // 状态
  private currentStep = 1;  // 1-4
  private selectedSubject: string | null = null;
  private selectedLevels: Set<string> = new Set();
  private currentQ = 0;
  private answers: Array<string | null> = [];
  private submitted = false;

  connectedCallback() {
    // Reset state for fresh start
    this.currentStep = 1;
    this.selectedSubject = null;
    this.selectedLevels.clear();
    this.currentQ = 0;
    this.submitted = false;

    if (this.querySelector('.eval-view')) {
      return;
    }
    this.answers = new Array(evalQuestions.length).fill(null);
    this.render();
  }

  private render() {
    this.innerHTML = `
      <div class="eval-view">
        ${this.renderSteps()}
        ${this.renderStepContent()}
      </div>
    `;

    this.bindEvents();
  }

  /** 步骤条 */
  private renderSteps(): string {
    const steps = stepNames.map((name, idx) => {
      const stepNum = idx + 1;
      let cls = 'es';
      if (stepNum === this.currentStep) cls += ' act';
      else if (stepNum < this.currentStep) cls += ' dn';

      let dotContent = stepNum.toString();
      if (stepNum < this.currentStep) dotContent = '&#10003;';

      let lineHtml = '';
      if (idx < stepNames.length - 1) {
        const lineCls = stepNum < this.currentStep ? 'es-line dn' : 'es-line';
        lineHtml = `<div class="${lineCls}"></div>`;
      }

      return `
        <div class="${cls}">
          <div class="dot">${dotContent}</div>
          <span>${name}</span>
        </div>
        ${lineHtml}
      `;
    }).join('');

    return `<div class="eval-steps">${steps}</div>`;
  }

  /** 步骤内容 */
  private renderStepContent(): string {
    switch (this.currentStep) {
      case 1: return this.renderStep1();
      case 2: return this.renderStep2();
      case 3: return this.renderStep3();
      case 4: return this.renderStep4();
      default: return '';
    }
  }

  /** 步骤1: 选学科 */
  private renderStep1(): string {
    const grid = subjects.map(subj => `
      <div class="subj-card ${this.selectedSubject === subj.id ? 'sel' : ''}" data-subj-id="${subj.id}">
        <div class="si">${subj.icon}</div>
        <div class="sn">${subj.name}</div>
      </div>
    `).join('');

    return `
      <div class="step-content">
        <div style="font-size:18px; font-weight:700; color:var(--md-on-background); margin-bottom:6px;">选择你要评估的学科</div>
        <div style="font-size:13px; color:var(--md-on-surface-variant); margin-bottom:16px;">选择一个学科，我们将为你生成针对性的评估题目</div>
        <div class="subj-grid">${grid}</div>
        <div class="q-actions">
          <button class="btn btn-p ${!this.selectedSubject ? 'disabled' : ''}" id="step1Next">下一步</button>
        </div>
      </div>
    `;
  }

  /** 步骤2: 自述水平 */
  private renderStep2(): string {
    const tags = levelTags.map(tag => `
      <div class="sa-t ${this.selectedLevels.has(tag.id) ? 'sel' : ''}" data-level-id="${tag.id}">${tag.label}</div>
    `).join('');

    return `
      <div class="step-content">
        <div style="font-size:18px; font-weight:700; color:var(--md-on-background); margin-bottom:6px;">你目前的水平如何？</div>
        <div style="font-size:13px; color:var(--md-on-surface-variant); margin-bottom:16px;">可以选择多个符合你情况的标签</div>
        <div class="sa-tags">${tags}</div>
        <div class="q-actions">
          <button class="btn btn-s" id="step2Prev">&#8592; 上一步</button>
          <button class="btn btn-p" id="step2Next">下一步</button>
        </div>
      </div>
    `;
  }

  /** 步骤3: 答题 */
  private renderStep3(): string {
    const q = evalQuestions[this.currentQ];
    if (!q) return '';

    const selectedAnswer = this.answers[this.currentQ];
    const progress = ((this.currentQ) / evalQuestions.length) * 100;

    return `
      <div class="step-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:14px; font-weight:600; color:var(--md-on-surface);">第 ${this.currentQ + 1} / ${evalQuestions.length} 题</span>
          <span style="font-size:12px; color:var(--md-outline);">${Math.round(progress)}%</span>
        </div>
        <div class="progress-bar" style="margin-bottom:20px;">
          <div class="progress-fill" style="width:${progress}%; background:var(--md-primary);"></div>
        </div>
        <div class="q-card" style="border-left:4px solid var(--md-primary)">
          <div class="q-type" style="background:var(--md-primary-container); color:var(--md-primary)">单选题</div>
          <div class="q-text">${q.text}</div>
          <div class="opts">
            ${q.opts.map(opt => `
              <div class="opt ${selectedAnswer === opt.l ? 'sel' : ''}" data-label="${opt.l}">
                <span class="opt-label">${opt.l}</span>
                <span class="opt-text">${opt.t}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="q-actions">
          <button class="btn btn-p ${!selectedAnswer ? 'disabled' : ''}" id="submitAnswerBtn">提交答案</button>
        </div>
      </div>
    `;
  }

  /** 步骤4: 结果 */
  private renderStep4(): string {
    // 计算得分
    let correctCount = 0;
    evalQuestions.forEach((q, idx) => {
      const userAns = this.answers[idx];
      if (userAns && userAns.toLowerCase() === q.ans.toLowerCase()) {
        correctCount++;
      }
    });

    const total = evalQuestions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // 模拟水平评分
    const levelScore = Math.min(100, accuracy + 10);
    const levelLabel = levelScore >= 80 ? '熟练掌握' : levelScore >= 60 ? '能独立完成小项目' : levelScore >= 40 ? '了解基本概念' : '零基础';
    const levelColor = levelScore >= 80 ? 'var(--md-success)' : levelScore >= 60 ? 'var(--md-primary)' : levelScore >= 40 ? 'var(--md-warning)' : 'var(--md-error)';

    // 推荐起点
    const startPoint = levelScore >= 80 ? '进阶项目实战' : levelScore >= 60 ? '中级概念深化' : levelScore >= 40 ? '基础语法巩固' : '入门基础教程';

    // 优势项
    const strengths = ['列表推导式', '函数定义', '字符串格式化'];
    // 待提升项
    const weaknesses = ['装饰器', '异步编程', '元类'];

    // 推荐标签
    const recTags = [
      { text: 'Python 基础', color: 'var(--md-primary)', bg: 'var(--md-primary-container)' },
      { text: '数据类型', color: 'var(--md-success)', bg: 'var(--md-success-container)' },
      { text: '函数编程', color: 'var(--md-info)', bg: 'var(--md-info-container)' },
      { text: '面向对象', color: 'var(--md-warning)', bg: 'var(--md-warning-container)' },
    ];

    const selectedSubj = subjects.find(s => s.id === this.selectedSubject);

    return `
      <div class="step-content">
        <div style="text-align:center; margin-bottom:8px;">
          <span style="font-size:13px; color:var(--md-outline);">${selectedSubj ? selectedSubj.icon + ' ' + selectedSubj.name : '评估'} 结果</span>
        </div>

        <!-- 水平仪表 -->
        <div class="level-meter">
          <div class="lv-num" style="color:${levelColor}">${levelScore}</div>
          <div class="lv-label" style="color:${levelColor}">${levelLabel}</div>
          <div class="lv-bar">
            <div class="progress-bar">
              <div class="progress-fill" style="width:${levelScore}%; background:${levelColor};"></div>
            </div>
          </div>
        </div>

        <!-- 推荐起点 -->
        <div style="text-align:center; margin-bottom:24px; padding:14px 18px; background:linear-gradient(135deg, var(--md-primary-container), var(--md-secondary-container)); border-radius:var(--r-lg);">
          <div style="font-size:12px; color:var(--md-outline); margin-bottom:4px;">推荐起点</div>
          <div style="font-size:16px; font-weight:700; color:var(--md-on-surface);">${startPoint}</div>
        </div>

        <!-- 优势/待提升 -->
        <div class="sw-grid">
          <div class="sw-box str">
            <div class="sw-title str">&#127942; 优势</div>
            ${strengths.map(s => `<div class="sw-item">${s}</div>`).join('')}
          </div>
          <div class="sw-box weak">
            <div class="sw-title weak">&#128170; 待提升</div>
            ${weaknesses.map(w => `<div class="sw-item">${w}</div>`).join('')}
          </div>
        </div>

        <!-- 推荐标签 -->
        <div style="margin-bottom:24px;">
          <div style="font-size:14px; font-weight:700; color:var(--md-on-surface); margin-bottom:10px;">推荐学习方向</div>
          ${recTags.map(tag => `
            <span class="tag" style="background:${tag.bg}; color:${tag.color};">${tag.text}</span>
          `).join('')}
        </div>

        <!-- 操作按钮 -->
        <div class="q-actions">
          <button class="btn btn-s" id="evalBackHomeBtn">返回首页</button>
          <button class="btn btn-p" id="evalGenPathBtn">生成学习路径</button>
        </div>
      </div>
    `;
  }

  /** 绑定事件 */
  private bindEvents() {
    switch (this.currentStep) {
      case 1: this.bindStep1Events(); break;
      case 2: this.bindStep2Events(); break;
      case 3: this.bindStep3Events(); break;
      case 4: this.bindStep4Events(); break;
    }
  }

  /** 步骤1事件 */
  private bindStep1Events() {
    // 学科卡片点击
    this.querySelectorAll('.subj-card').forEach(card => {
      card.addEventListener('click', () => {
        const subjId = (card as HTMLElement).dataset.subjId;
        if (subjId) {
          this.selectedSubject = subjId;
          this.querySelectorAll('.subj-card').forEach(c => c.classList.remove('sel'));
          card.classList.add('sel');

          // 启用下一步按钮
          const nextBtn = this.querySelector('#step1Next');
          if (nextBtn) {
            nextBtn.classList.remove('disabled');
          }
        }
      });
    });

    // 下一步按钮
    const nextBtn = this.querySelector('#step1Next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!this.selectedSubject) return;
        this.currentStep = 2;
        this.render();
      });
    }
  }

  /** 步骤2事件 */
  private bindStep2Events() {
    // 水平标签点击
    this.querySelectorAll('.sa-t').forEach(tag => {
      tag.addEventListener('click', () => {
        const levelId = (tag as HTMLElement).dataset.levelId;
        if (levelId) {
          if (this.selectedLevels.has(levelId)) {
            this.selectedLevels.delete(levelId);
            tag.classList.remove('sel');
          } else {
            this.selectedLevels.add(levelId);
            tag.classList.add('sel');
          }
        }
      });
    });

    // 上一步按钮
    const prevBtn = this.querySelector('#step2Prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentStep = 1;
        this.render();
      });
    }

    // 下一步按钮
    const nextBtn = this.querySelector('#step2Next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.selectedLevels.size === 0) {
          // Show a visual hint instead of alert
          const tags = this.querySelector('.sa-tags') as HTMLElement | null;
          if (tags) {
            tags.style.animation = 'none';
            void tags.offsetWidth; // force reflow
            tags.style.animation = 'shake 0.3s ease';
          }
          return;
        }
        this.currentStep = 3;
        this.currentQ = 0;
        this.render();
      });
    }
  }

  /** 步骤3事件 */
  private bindStep3Events() {
    // 选项点击
    this.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        this.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        this.answers[this.currentQ] = (opt as HTMLElement).dataset.label || null;

        // 启用提交按钮
        const submitBtn = this.querySelector('#submitAnswerBtn');
        if (submitBtn) {
          submitBtn.classList.remove('disabled');
        }
      });
    });

    // 提交答案按钮
    const submitBtn = this.querySelector('#submitAnswerBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!this.answers[this.currentQ]) return;
        this.handleSubmitAnswer();
      });
    }
  }

  /** 提交答案 */
  private handleSubmitAnswer() {
    // 自动下一题或完成
    if (this.currentQ < evalQuestions.length - 1) {
      this.currentQ++;
      this.updateStep3Content();
    } else {
      // 所有题目答完，进入结果
      this.currentStep = 4;
      this.render();
      this.triggerCompleteEvent();
    }
  }

  /** 更新步骤3内容 */
  private updateStep3Content() {
    const viewEl = this.querySelector('.eval-view');
    if (!viewEl) return;

    // 更新步骤条
    const stepsEl = this.querySelector('.eval-steps');
    if (stepsEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderSteps();
      const newSteps = tempDiv.querySelector('.eval-steps');
      if (newSteps) {
        stepsEl.replaceWith(newSteps);
      }
    }

    // 更新内容
    const content = this.querySelector('.step-content');
    if (content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.renderStepContent();
      const newContent = tempDiv.querySelector('.step-content');
      if (newContent) {
        content.replaceWith(newContent);
      }
    }

    this.bindStep3Events();
  }

  /** 步骤4事件 */
  private bindStep4Events() {
    // 返回首页
    const backHomeBtn = this.querySelector('#evalBackHomeBtn');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'home' });
      });
    }

    // 生成学习路径
    const genPathBtn = this.querySelector('#evalGenPathBtn');
    if (genPathBtn) {
      genPathBtn.addEventListener('click', () => {
        eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: 'learning-path' });
      });
    }
  }

  /** 触发完成事件 */
  private triggerCompleteEvent() {
    let correctCount = 0;
    evalQuestions.forEach((q, idx) => {
      const userAns = this.answers[idx];
      if (userAns && userAns.toLowerCase() === q.ans.toLowerCase()) {
        correctCount++;
      }
    });

    eventBus.emit(AppEvents.EVALUATION_COMPLETED, {
      subject: this.selectedSubject,
      selfLevels: Array.from(this.selectedLevels),
      correct: correctCount,
      total: evalQuestions.length,
      accuracy: evalQuestions.length > 0 ? Math.round((correctCount / evalQuestions.length) * 100) : 0,
    });
  }
}

customElements.define('evaluation-view', EvaluationView);
