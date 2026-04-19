/**
 * Live2D + 聊天 右侧抽屉面板组件
 *
 * 将 Live2D 模型和聊天界面整合到一个从右侧滑入的抽屉面板中。
 * 点击右侧边缘的切换按钮可展开/收起抽屉。
 * Live2D 模型通过 oh-my-live2d 的 parentElement 选项渲染在抽屉内部。
 * 聊天面板（chat-panel from pi-web-ui）挂载在抽屉下方。
 */

import { loadOml2d } from 'oh-my-live2d';
import { eventBus, AppEvents } from '../utils/event-bus';

// 表情状态 → Live2D motion 映射
type Expression = 'default' | 'thinking' | 'teaching' | 'done';

class L2dBubbleChat extends HTMLElement {
  private oml2d: any = null;
  private modelLoaded = false;
  private isOpen = false;
  private currentExpression: Expression = 'default';
  private chatPanel: any = null; // pi-web-ui 的 ChatPanel 实例

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector('.l2d-drawer')) return;

    this.innerHTML = `
      <!-- 切换按钮（始终可见，固定在右侧边缘） -->
      <button class="l2d-toggle-btn" id="l2dToggleBtn" title="AI 助手">
        <svg class="l2d-toggle-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        </svg>
      </button>

      <!-- 右侧抽屉面板 -->
      <div class="l2d-drawer" id="l2dDrawer">
        <!-- 抽屉头部 -->
        <div class="l2d-drawer-header">
          <span class="l2d-drawer-title">AI 学习助手</span>
          <button class="l2d-drawer-close" id="l2dDrawerClose" title="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Live2D 模型区域 -->
        <div class="l2d-model-area" id="l2dModelArea">
          <!-- oh-my-live2d 将在此容器内渲染 -->
        </div>

        <!-- 聊天面板区域 -->
        <div class="l2d-chat-area" id="l2dChatArea">
          <!-- chat-panel 将被挂载到这里 -->
        </div>
      </div>
    `;

    this.injectStyles();
    this.bindEvents();
    this.bindEventBus();
    this.loadLive2D();
  }

  disconnectedCallback() {
    // 清理资源
  }

  /**
   * 接受外部传入的 ChatPanel 实例并挂载到抽屉内
   */
  setChatPanel(panel: any): void {
    this.chatPanel = panel;
    const chatArea = this.querySelector('#l2dChatArea') as HTMLDivElement;
    if (panel && chatArea && !chatArea.contains(panel)) {
      chatArea.appendChild(panel);
    }
  }

  /**
   * 切换抽屉展开/收起
   */
  toggleDrawer(): void {
    this.isOpen = !this.isOpen;
    const drawer = this.querySelector('#l2dDrawer') as HTMLDivElement;
    const toggleBtn = this.querySelector('#l2dToggleBtn') as HTMLButtonElement;
    if (drawer) {
      drawer.classList.toggle('open', this.isOpen);
    }
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', this.isOpen);
    }
  }

  /**
   * 打开抽屉
   */
  openDrawer(): void {
    if (!this.isOpen) {
      this.toggleDrawer();
    }
  }

  /**
   * 关闭抽屉
   */
  closeDrawer(): void {
    if (this.isOpen) {
      this.toggleDrawer();
    }
  }

  /**
   * 加载 Live2D 模型到抽屉内的容器
   */
  private async loadLive2D() {
    const modelArea = this.querySelector('#l2dModelArea') as HTMLDivElement;
    if (!modelArea) return;

    try {
      this.oml2d = await loadOml2d({
        // 使用 parentElement 将模型渲染到抽屉内部
        parentElement: modelArea,
        primaryColor: '#6366f1',
        sayHello: false,
        models: [
          {
            path: '/models/live2d-models/models/Hiyori/Hiyori.model3.json',
            position: [0, 40],
            scale: 0.09,
            stageStyle: {
              height: 220,
              width: 220,
            },
          },
        ],
        tips: {
          idleTips: {
            duration: 15,
            message: [
              '有什么学习上的问题吗？',
              '试试创建一个学习计划吧！',
              '点击下方输入框开始对话~',
            ],
          },
        },
        statusBar: {
          disable: true,  // 禁用状态栏
        },
        menus: {
          disable: true,  // 禁用菜单
        },
      });

      this.modelLoaded = true;

      // 模型加载完成后显示欢迎提示
      this.oml2d.onStageSlideIn(() => {
        setTimeout(() => {
          if (this.oml2d) {
            this.oml2d.tipsMessage('你好！我是你的 AI 学习助手 🎓\n有什么可以帮你的吗？', 5000, 1);
          }
        }, 500);
      });

      console.info('[L2D] Live2D 模型加载完成（抽屉模式）');
    } catch (err) {
      console.warn('[L2D] Live2D 模型加载失败，使用 Emoji 回退:', err);
      this.fallbackToEmoji();
    }
  }

  /**
   * Live2D 加载失败时的 Emoji 回退方案
   */
  private fallbackToEmoji() {
    const modelArea = this.querySelector('#l2dModelArea') as HTMLDivElement;
    if (modelArea) {
      modelArea.innerHTML = `
        <div class="l2d-avatar-fallback">😊</div>
      `;
    }
  }

  private injectStyles() {
    if (this.querySelector('style')) return;
    const style = document.createElement('style');
    style.textContent = `
      /* ===== 宿主元素 ===== */
      l2d-bubble-chat {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        pointer-events: none;
      }

      l2d-bubble-chat > * {
        pointer-events: auto;
      }

      /* ===== 切换按钮 ===== */
      l2d-bubble-chat .l2d-toggle-btn {
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1001;
        width: 48px;
        height: 48px;
        border-radius: 12px 0 0 12px;
        border: 1px solid var(--md-outline-variant);
        border-right: none;
        background: linear-gradient(135deg, var(--md-primary), var(--md-secondary));
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0,212,170,.2);
        transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
      }

      l2d-bubble-chat .l2d-toggle-btn:hover {
        width: 56px;
        box-shadow: 0 0 30px rgba(0,212,170,.4);
      }

      l2d-bubble-chat .l2d-toggle-btn.active {
        right: 400px;
        background: var(--md-surface-container-high);
        color: var(--md-on-surface);
        border-color: var(--md-outline-variant);
        box-shadow: none;
      }

      l2d-bubble-chat .l2d-toggle-icon {
        transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
      }

      l2d-bubble-chat .l2d-toggle-btn.active .l2d-toggle-icon {
        transform: rotate(180deg);
      }

      /* ===== 抽屉面板 ===== */
      l2d-bubble-chat .l2d-drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 400px;
        max-width: 100vw;
        height: 100vh;
        background: rgba(10, 14, 26, 0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-left: 1px solid var(--md-outline-variant);
        box-shadow: -8px 0 40px rgba(0,0,0,.5), 0 0 60px rgba(0,212,170,.05);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1);
        z-index: 1000;
        overflow: visible;
      }

      l2d-bubble-chat .l2d-drawer.open {
        transform: translateX(0);
      }

      /* ===== 抽屉头部 ===== */
      l2d-bubble-chat .l2d-drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--md-surface-container);
        border-bottom: 1px solid var(--md-outline-variant);
        flex-shrink: 0;
      }

      l2d-bubble-chat .l2d-drawer-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--md-on-surface);
      }

      l2d-bubble-chat .l2d-drawer-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--md-on-surface-variant);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      l2d-bubble-chat .l2d-drawer-close:hover {
        background: var(--md-surface-container-high);
      }

      /* ===== Live2D 模型区域 ===== */
      l2d-bubble-chat .l2d-model-area {
        position: relative;
        height: 220px;
        min-height: 220px;
        max-height: 220px;
        flex-shrink: 0;
        overflow: hidden !important;
        margin: 12px;
        border-radius: 16px;
        border: 1px solid rgba(0,212,170,.15);
        background: radial-gradient(ellipse at 30% 50%, rgba(0,212,170,.08) 0%, transparent 60%),
                    radial-gradient(ellipse at 70% 30%, rgba(124,92,252,.06) 0%, transparent 60%),
                    rgba(15, 20, 40, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 0 30px rgba(0,212,170,.06), inset 0 0 30px rgba(124,92,252,.04);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* 约束 oh-my-live2d 创建的元素不超出容器 */
      l2d-bubble-chat .l2d-model-area #oml2d-stage,
      l2d-bubble-chat .l2d-model-area .oml2d-stage {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      l2d-bubble-chat .l2d-model-area canvas,
      l2d-bubble-chat .l2d-model-area #oml2d-canvas {
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain;
      }

      /* 隐藏 oh-my-live2d 的 statusBar 和 menus（我们在抽屉里不需要） */
      l2d-bubble-chat .l2d-model-area #oml2d-statusBar,
      l2d-bubble-chat .l2d-model-area .oml2d-statusBar,
      l2d-bubble-chat .l2d-model-area #oml2d-menus,
      l2d-bubble-chat .l2d-model-area .oml2d-menus {
        display: none !important;
      }

      /* Emoji 回退头像 */
      l2d-bubble-chat .l2d-avatar-fallback {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--md-primary), var(--md-tertiary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        box-shadow: var(--sh-3, 0 4px 12px rgba(0,0,0,0.12));
        cursor: pointer;
        transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
        border: 3px solid var(--md-surface);
      }

      l2d-bubble-chat .l2d-avatar-fallback:hover {
        transform: scale(1.1);
      }

      /* ===== 聊天面板区域 ===== */
      l2d-bubble-chat .l2d-chat-area {
        flex: 1;
        overflow: visible;
        display: flex;
        flex-direction: column;
        min-height: 200px;
        border-top: 1px solid var(--md-outline-variant);
        background: transparent;
        position: relative;
      }

      l2d-bubble-chat .l2d-chat-area chat-panel {
        flex: 1;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      /* 确保 ChatPanel 内部元素正确显示 */
      l2d-bubble-chat .l2d-chat-area chat-panel agent-interface {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: visible;
      }

      l2d-bubble-chat .l2d-chat-area chat-panel message-list {
        flex: 1;
        min-height: 100px;
        overflow-y: auto;
      }

      l2d-bubble-chat .l2d-chat-area chat-panel message-editor {
        flex-shrink: 0;
      }

      /* ===== 响应式 ===== */
      @media (max-width: 768px) {
        l2d-bubble-chat .l2d-drawer {
          width: 100vw;
        }

        l2d-bubble-chat .l2d-toggle-btn.active {
          right: 0;
          top: 12px;
          transform: none;
          border-radius: 12px;
          border: 1px solid var(--md-outline-variant);
          box-shadow: var(--sh-2, 0 2px 8px rgba(0,0,0,0.12));
        }

        l2d-bubble-chat .l2d-model-area {
          height: 150px;
          min-height: 150px;
          max-height: 150px;
          margin: 8px;
          border-radius: 12px;
        }
      }
    `;
    this.appendChild(style);
  }

  private bindEvents() {
    const toggleBtn = this.querySelector('#l2dToggleBtn') as HTMLButtonElement;
    const closeBtn = this.querySelector('#l2dDrawerClose') as HTMLButtonElement;

    // 切换按钮 → 展开/收起抽屉
    toggleBtn.addEventListener('click', () => {
      this.toggleDrawer();
    });

    // 关闭按钮 → 收起抽屉
    closeBtn.addEventListener('click', () => {
      this.closeDrawer();
    });

    // 点击抽屉外部关闭
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.isOpen) return;
      const target = e.target as Node;
      // 如果点击的不是抽屉内部也不是切换按钮，则关闭
      if (!this.contains(target)) {
        this.closeDrawer();
      }
    });
  }

  /**
   * 监听 eventBus 事件
   */
  private bindEventBus() {
    // 打开聊天面板 → 展开抽屉
    eventBus.on(AppEvents.L2D_OPEN_CHAT, () => {
      this.openDrawer();
    });

    // 通过 Live2D 发送消息到 ChatPanel
    eventBus.on(AppEvents.L2D_SEND_MESSAGE, (detail: any) => {
      this.openDrawer();
      // 通过 ChatPanel 内部的 agentInterface 发送消息
      const text = detail?.text || '';
      if (text && this.chatPanel?.agentInterface?.sendMessage) {
        setTimeout(() => {
          this.chatPanel.agentInterface.sendMessage(text);
        }, 400);
      }
    });

    // AI 状态变化 → 切换 Live2D 表情
    eventBus.on(AppEvents.AI_STATUS_CHANGE, (detail: any) => {
      const status = detail?.status;
      if (status === 'thinking') this.setExpression('thinking');
      else if (status === 'teaching') this.setExpression('teaching');
      else if (status === 'done') this.setExpression('done');
      else this.setExpression('default');
    });

    // 设置表情
    eventBus.on(AppEvents.L2D_SET_EXPRESSION, (detail: any) => {
      this.setExpression(detail?.expression || 'default');
    });
  }

  /**
   * 设置 Live2D 表情/动作
   */
  setExpression(expression: Expression) {
    this.currentExpression = expression;

    // 如果 Live2D 模型已加载，触发动作
    if (this.modelLoaded && this.oml2d) {
      const statusText: Record<Expression, string> = {
        default: '',
        thinking: '思考中...',
        teaching: '讲解中...',
        done: '完成！',
      };
      const msg = statusText[expression];
      if (msg) {
        this.oml2d.statusBarPopup(msg, 0, '#6366f1');
      } else {
        this.oml2d.statusBarPopup('', 0);
      }
    }
  }
}

// 注册自定义元素
customElements.define('l2d-bubble-chat', L2dBubbleChat);
