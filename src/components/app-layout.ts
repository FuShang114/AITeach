/**
 * 应用主布局组件
 * 布局：左侧导航栏 + 主视图区
 * 使用纯 HTMLElement，不继承 LitElement
 *
 * 注意：ChatPanel 已移至 l2d-bubble-chat 抽屉面板中管理
 */
import type { Agent } from "@mariozechner/pi-agent-core";

const NAV_ITEMS = [
  { id: 'home', icon: '\u{1F3E0}', label: '\u9996\u9875' },
  { id: 'exercise', icon: '\u{1F4DD}', label: '\u7EC3\u4E60' },
  { id: 'quiz', icon: '\u{1F4CB}', label: '\u6D4B\u9A8C' },
  { id: 'flashcard', icon: '\u{1F0CF}', label: '\u5361\u7247' },
  { id: 'evaluation', icon: '\u{1F4CA}', label: '\u8BC4\u4F30' },
  { id: 'learning-path', icon: '\u{1F5FA}\uFE0F', label: '\u8DEF\u5F84' },
];

class AppLayout extends HTMLElement {
  private statusEl!: HTMLSpanElement;
  private msgCountEl!: HTMLSpanElement;
  private tokenCountEl!: HTMLSpanElement;
  private statusDot!: HTMLDivElement;
  private isBusy = false;
  private tokenCount = 0;
  private messageCount = 0;
  private _agent: Agent | undefined;

  set agent(v: Agent | undefined) {
    this._agent = v;
    this.updateModelName();
  }
  get agent() { return this._agent; }

  connectedCallback() {
    if (this.querySelector('.app-container')) {
      return;
    }
    this.buildDOM();
    this.setupAgentEvents();
  }

  disconnectedCallback() {
    // 清理资源
  }

  private buildDOM() {
    this.innerHTML = `
      <div class="app-container">
        <!-- 顶部栏 -->
        <div class="top-bar">
          <div class="top-bar-left">
            <div class="app-logo">
              <div class="logo-icon">\uD83C\uDF93</div>
              <div class="logo-text">AI<span>Learn</span></div>
            </div>
          </div>
          <div class="top-bar-center">
            <div class="top-title" id="topTitle">\uD83C\uDFE0 \u9996\u9875</div>
            <div class="top-sub" id="topSub">\u6B22\u8FCE\u56DE\u6765\uFF01</div>
          </div>
          <div class="top-bar-right">
            <div class="streak-badge">\uD83D\uDD25 5\u5929\u8FDE\u7EED</div>
            <div class="model-badge">
              <div class="model-dot"></div>
              <span class="model-name">DeepSeek</span>
            </div>
          </div>
        </div>

        <!-- 主体 -->
        <div class="main-body">
          <!-- 左侧导航栏 -->
          <nav class="nav-bar" id="navBar">
            ${NAV_ITEMS.map(item => `
              <button class="nav-item ${item.id === 'home' ? 'active' : ''}" data-view="${item.id}" title="${item.label}">
                <span class="ni-icon">${item.icon}</span>
                <span class="ni-label">${item.label}</span>
              </button>
            `).join('')}
          </nav>

          <!-- 右侧内容区 -->
          <div class="content-area">
            <!-- 视图层 -->
            <div class="view-layer" id="viewLayer">
              <div class="view-placeholder">
                <div style="font-size:48px;text-align:center;margin-bottom:12px">\uD83C\uDFE0</div>
                <div style="font-size:18px;font-weight:700;text-align:center;color:var(--gray-900)">\u6B22\u8FCE\u6765\u5230 AI \u667A\u80FD\u6559\u5B66\u5E73\u53F0</div>
                <div style="font-size:14px;text-align:center;color:var(--gray-400);margin-top:8px">\u9009\u62E9\u5DE6\u4FA7\u5BFC\u822A\u5F00\u59CB\u5B66\u4E60</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部状态栏 -->
        <div class="bottom-bar">
          <div class="bottom-bar-left">
            <div class="status-indicator">
              <div class="status-dot"></div>
              <span class="status-text">\u51C6\u5907\u5C31\u7EEA</span>
            </div>
          </div>
          <div class="bottom-bar-right">
            <span class="stat-item msg-count">\uD83D\uDCAC 0 \u6761\u6D88\u606F</span>
            <span class="stat-item token-count">\u26A1 0 tokens</span>
            <span class="version-tag">v0.2.0</span>
          </div>
        </div>
      </div>
    `;

    this.statusEl = this.querySelector('.status-text')!;
    this.statusDot = this.querySelector('.status-dot')!;
    this.msgCountEl = this.querySelector('.msg-count')!;
    this.tokenCountEl = this.querySelector('.token-count')!;

    // 导航点击
    this.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = (btn as HTMLElement).dataset.view!;
        this.switchView(viewId);
        this.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.updateModelName();
  }

  private switchView(viewId: string) {
    const titles: Record<string, { title: string; sub: string }> = {
      home: { title: '🏠 首页', sub: '欢迎回来！' },
      exercise: { title: '📝 练习题', sub: '巩固所学知识' },
      quiz: { title: '📋 综合测验', sub: '检验学习成果' },
      flashcard: { title: '🃏 记忆卡片', sub: '间隔重复复习' },
      evaluation: { title: '📊 水平评估', sub: '评估你的知识水平' },
      'learning-path': { title: '🗺️ 学习路径', sub: '管理你的学习计划' },
    };
    const info = titles[viewId] || { title: viewId, sub: '' };
    const titleEl = this.querySelector('#topTitle');
    const subEl = this.querySelector('#topSub');
    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;

    // 触发自定义事件，供外部监听
    this.dispatchEvent(new CustomEvent('view-change', { detail: { viewId }, bubbles: true, composed: true }));
  }

  private updateModelName() {
    const nameEl = this.querySelector('.model-name');
    if (nameEl && this._agent?.state?.model?.name) {
      nameEl.textContent = this._agent.state.model.name;
    }
  }

  private setStatus(status: string, busy: boolean) {
    this.isBusy = busy;
    if (this.statusEl) this.statusEl.textContent = status;
    if (this.statusDot) this.statusDot.classList.toggle('busy', busy);
  }

  private setupAgentEvents() {
    if (!this._agent) return;

    this._agent.subscribe((event: any) => {
      if (event.type === 'message_update') {
        this.setStatus('\u6B63\u5728\u601D\u8003\u4E2D...', true);
      }
      if (event.type === 'tool_execution_start') {
        this.setStatus('\u6B63\u5728\u4F7F\u7528\u5DE5\u5177...', true);
      }
      if (event.type === 'tool_execution_end') {
        this.setStatus('\u6B63\u5728\u6574\u7406\u56DE\u590D...', true);
      }
      if (event.type === 'turn_end') {
        this.setStatus('\u51C6\u5907\u5C31\u7EEA', false);
        this.tokenCount += event.usage?.totalTokens ?? 0;
        this.messageCount = this._agent?.state.messages?.length ?? 0;
        if (this.msgCountEl) this.msgCountEl.textContent = `\uD83D\uDCAC ${this.messageCount} \u6761\u6D88\u606F`;
        if (this.tokenCountEl) this.tokenCountEl.textContent = `\u26A1 ${this.tokenCount.toLocaleString()} tokens`;
        this.updateModelName();
      }
      if (event.type === 'agent_end') {
        this.setStatus('\u51C6\u5907\u5C31\u7EEA', false);
      }
    });
  }
}

customElements.define('app-layout', AppLayout);
