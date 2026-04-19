/**
 * 工具消息渲染器 - 教学风格 UI
 * 设计参考：Duolingo 的圆润卡片 + Khan Academy 的清晰层次 + Coursera 的专业感
 */
import { registerMessageRenderer } from "@mariozechner/pi-web-ui";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { TemplateResult } from "lit";
import { html } from "lit";

interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>;
  details?: Record<string, unknown>;
  isError: boolean;
  timestamp: number;
}

function isToolResultMessage(msg: AgentMessage): msg is ToolResultMessage {
  return (msg as ToolResultMessage).role === "toolResult";
}

function safeParseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

function extractData(msg: ToolResultMessage): Record<string, unknown> {
  const textContent = msg.content.find((c) => c.type === "text");
  const rawText = textContent ? textContent.text : "";
  return (safeParseJson(rawText) as Record<string, unknown> | null) || {};
}

// ==================== 共享样式常量 ====================

const CARD = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif; max-width: 620px;";

const CARD_HEADER = (icon: string, title: string, subtitle: string, iconBg: string) => html`
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
    <div style="width: 42px; height: 42px; border-radius: 14px; background: ${iconBg}; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">${icon}</div>
    <div style="flex: 1;">
      <div style="font-weight: 800; font-size: 16px; color: #1f2937; letter-spacing: -0.3px;">${title}</div>
      <div style="font-size: 12px; color: #9ca3af; margin-top: 1px;">${subtitle}</div>
    </div>
  </div>
`;

const STAT_BOX = (value: string, label: string, color: string) => html`
  <div style="text-align: center; padding: 12px 8px; border-radius: 14px; background: #f9fafb; border: 1px solid #f0f1f3;">
    <div style="font-size: 22px; font-weight: 800; color: ${color}; letter-spacing: -0.5px;">${value}</div>
    <div style="font-size: 11px; color: #9ca3af; font-weight: 500; margin-top: 2px;">${label}</div>
  </div>
`;

const TAG = (text: string, bg: string, color: string) => html`
  <span style="display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; background: ${bg}; color: ${color};">${text}</span>
`;

// ==================== 各工具渲染 ====================

function renderEvaluateLevel(data: Record<string, unknown>): TemplateResult {
  const level = (data.assessedLevel as number) || 0;
  const levelLabel = (data.levelLabel as string) || "未知";
  const subject = (data.subject as string) || "";
  const strengths = (data.strengths as string[]) || [];
  const weaknesses = (data.weaknesses as string[]) || [];
  const startPoint = (data.recommendedStartPoint as string) || "";
  const topics = (data.suggestedTopics as string[]) || [];

  const colors = ["#ff9600", "#1cb0f6", "#ce82ff", "#58cc02", "#10b981"];
  const color = colors[Math.min(level - 1, colors.length - 1)] || colors[0];
  const pct = Math.min(level * 10, 100);

  return html`
    <div style="${CARD}">
      ${CARD_HEADER("📊", "知识水平评估", subject, "linear-gradient(135deg, #f5e6ff, #e9d5ff)")}

      <!-- 水平仪表 -->
      <div style="background: linear-gradient(135deg, #fafbfc, #f3f4f6); border-radius: 16px; padding: 20px; margin-bottom: 14px; border: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">评估水平</div>
            <div style="font-size: 36px; font-weight: 900; color: ${color}; line-height: 1.1; letter-spacing: -1px;">${level}<span style="font-size: 16px; font-weight: 600; color: #9ca3af;">/10</span></div>
          </div>
          <div style="padding: 6px 16px; border-radius: 9999px; background: ${color}15; color: ${color}; font-size: 14px; font-weight: 700;">${levelLabel}</div>
        </div>
        <div style="height: 10px; background: #e5e7eb; border-radius: 9999px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, ${color}, ${color}bb); border-radius: 9999px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
        </div>
      </div>

      <!-- 推荐起点 -->
      <div style="background: #eff6ff; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; border-left: 4px solid #1cb0f6;">
        <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">"🎯" 推荐起点</div>
        <div style="font-size: 14px; color: #374151; line-height: 1.5;">${startPoint}</div>
      </div>

      <!-- 优势 & 不足 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div style="background: #f0fdf4; border-radius: 14px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #16a34a; margin-bottom: 8px;">"✅" 你的优势</div>
          ${strengths.map((s: string) => html`<div style="font-size: 13px; color: #374151; margin-bottom: 4px; line-height: 1.4;">• ${s}</div>`)}
        </div>
        <div style="background: #fef2f2; border-radius: 14px; padding: 14px;">
          <div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-bottom: 8px;">"📈" 提升方向</div>
          ${weaknesses.map((w: string) => html`<div style="font-size: 13px; color: #374151; margin-bottom: 4px; line-height: 1.4;">• ${w}</div>`)}
        </div>
      </div>

      <!-- 建议主题 -->
      ${topics.length > 0 ? html`
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${topics.map((t: string) => TAG(t, "#f3f4f6", "#4b5563"))}
        </div>
      ` : ""}
    </div>
  `;
}

