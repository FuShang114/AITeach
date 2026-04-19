/**
 * [DEPRECATED] 学习侧边栏组件
 * 参考 Duolingo 风格：清晰的分区、圆润的卡片、鼓励性的视觉元素
 *
 * @deprecated 该组件已不再被任何模块引用，请勿在新代码中使用。
 *             保留此文件仅供参考，后续版本可能移除。
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { learningStore, type LearningPath, type LearningRecord } from "../storage/learning-store";


@customElement("learning-sidebar")
export class LearningSidebar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 300px;
      min-width: 300px;
      height: 100%;
      background: #fff;
      overflow: hidden;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      padding: 20px 16px;
    }

    .sidebar-inner::-webkit-scrollbar {
      width: 4px;
    }

    .sidebar-inner::-webkit-scrollbar-thumb {
      background: var(--gray-200, #e5e7eb);
      border-radius: 4px;
    }

    /* ===== 欢迎区 ===== */
    .welcome-section {
      text-align: center;
      padding: 16px 12px 24px;
      margin-bottom: 20px;
    }

    .welcome-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #58cc02, #1cb0f6);
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: 0 4px 12px rgba(88, 204, 2, 0.3);
    }

    .welcome-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--gray-900, #111827);
      margin-bottom: 4px;
    }

    .welcome-subtitle {
      font-size: 13px;
      color: var(--gray-400, #9ca3af);
    }

    /* ===== 分区标题 ===== */
    .section {
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 0 4px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--gray-500, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-count {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--gray-100, #f0f1f3);
      color: var(--gray-400, #9ca3af);
    }

    /* ===== 学习路径卡片 ===== */
    .path-card {
      padding: 14px;
      border-radius: 14px;
      border: 2px solid var(--gray-200, #e5e7eb);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: #fff;
    }

    .path-card:hover {
      border-color: #58cc02;
      box-shadow: 0 4px 12px rgba(88, 204, 2, 0.15);
      transform: translateY(-1px);
    }

    .path-card.active {
      border-color: #58cc02;
      background: linear-gradient(135deg, #f0fbe4, #e5f7ff);
    }

    .path-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .path-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .path-icon.math { background: #fff4e0; }
    .path-icon.science { background: #e5f4ff; }
    .path-icon.language { background: #f5e6ff; }
    .path-icon.default { background: #f0f1f3; }

    .path-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--gray-800, #1f2937);
    }

    .path-meta {
      font-size: 12px;
      color: var(--gray-400, #9ca3af);
      padding-left: 42px;
    }

    /* ===== 最近学习记录 ===== */
    .record-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      margin-bottom: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .record-item:hover {
      background: var(--gray-50, #fafbfc);
    }

    .record-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }

    .record-icon.exercise { background: #e5f4ff; }
    .record-icon.quiz { background: #f0fbe4; }
    .record-icon.flashcard_review { background: #fff4e0; }
    .record-icon.level_evaluation { background: #f5e6ff; }

    .record-content {
      flex: 1;
      min-width: 0;
    }

    .record-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--gray-700, #374151);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .record-time {
      font-size: 11px;
      color: var(--gray-400, #9ca3af);
      flex-shrink: 0;
    }

    /* ===== 快捷操作 ===== */
    .quick-actions {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--gray-100, #f0f1f3);
    }

    .quick-action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 14px;
      border-radius: 14px;
      border: 2px solid var(--gray-200, #e5e7eb);
      background: #fff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: var(--gray-700, #374151);
      transition: all 0.2s;
      margin-bottom: 8px;
    }

    .quick-action-btn:hover {
      border-color: #58cc02;
      background: #f0fbe4;
      color: #3a8a01;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(88, 204, 2, 0.12);
    }

    .quick-action-btn:active {
      transform: translateY(0);
      box-shadow: none;
    }

    .action-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .action-icon.evaluate { background: #f5e6ff; }
    .action-icon.flashcard { background: #fff4e0; }
    .action-icon.quiz { background: #e5f4ff; }

    .action-label {
      flex: 1;
      text-align: left;
    }

    .action-desc {
      font-size: 11px;
      font-weight: 400;
      color: var(--gray-400, #9ca3af);
      display: block;
      margin-top: 1px;
    }

    /* ===== 空状态 ===== */
    .empty-state {
      text-align: center;
      padding: 24px 16px;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 8px;
      opacity: 0.6;
    }

    .empty-text {
      font-size: 13px;
      color: var(--gray-400, #9ca3af);
      line-height: 1.5;
    }
  `;

  @state() private learningPaths: LearningPath[] = [];
  @state() private recentRecords: LearningRecord[] = [];
  @state() private activePathId: string | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadData();
  }

  private async loadData() {
    this.learningPaths = await learningStore.getLearningPaths();
    this.recentRecords = await learningStore.getRecentRecords(8);
    const currentSubject = await learningStore.getCurrentSubject();
    if (currentSubject) {
      const activePath = this.learningPaths.find((p) => p.subject === currentSubject);
      if (activePath) this.activePathId = activePath.id;
    }
  }

  private handlePathClick(path: LearningPath) {
    this.activePathId = path.id;
    learningStore.setCurrentSubject(path.subject);
    this.dispatchEvent(new CustomEvent("path-selected", { detail: { path }, bubbles: true, composed: true }));
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = { exercise: "📝", quiz: "📋", flashcard_review: "🃏", level_evaluation: "📊" };
    return icons[type] || "📚";
  }

  private getPathIcon(index: number): string {
    const icons = ["📐", "🔬", "🌍", "💻", "🎵"];
    return icons[index % icons.length];
  }

  private getPathIconClass(index: number): string {
    const classes = ["math", "science", "language", "default", "default"];
    return classes[index % classes.length];
  }

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}天前`;
    return new Date(timestamp).toLocaleDateString("zh-CN");
  }

  render() {
    return html`
      <div class="sidebar-inner">
        <!-- 欢迎区 -->
        <div class="welcome-section">
          <div class="welcome-avatar">🤖</div>
          <div class="welcome-title">欢迎回来！</div>
          <div class="welcome-subtitle">今天想学点什么呢？</div>
        </div>

        <!-- 学习路径 -->
        <div class="section">
          <div class="section-header">
            <span class="section-title">学习路径</span>
            ${this.learningPaths.length > 0 ? html`<span class="section-count">${this.learningPaths.length}</span>` : ""}
          </div>
          ${this.learningPaths.length === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-icon">🗺️</div>
                  <div class="empty-text">开始对话后<br>AI 会为你创建学习路径</div>
                </div>
              `
            : this.learningPaths.map((path, i) => html`
                <div class="path-card ${path.id === this.activePathId ? "active" : ""}" @click=${() => this.handlePathClick(path)}>
                  <div class="path-card-header">
                    <div class="path-icon ${this.getPathIconClass(i)}">${this.getPathIcon(i)}</div>
                    <div class="path-name">${path.subject}</div>
                  </div>
                  <div class="path-meta">${path.phases?.length || 0} 个阶段 · ${path.goal}</div>
                </div>
              `)}
        </div>

        <!-- 最近学习 -->
        <div class="section">
          <div class="section-header">
            <span class="section-title">最近学习</span>
            ${this.recentRecords.length > 0 ? html`<span class="section-count">${this.recentRecords.length}</span>` : ""}
          </div>
          ${this.recentRecords.length === 0
            ? html`
                <div class="empty-state">
                  <div class="empty-icon">📖</div>
                  <div class="empty-text">暂无学习记录<br>快开始你的第一次学习吧</div>
                </div>
              `
            : this.recentRecords.map((record) => html`
                <div class="record-item">
                  <div class="record-icon ${record.type}">${this.getTypeIcon(record.type)}</div>
                  <div class="record-content">
                    <div class="record-text" title="${record.details}">${record.topic}</div>
                  </div>
                  <div class="record-time">${this.formatTime(record.timestamp)}</div>
                </div>
              `)}
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <div class="section-header">
            <span class="section-title">快捷操作</span>
          </div>
          <button class="quick-action-btn" @click=${() => this.dispatchEvent(new CustomEvent("quick-action", { detail: { action: "evaluate" }, bubbles: true, composed: true }))}>
            <div class="action-icon evaluate">📊</div>
            <div class="action-label">
              评估我的水平
              <span class="action-desc">了解你的知识起点</span>
            </div>
          </button>
          <button class="quick-action-btn" @click=${() => this.dispatchEvent(new CustomEvent("quick-action", { detail: { action: "flashcard" }, bubbles: true, composed: true }))}>
            <div class="action-icon flashcard">🃏</div>
            <div class="action-label">
              复习记忆卡片
              <span class="action-desc">间隔重复高效记忆</span>
            </div>
          </button>
          <button class="quick-action-btn" @click=${() => this.dispatchEvent(new CustomEvent("quick-action", { detail: { action: "quiz" }, bubbles: true, composed: true }))}>
            <div class="action-icon quiz">📋</div>
            <div class="action-label">
              开始综合测验
              <span class="action-desc">检验学习成果</span>
            </div>
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "learning-sidebar": LearningSidebar;
  }
}
