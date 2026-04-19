/**
 * 全屏教具覆盖层组件
 * AI 教学场景：从任意界面打开，展示教具脚本，完成后返回
 */
import { renderTool } from '../tools/teach';
import { eventBus, AppEvents } from '../utils/event-bus';

// 教具脚本步骤类型
export interface GuideStep {
  type: 'guide';
  text: string;
}

export interface ToolStep {
  type: 'tool';
  tool: string;
  params: any;
  guide?: string;
}

export type ScriptStep = GuideStep | ToolStep;

interface TeachState {
  prevView: string;
  script: ScriptStep[];
  step: number;
  lesson: any;
}

class TeachOverlay extends HTMLElement {
  // DOM 引用
  private overlayEl!: HTMLDivElement;
  private titleEl!: HTMLDivElement;
  private badgeEl!: HTMLDivElement;
  private progressEl!: HTMLDivElement;
  private bodyEl!: HTMLDivElement;
  private guideEl!: HTMLDivElement;
  private chipsEl!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private actionsEl!: HTMLDivElement;

  // 状态
  private state: TeachState = {
    prevView: '',
    script: [],
    step: -1,
    lesson: null,
  };

  // 自动前进定时器
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  // 关闭防抖
  private isClosing = false;

  connectedCallback() {
    if (this.querySelector('.teach-overlay')) {
      return;
    }
    this.buildDOM();
    this.bindEvents();
  }

  disconnectedCallback() {
    this.clearAutoAdvance();
  }

  private buildDOM() {
    this.innerHTML = `
      <div class="teach-overlay" id="teachOverlay">
        <div class="teach-overlay-header">
          <div class="toh-left">
            <button class="toh-back" id="tohBack">&#8592; 返回</button>
            <div class="toh-title" id="teachTitle">讲解</div>
            <div class="toh-badge" id="teachBadge">AI 教学</div>
          </div>
          <div class="toh-right">
            <div class="toh-progress" id="teachProgress"></div>
            <button class="toh-close" id="tohClose">&#10005;</button>
          </div>
        </div>
        <div class="teach-overlay-body" id="teachBody"></div>
        <div class="teach-overlay-footer" id="teachFooter">
          <div class="tof-guide" id="teachGuide">准备中...</div>
          <div class="tof-chips" id="teachChips">
            <button class="fu-chip" data-q="用更简单的方式解释">&#129300; 再简单点</button>
            <button class="fu-chip" data-q="给我更多实际例子">&#128221; 再举个例子</button>
            <button class="fu-chip" data-q="这个和之前学的有什么关系">&#128279; 关联知识</button>
            <button class="fu-chip" data-q="有什么常见错误需要注意">&#9888;&#65039; 常见错误</button>
          </div>
          <div class="tof-input">
            <input class="lesson-input-box" id="teachInput" placeholder="有任何疑问，直接问我...">
            <button class="lesson-send" id="teachSend">&#10148;</button>
          </div>
          <div class="tof-actions" id="teachActions">
            <button class="btn btn-ghost btn-sm" id="tofPrev">&#8592; 上一步</button>
            <span></span>
            <button class="btn btn-p btn-sm" id="btnNext">下一步 &#8594;</button>
          </div>
        </div>
      </div>
    `;

    // 缓存 DOM 引用
    this.overlayEl = this.querySelector('#teachOverlay')!;
    this.titleEl = this.querySelector('#teachTitle')!;
    this.badgeEl = this.querySelector('#teachBadge')!;
    this.progressEl = this.querySelector('#teachProgress')!;
    this.bodyEl = this.querySelector('#teachBody')!;
    this.guideEl = this.querySelector('#teachGuide')!;
    this.chipsEl = this.querySelector('#teachChips')!;
    this.inputEl = this.querySelector('#teachInput')!;
    this.sendBtn = this.querySelector('#teachSend')!;
    this.nextBtn = this.querySelector('#btnNext')!;
    this.actionsEl = this.querySelector('#teachActions')!;
  }