function renderLearningPath(data: Record<string, unknown>): TemplateResult {
  const subject = (data.subject as string) || "";
  const goal = (data.goal as string) || "";
  const currentLevel = (data.currentLevel as number) || 0;
  const targetLevel = (data.targetLevel as number) || 0;
  const totalDays = (data.totalEstimatedDays as number) || 0;
  const phases = (data.phases as Array<Record<string, unknown>>) || [];

  return html`
    <div style="${CARD}">
      ${CARD_HEADER("🗺️", "个性化学习路径", subject, "linear-gradient(135deg, #ede9fe, #ddd6fe)")}

      <!-- 概览统计 -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        ${STAT_BOX(`${currentLevel} → ${targetLevel}`, "水平提升", "#7c3aed")}
        ${STAT_BOX(`${phases.length}`, "学习阶段", "#1cb0f6")}
        ${STAT_BOX(`${totalDays}`, "预计天数", "#58cc02")}
      </div>

      <!-- 学习目标 -->
      <div style="background: linear-gradient(135deg, #f0fbe4, #e5f7ff); border-radius: 14px; padding: 14px 16px; margin-bottom: 18px; border: 1px solid #d1fae5;">
        <div style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">"🎯" 学习目标</div>
        <div style="font-size: 14px; color: #1f2937; line-height: 1.5;">${goal}</div>
      </div>

      <!-- 阶段时间线 -->
      <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">学习阶段</div>
      ${phases.map((phase: Record<string, unknown>, i: number) => {
        const phaseColors = ["#58cc02", "#1cb0f6", "#ce82ff", "#ff9600", "#10b981"];
        const c = phaseColors[i % phaseColors.length];
        return html`
          <div style="display: flex; gap: 14px; margin-bottom: 4px;">
            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${c}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; box-shadow: 0 2px 6px ${c}44;">${i + 1}</div>
              ${i < phases.length - 1 ? html`<div style="width: 2px; flex: 1; background: #e5e7eb; margin: 4px 0;"></div>` : ""}
            </div>
            <div style="flex: 1; padding: 10px 0 ${i < phases.length - 1 ? "14px" : "0"};">
              <div style="font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 2px;">${phase.name}</div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px; line-height: 1.4;">${phase.description}</div>
              <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #9ca3af; font-weight: 500;">"⏱" ${phase.estimatedDays} 天</div>
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderExercise(data: Record<string, unknown>): TemplateResult {
  const topic = (data.topic as string) || "";
  const difficulty = (data.difficulty as number) || 1;
  const type = (data.type as string) || "";
  const exercises = (data.exercises as Array<Record<string, unknown>>) || [];

  const typeLabels: Record<string, string> = { multiple_choice: "单选题", fill_blank: "填空题", true_false: "判断题", short_answer: "简答题" };
  const typeColors: Record<string, string> = { multiple_choice: "#1cb0f6", fill_blank: "#7c3aed", true_false: "#58cc02", short_answer: "#ff9600" };
  const c = typeColors[type] || "#6b7280";

  return html`
    <div style="${CARD}">
      ${CARD_HEADER("📝", "练习题", `${topic} · ${typeLabels[type] || type}`, "linear-gradient(135deg, #dbeafe, #bfdbfe)")}

      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
        <span style="display: flex; align-items: center; gap: 2px;">${"★".repeat(difficulty)}${"☆".repeat(5 - difficulty)}</span>
        <span style="font-size: 12px; color: #9ca3af;">难度 ${difficulty}/5</span>
        <span style="flex: 1;"></span>
        ${TAG(`${exercises.length} 题`, `${c}15`, c)}
      </div>

      ${exercises.map((ex: Record<string, unknown>, i: number) => html`
        <div style="background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 10px; border: 2px solid #f0f1f3; transition: border-color 0.2s;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${c}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${i + 1}</div>
            <span style="font-size: 12px; color: #9ca3af;">难度 ${(ex.difficulty as number) || difficulty}</span>
          </div>
          <div style="font-size: 14px; color: #1f2937; line-height: 1.7; margin-bottom: 10px;">${ex.question}</div>
          ${ex.options ? html`
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${(ex.options as string[]).map((opt: string) => html`
                <div style="font-size: 13px; padding: 8px 14px; border-radius: 10px; background: #f9fafb; border: 1.5px solid #e5e7eb; color: #4b5563; cursor: default; transition: all 0.15s;">${opt}</div>
              `)}
            </div>
          ` : ""}
        </div>
      `)}
    </div>
  `;
}

function renderFlashcard(data: Record<string, unknown>): TemplateResult {
  const topic = (data.topic as string) || "";
  const flashcards = (data.flashcards as Array<Record<string, unknown>>) || [];
  const studyTips = (data.studyTips as string[]) || [];

  return html`
    <div style="${CARD}">
      ${CARD_HEADER("🃏", "记忆卡片", `${topic} · 共 ${flashcards.length} 张`, "linear-gradient(135deg, #fef3c7, #fde68a)")}

      ${flashcards.map((fc: Record<string, unknown>, i: number) => html`
        <div style="border-radius: 16px; border: 2px solid #fbbf24; margin-bottom: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.1);">
          <div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); padding: 16px 18px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #fbbf24; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800;">${i + 1}</div>
              <span style="font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">正面 · 问题</span>
            </div>
            <div style="font-size: 14px; color: #78350f; line-height: 1.6;">${fc.front}</div>
          </div>
          <div style="background: #fff; padding: 16px 18px; border-top: 2px dashed #fcd34d;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #e5e7eb; color: #6b7280; display: flex; align-items: center; justify-content: center;">"💡"</div>
                <span style="font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">背面 · 答案</span>
            </div>
            <div style="font-size: 14px; color: #374151; line-height: 1.6;">${fc.back}</div>
          </div>
        </div>
      `)}

      ${studyTips.length > 0 ? html`
        <div style="background: #fffbeb; border-radius: 14px; padding: 14px 16px; border: 1px solid #fde68a;">
          <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">"💡" 学习建议</div>
          ${studyTips.map((tip: string) => html`<div style="font-size: 13px; color: #78350f; margin-bottom: 4px; line-height: 1.4;">• ${tip}</div>`)}
        </div>
      ` : ""}
    </div>
  `;
}

