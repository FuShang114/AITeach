/**
 * [DEPRECATED] 学习场景渲染器
 * 根据消息内容渲染不同的学习场景组件
 *
 * @deprecated 该组件已不再被任何模块引用，请勿在新代码中使用。
 *             保留此文件仅供参考，后续版本可能移除。
 */
import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

interface SceneData {
  type: "exercise" | "flashcard" | "quiz" | "learning_path" | "evaluation";
  data: Record<string, unknown>;
}

@customElement("scene-renderer")
export class SceneRenderer extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .scene-container {
      border-radius: 8px;
      border: 1px solid var(--border, #e5e7eb);
      background: var(--background, #fff);
      padding: 16px;
      margin: 8px 0;
    }

    .scene-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border, #e5e7eb);
    }

    .scene-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .scene-icon.exercise { background: #dbeafe; }
    .scene-icon.flashcard { background: #fef3c7; }
    .scene-icon.quiz { background: #d1fae5; }
    .scene-icon.learning_path { background: #ede9fe; }
    .scene-icon.evaluation { background: #fce7f3; }

    .scene-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--foreground, #111);
    }

    .scene-subtitle {
      font-size: 12px;
      color: var(--muted-foreground, #888);
    }

    .scene-body {
      font-size: 13px;
      line-height: 1.6;
      color: var(--foreground, #333);
    }

    .question-item {
      padding: 12px;
      margin: 8px 0;
      border-radius: 8px;
      background: var(--card, #f9fafb);
      border: 1px solid var(--border, #e5e7eb);
    }

    .question-number {
      font-weight: 600;
      color: var(--learning-primary, #2563eb);
      margin-bottom: 4px;
    }

    .options-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
    }

    .options-list li {
      padding: 6px 12px;
      margin: 4px 0;
      border-radius: 6px;
      background: var(--background, #fff);
      border: 1px solid var(--border, #e5e7eb);
      cursor: pointer;
      transition: all 0.2s;
    }

    .options-list li:hover {
      border-color: var(--learning-primary, #2563eb);
      background: #eff6ff;
    }

    .flashcard {
      perspective: 1000px;
      cursor: pointer;
    }

    .flashcard-inner {
      padding: 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      border: 2px solid #f59e0b;
      text-align: center;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .flashcard-label {
      font-size: 11px;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .phase-item {
      padding: 12px;
      margin: 8px 0;
      border-radius: 8px;
      border-left: 3px solid var(--learning-secondary, #7c3aed);
      background: #f5f3ff;
    }

    .phase-name {
      font-weight: 600;
      color: var(--learning-secondary, #7c3aed);
      margin-bottom: 4px;
    }

    .phase-detail {
      font-size: 12px;
      color: var(--muted-foreground, #666);
    }

    .no-data {
      text-align: center;
      padding: 24px;
      color: var(--muted-foreground, #888);
      font-size: 13px;
    }
  `;

  @property({ type: Object }) scene?: SceneData;

  private renderExercise(data: Record<string, unknown>) {
    const exercises = (data.exercises || []) as Array<Record<string, unknown>>;
    if (exercises.length === 0) {
      return html`<div class="no-data">暂无练习题数据</div>`;
    }

    return html`
      <div class="scene-body">
        <p style="margin-bottom: 12px;">
          主题：${data.topic || "未指定"} | 难度：${data.difficulty || "?"}/5 | 共 ${exercises.length} 题
        </p>
        ${exercises.map(
          (ex, i) => html`
            <div class="question-item">
              <div class="question-number">第 ${i + 1} 题</div>
              <div>${ex.question || "题目加载中..."}</div>
              ${ex.options
                ? html`
                    <ul class="options-list">
                      ${(ex.options as string[]).map(
                        (opt) => html`<li>${opt}</li>`
                      )}
                    </ul>
                  `
                : ""}
            </div>
          `
        )}
      </div>
    `;
  }

  private renderFlashcard(data: Record<string, unknown>) {
    const flashcards = (data.flashcards || []) as Array<Record<string, unknown>>;
    if (flashcards.length === 0) {
      return html`<div class="no-data">暂无记忆卡片数据</div>`;
    }

    return html`
      <div class="scene-body">
        <p style="margin-bottom: 12px;">
          主题：${data.topic || "未指定"} | 共 ${flashcards.length} 张卡片
        </p>
        ${flashcards.map(
          (fc, i) => html`
            <div class="flashcard" style="margin: 8px 0;">
              <div class="flashcard-inner">
                <div>
                  <div class="flashcard-label">卡片 #${i + 1} - 正面</div>
                  <div>${fc.front || "问题加载中..."}</div>
                </div>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderQuiz(data: Record<string, unknown>) {
    const questions = (data.questions || []) as Array<Record<string, unknown>>;
    return html`
      <div class="scene-body">
        <p style="margin-bottom: 12px;">
          ${data.title || "综合测验"} | 难度：${data.difficulty || "?"}/5 |
          总分：${data.totalPoints || "?"} 分 | 时限：${data.timeLimitMinutes || "?"} 分钟
        </p>
        ${questions.map(
          (q, i) => html`
            <div class="question-item">
              <div class="question-number">第 ${i + 1} 题（${q.points} 分）</div>
              <div>${q.question || "题目加载中..."}</div>
              ${q.options
                ? html`
                    <ul class="options-list">
                      ${(q.options as string[]).map(
                        (opt) => html`<li>${opt}</li>`
                      )}
                    </ul>
                  `
                : ""}
            </div>
          `
        )}
      </div>
    `;
  }

  private renderLearningPath(data: Record<string, unknown>) {
    const phases = (data.phases || []) as Array<Record<string, unknown>>;
    return html`
      <div class="scene-body">
        <p style="margin-bottom: 12px;">
          学科：${data.subject || "未指定"} | 目标：${data.goal || "未指定"}
        </p>
        <p style="margin-bottom: 8px; font-size: 12px; color: var(--muted-foreground);">
          预计总时长：${data.totalEstimatedDays || "?"} 天
        </p>
        ${phases.map(
          (phase) => html`
            <div class="phase-item">
              <div class="phase-name">${phase.name || "阶段"}</div>
              <div class="phase-detail">${phase.description || ""}</div>
              <div class="phase-detail">预计 ${phase.estimatedDays || "?"} 天</div>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderEvaluation(data: Record<string, unknown>) {
    return html`
      <div class="scene-body">
        <p><strong>学科：</strong>${data.subject || "未指定"}</p>
        <p><strong>评估水平：</strong>${data.assessedLevel || "?"}/10（${data.levelLabel || "?"}）</p>
        <p><strong>推荐起点：</strong>${data.recommendedStartPoint || "待定"}</p>
        ${(data.suggestedTopics as string[])?.length
          ? html`
              <div style="margin-top: 8px;">
                <strong>建议学习主题：</strong>
                <ul style="padding-left: 20px; margin: 4px 0;">
                  ${(data.suggestedTopics as string[]).map((t) => html`<li>${t}</li>`)}
                </ul>
              </div>
            `
          : ""}
      </div>
    `;
  }

  render() {
    if (!this.scene) {
      return html`<div class="no-data">暂无学习场景数据</div>`;
    }

    const iconMap: Record<string, string> = {
      exercise: "📝",
      flashcard: "🃏",
      quiz: "📋",
      learning_path: "🗺️",
      evaluation: "📊",
    };

    const titleMap: Record<string, string> = {
      exercise: "练习题",
      flashcard: "记忆卡片",
      quiz: "综合测验",
      learning_path: "学习路径",
      evaluation: "水平评估",
    };

    return html`
      <div class="scene-container">
        <div class="scene-header">
          <div class="scene-icon ${this.scene.type}">${iconMap[this.scene.type] || "📚"}</div>
          <div>
            <div class="scene-title">${titleMap[this.scene.type] || "学习内容"}</div>
            <div class="scene-subtitle">AI 生成的学习材料</div>
          </div>
        </div>
        ${this.scene.type === "exercise"
          ? this.renderExercise(this.scene.data)
          : this.scene.type === "flashcard"
            ? this.renderFlashcard(this.scene.data)
            : this.scene.type === "quiz"
              ? this.renderQuiz(this.scene.data)
              : this.scene.type === "learning_path"
                ? this.renderLearningPath(this.scene.data)
                : this.scene.type === "evaluation"
                  ? this.renderEvaluation(this.scene.data)
                  : html`<div class="no-data">未知的学习场景类型</div>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scene-renderer": SceneRenderer;
  }
}