  private bindEvents() {
    // 返回 / 关闭
    this.querySelector('#tohBack')!.addEventListener('click', () => this.close());
    this.querySelector('#tohClose')!.addEventListener('click', () => this.close());

    // 下一步
    this.nextBtn.addEventListener('click', () => this.handleNextClick());

    // 上一步
    const prevBtn = this.querySelector('#tofPrev');
    if (prevBtn) prevBtn.addEventListener('click', () => this.teachPrev());

    // 输入框 Enter
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.teachSend();
      }
    });

    // 发送按钮
    this.sendBtn.addEventListener('click', () => this.teachSend());

    // 快捷提问 chips
    this.querySelectorAll('.fu-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = (chip as HTMLElement).dataset.q;
        if (q) this.teachAsk(q);
      });
    });
  }

  /**
   * 打开覆盖层
   */
  open(title: string, script: ScriptStep[], lesson?: any) {
    this.clearAutoAdvance();

    // 保存当前活动视图ID
    const activeNav = document.querySelector('.nav-item.active') as HTMLElement;
    this.state.prevView = activeNav?.dataset.view || 'home';

    // 初始化状态
    this.state.script = script || [];
    this.state.step = -1;
    this.state.lesson = lesson || null;

    // 设置标题和 badge
    this.titleEl.textContent = title || '讲解';
    this.badgeEl.textContent = 'AI 教学';

    // 重置 UI
    this.bodyEl.innerHTML = '';
    this.guideEl.textContent = '准备中...';
    this.guideEl.style.display = '';
    if (this.chipsEl) this.chipsEl.style.display = '';
    this.inputEl.value = '';
    this.updateProgress();
    this.updateNextButton();

    // 显示覆盖层
    this.overlayEl.classList.add('show');

    // 触发事件
    eventBus.emit(AppEvents.TEACH_OVERLAY_OPEN, { title, script, lesson });

    // 如果有脚本，自动开始第一步
    if (this.state.script.length > 0) {
      this.teachNext();
    } else {
      this.guideEl.textContent = '暂无教学内容';
    }
  }

  /**
   * 关闭覆盖层
   */
  close() {
    if (this.isClosing) return;
    this.isClosing = true;

    this.clearAutoAdvance();

    // 播放退出动画
    this.overlayEl.classList.add('overlayOut');

    setTimeout(() => {
      this.overlayEl.classList.remove('show');
      this.overlayEl.classList.remove('overlayOut');

      // 触发关闭事件
      eventBus.emit(AppEvents.TEACH_OVERLAY_CLOSE, {});

      // 回到之前的视图
      eventBus.emit(AppEvents.VIEW_CHANGE, { viewId: this.state.prevView });

      this.isClosing = false;
    }, 250);
  }

  /**
   * 下一步
   */
  private teachNext() {
    this.clearAutoAdvance();

    this.state.step++;

    const script = this.state.script;
    const step = this.state.step;

    // 超过最后一步
    if (step >= script.length) {
      this.guideEl.textContent = '全部完成！';
      this.guideEl.style.display = '';
      this.updateNextButton();
      this.updateProgress();
      return;
    }

    const current = script[step];

    if (current.type === 'guide') {
      // 引导步骤：显示文本，自动前进
      this.guideEl.textContent = current.text;
      this.guideEl.style.display = '';
      this.updateProgress();
      this.updateNextButton();

      // 800ms 后自动前进
      this.autoAdvanceTimer = setTimeout(() => {
        this.teachNext();
      }, 800);
    } else if (current.type === 'tool') {
      // 工具步骤：渲染教具
      this.guideEl.style.display = 'none';

      // 追加教具到 body
      const toolHTML = renderTool(current);
      const wrapper = document.createElement('div');
      wrapper.className = 'teach-step-item';
      wrapper.innerHTML = toolHTML;
      this.bodyEl.appendChild(wrapper);

      // 如果有引导文本，显示在 guide 区域
      if (current.guide) {
        this.guideEl.textContent = current.guide;
        this.guideEl.style.display = '';
      } else {
        this.guideEl.style.display = 'none';
      }

      this.updateProgress();
      this.updateNextButton();
    }
  }

  /**
   * 上一步
   */
  private teachPrev() {
    this.clearAutoAdvance();

    if (this.state.step <= 0) return;

    // 记录目标步骤（回到当前 step 的前一个 tool 步骤）
    const targetStep = this.state.step - 1;

    // 重置到 step=-1，清空 body
    this.state.step = -1;
    this.bodyEl.innerHTML = '';

    // 从头重新渲染所有步骤到目标步骤
    const script = this.state.script;
    for (let i = 0; i <= targetStep && i < script.length; i++) {
      const current = script[i];
      if (current.type === 'tool') {
        const toolHTML = renderTool(current);
        const wrapper = document.createElement('div');
        wrapper.className = 'teach-step-item';
        wrapper.innerHTML = toolHTML;
        this.bodyEl.appendChild(wrapper);
      }
      this.state.step = i;
    }

    // 更新引导文本
    const targetItem = script[targetStep];
    if (targetItem) {
      if (targetItem.type === 'guide') {
        this.guideEl.textContent = targetItem.text;
        this.guideEl.style.display = '';
      } else if (targetItem.type === 'tool' && targetItem.guide) {
        this.guideEl.textContent = targetItem.guide;
        this.guideEl.style.display = '';
      } else {
        this.guideEl.style.display = 'none';
      }
    }

    this.updateProgress();
    this.updateNextButton();
  }

  /**
   * 处理"下一步"按钮点击
   */
  private handleNextClick() {
    const script = this.state.script;
    const step = this.state.step;

    // 如果已完成，关闭覆盖层
    if (step >= script.length) {
      this.close();
      return;
    }

    this.teachNext();
  }

  /**
   * 用户提问
   */
  private teachAsk(question: string) {
    // 隐藏 chips
    this.chipsEl.style.display = 'none';

    // 显示用户问题
    const questionEl = document.createElement('div');
    questionEl.className = 'teach-question';
    questionEl.textContent = question;
    this.bodyEl.appendChild(questionEl);

    // 显示"思考中..."
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'teach-thinking';
    thinkingEl.textContent = '思考中...';
    this.bodyEl.appendChild(thinkingEl);

    // 滚动到底部
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;

    // 500ms 后显示预设回答（暂时用预设回答，后续接入AI）
    setTimeout(() => {
      thinkingEl.remove();

      const answerEl = document.createElement('div');
      answerEl.className = 'teach-answer';
      answerEl.textContent = this.getPresetAnswer(question);
      this.bodyEl.appendChild(answerEl);

      // 滚动到底部
      this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
    }, 500);
  }

  /**
   * 发送按钮处理
   */
  private teachSend() {
    const question = this.inputEl.value.trim();
    if (!question) return;

    this.inputEl.value = '';
    this.teachAsk(question);
  }

  /**
   * 获取预设回答（暂时用预设，后续接入AI）
   */
  private getPresetAnswer(question: string): string {
    const presets: Record<string, string> = {
      '用更简单的方式解释': '好的，让我用更简单的方式来解释。想象一下你第一次学骑自行车，一开始可能会觉得很难，但只要掌握了平衡的要领，就会变得非常自然。同样的道理，这个概念也需要你先理解它的核心思想，然后通过练习来巩固。',
      '给我更多实际例子': '当然！让我给你举几个实际的例子来帮助你理解。在实际开发中，这个概念经常被用到。比如在处理用户输入时，我们需要验证数据的有效性；在构建用户界面时，我们需要管理组件的状态。',
      '这个和之前学的有什么关系': '这是一个很好的问题！你之前学到的知识和现在是紧密相关的。可以把之前的知识看作是基础，而现在的内容是在此之上的扩展。理解了它们之间的关系，你就能构建起一个完整的知识体系。',
      '有什么常见错误需要注意': '非常好的问题！初学者经常会犯以下几个错误：1. 概念混淆，把相似但不相同的东西搞混；2. 忽略边界情况；3. 过度复杂化简单的问题。记住这些，你就能避免大部分常见错误。',
    };

    return presets[question] || '这是一个很好的问题！让我来为你解答。在实际应用中，理解这个概念的关键在于多练习、多思考。如果你还有其他疑问，随时可以继续提问。';
  }

  /**
   * 更新进度显示
   */
  private updateProgress() {
    const script = this.state.script;
    const step = this.state.step;
    const total = script.length;

    if (total === 0) {
      this.progressEl.textContent = '';
      return;
    }

    const current = Math.min(step + 1, total);
    this.progressEl.textContent = `${current} / ${total}`;
  }

  /**
   * 更新下一步按钮状态
   */
  private updateNextButton() {
    const script = this.state.script;
    const step = this.state.step;

    if (step >= script.length) {
      this.nextBtn.textContent = '完成';
    } else {
      this.nextBtn.innerHTML = '下一步 &#8594;';
    }
  }

  /**
   * 清除自动前进定时器
   */
  private clearAutoAdvance() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
}

customElements.define('teach-overlay', TeachOverlay);