function renderQuiz(data: Record<string, unknown>): TemplateResult {
  const title = (data.title as string) || "综合测验";
  const difficulty = (data.difficulty as number) || 3;
  const totalPoints = (data.totalPoints as number) || 0;
  const passingScore = (data.passingScore as number) || 0;
  const timeLimit = (data.timeLimitMinutes as number) || 0;
  const questions = (data.questions as Array<Record<string, unknown>>) || [];
  const typeSummary = (data.typeSummary as Record<string, number>) || {};
  const typeLabels: Record<string, string> = { multiple_choice: "单选", fill_blank: "填空", true_false: "判断", short_answer: "简答" };

  return html`
    <div style="${CARD}">
      ${CARD_HEADER("📋", title, `难度 ${difficulty}/5 · ${timeLimit} 分钟`, "linear-gradient(135deg, #d1fae5, #a7f3d0)")}

      <!-- 统计 -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">
        ${STAT_BOX(`${questions.length}`, "总题数", "#059669")}
        ${STAT_BOX(`${totalPoints}`, "总分", "#1cb0f6")}
        ${STAT_BOX(`${passingScore}`, "及格分", "#ff9600")}
      </div>

      <!-- 题型分布 -->
      ${Object.keys(typeSummary).length > 0 ? html`
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
          ${Object.entries(typeSummary).map(([type, count]: [string, number]) => TAG(`${typeLabels[type] || type} ${count}题`, "#f3f4f6", "#4b5563"))}
        </div>
      ` : ""}

      <!-- 题目列表 -->
      ${questions.map((q: Record<string, unknown>, i: number) => html`
        <div style="background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 10px; border: 2px solid #f0f1f3;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;">${i + 1}</div>
            <span style="font-size: 12px; font-weight: 600; color: #059669;">${q.points} 分</span>
            <span style="font-size: 12px; color: #9ca3af;">· ${q.topic}</span>
          </div>
          <div style="font-size: 14px; color: #1f2937; line-height: 1.7; margin-bottom: 10px;">${q.question}</div>
          ${q.options ? html`
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${(q.options as string[]).map((opt: string) => html`
                <div style="font-size: 13px; padding: 8px 14px; border-radius: 10px; background: #f9fafb; border: 1.5px solid #e5e7eb; color: #4b5563; cursor: default;">${opt}</div>
              `)}
            </div>
          ` : ""}
        </div>
      `)}
    </div>
  `;
}

