/**
 * [DEPRECATED] 学习进度条组件
 * 显示用户的学习进度和统计数据
 *
 * @deprecated 该组件已不再被任何模块 import 引用（CSS class 仍被其他视图直接使用）。
 *             保留此文件仅供参考，后续版本可能移除。
 */
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { LearningProgress } from "../storage/learning-store";

@customElement("progress-bar")
export class ProgressBar extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .progress-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--muted-foreground, #888);
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--border, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-fill.exercise {
      background: linear-gradient(90deg, var(--learning-primary, #2563eb), var(--learning-secondary, #7c3aed));
    }

    .progress-fill.quiz {
      background: linear-gradient(90deg, var(--learning-accent, #059669), #10b981);
    }

    .progress-fill.flashcard {
      background: linear-gradient(90deg, var(--learning-warning, #d97706), #f59e0b);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 8px;
    }

    .stat-item {
      text-align: center;
      padding: 8px;
      border-radius: 8px;
      background: var(--card, #fff);
      border: 1px solid var(--border, #e5e7eb);
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--foreground, #111);
    }

    .stat-label {
      font-size: 11px;
      color: var(--muted-foreground, #888);
      margin-top: 2px;
    }
  `;

  @property({ type: Object }) progress?: LearningProgress;
  @property({ type: String }) subject = "";

  render() {
    if (!this.progress) {
      return html`<div class="progress-wrapper">
        <p style="font-size: 12px; color: var(--muted-foreground, #888);">
          暂无学习数据，开始学习后将显示进度
        </p>
      </div>`;
    }

    const exercisePercent =
      this.progress.totalExercises > 0
        ? Math.round((this.progress.completedExercises / this.progress.totalExercises) * 100)
        : 0;

    const quizPercent =
      this.progress.totalQuizzes > 0
        ? Math.round((this.progress.completedQuizzes / this.progress.totalQuizzes) * 100)
        : 0;

    const flashcardPercent =
      this.progress.flashcardCount > 0
        ? Math.round((this.progress.masteredFlashcards / this.progress.flashcardCount) * 100)
        : 0;

    return html`
      <div class="progress-wrapper">
        <!-- 练习进度 -->
        <div class="progress-header">
          <span>练习完成度</span>
          <span>${this.progress.completedExercises}/${this.progress.totalExercises}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill exercise" style="width: ${exercisePercent}%"></div>
        </div>

        <!-- 测验进度 -->
        <div class="progress-header">
          <span>测验完成度</span>
          <span>${this.progress.completedQuizzes}/${this.progress.totalQuizzes}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill quiz" style="width: ${quizPercent}%"></div>
        </div>

        <!-- 闪卡进度 -->
        <div class="progress-header">
          <span>闪卡掌握度</span>
          <span>${this.progress.masteredFlashcards}/${this.progress.flashcardCount}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill flashcard" style="width: ${flashcardPercent}%"></div>
        </div>

        <!-- 统计数据 -->
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${this.progress.averageScore}%</div>
            <div class="stat-label">平均正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">Lv.${this.progress.currentLevel}</div>
            <div class="stat-label">当前水平</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.progress.streakDays}</div>
            <div class="stat-label">连续学习天数</div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "progress-bar": ProgressBar;
  }
}