function renderError(msg: ToolResultMessage): TemplateResult {
  const textContent = msg.content.find((c) => c.type === "text");
  return html`
    <div style="${CARD} background: #fef2f2; border: 2px solid #fecaca; border-radius: 16px; padding: 16px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 18px;">"😵"</span>
        <span style="font-size: 14px; font-weight: 700; color: #dc2626;">工具执行失败</span>
        <span style="font-size: 12px; color: #f87171;">${msg.toolName}</span>
      </div>
      <div style="font-size: 13px; color: #991b1b; line-height: 1.5;">${textContent?.text || "未知错误"}</div>
    </div>
  `;
}

// ==================== 主渲染器 ====================

const toolResultRenderer = {
  render(message: AgentMessage): TemplateResult {
    if (!isToolResultMessage(message)) return html``;
    if (message.isError) return renderError(message);

    const data = extractData(message);

    switch (message.toolName) {
      case "evaluate_level": return renderEvaluateLevel(data);
      case "create_learning_path": return renderLearningPath(data);
      case "generate_exercise": return renderExercise(data);
      case "create_flashcard": return renderFlashcard(data);
      case "generate_quiz": return renderQuiz(data);
      default:
        const textContent = message.content.find((c) => c.type === "text");
        return html`
          <div style="${CARD} background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px;">
            <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">"🔧" ${message.toolName}</div>
            <pre style="font-size: 13px; color: #374151; white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; line-height: 1.5;">${textContent?.text || ""}</pre>
          </div>
        `;
    }
  },
};

export function registerToolRenderers(): void {
  registerMessageRenderer("toolResult", toolResultRenderer);
  console.log("教学工具消息渲染器已注册");
}
