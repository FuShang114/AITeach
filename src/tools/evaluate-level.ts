/**
 * 用户水平评估工具
 * 评估用户当前的知识水平，推荐学习起点
 */
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export interface LevelAssessment {
  subject: string;
  userDescription: string;
  assessedLevel: number;
  levelLabel: string;
  strengths: string[];
  weaknesses: string[];
  recommendedStartPoint: string;
  suggestedTopics: string[];
  nextSteps: string[];
}

export interface EvaluateLevelDetails {
  subject: string;
  assessedLevel: number;
  levelLabel: string;
}

const evaluateLevelSchema = Type.Object({
  subject: Type.String({
    description: "要评估的学科/技能，例如：'线性代数'、'英语口语'、'数据结构'",
  }),
  user_description: Type.String({
    description: "用户对自己当前水平的描述，包括学习经历、掌握程度、遇到困难的地方等",
  }),
});

type EvaluateLevelParams = Static<typeof evaluateLevelSchema>;

function getLevelLabel(level: number): string {
  if (level <= 1) return "零基础";
  if (level <= 2) return "入门";
  if (level <= 4) return "基础";
  if (level <= 6) return "进阶";
  if (level <= 8) return "高级";
  return "精通";
}

export function createEvaluateLevelTool(): AgentTool<typeof evaluateLevelSchema, EvaluateLevelDetails> {
  return {
    name: "evaluate_level",
    label: "评估知识水平",
    description:
      "评估用户在特定学科的知识水平。根据用户的自我描述和学习背景，分析其当前水平，识别优势和薄弱环节，推荐合适的学习起点和优先学习内容。",
    parameters: evaluateLevelSchema,
    async execute(_toolCallId, params) {
      const { subject, user_description } = params;

      const descriptionLower = user_description.toLowerCase();
      let assessedLevel = 1;

      const advancedKeywords = ["精通", "熟练", "深入", "高级", "掌握", "熟悉", "expert", "advanced", "proficient"];
      const intermediateKeywords = ["了解", "学过", "基础", "入门", "知道", "basic", "intermediate", "beginner"];
      const beginnerKeywords = ["零基础", "没学过", "完全不懂", "新手", "beginner", "no experience"];

      const hasAdvanced = advancedKeywords.some((kw) => descriptionLower.includes(kw));
      const hasIntermediate = intermediateKeywords.some((kw) => descriptionLower.includes(kw));
      const hasBeginner = beginnerKeywords.some((kw) => descriptionLower.includes(kw));

      if (hasAdvanced) {
        assessedLevel = 7;
      } else if (hasIntermediate) {
        assessedLevel = 4;
      } else if (hasBeginner) {
        assessedLevel = 1;
      } else {
        assessedLevel = 3;
      }

      const levelLabel = getLevelLabel(assessedLevel);

      const result: LevelAssessment = {
        subject,
        userDescription: user_description,
        assessedLevel,
        levelLabel,
        strengths: [
          `${subject}相关的学习意愿和积极性`,
          assessedLevel >= 4 ? "已有一定的知识基础" : "适合从零开始系统学习",
        ],
        weaknesses: [
          assessedLevel < 3 ? `${subject}基础知识需要系统建立` : `${subject}的深入理解和应用需要加强`,
          "需要更多的实践练习来巩固知识",
        ],
        recommendedStartPoint: assessedLevel <= 2
          ? `建议从${subject}的最基础概念开始学习，建立完整的知识框架`
          : assessedLevel <= 5
            ? `建议从${subject}的核心知识点开始，查漏补缺并逐步深入`
            : `建议从${subject}的高级主题开始，注重综合应用和实际项目实践`,
        suggestedTopics: [
          `${subject}基础概念与核心原理`,
          `${subject}常见问题与解题方法`,
          `${subject}实践应用与案例分析`,
        ],
        nextSteps: [
          `1. 使用 create_learning_path 工具制定个性化学习计划`,
          `2. 使用 generate_exercise 工具生成练习题测试当前水平`,
          `3. 使用 create_flashcard 工具创建记忆卡片巩固关键概念`,
        ],
      };

      const message = `知识水平评估结果\n\n` +
        `学科：${subject}\n` +
        `评估水平：${assessedLevel}/10（${levelLabel}）\n` +
        `推荐起点：${result.recommendedStartPoint}\n\n` +
        `建议下一步操作：\n` +
        result.nextSteps.join("\n");

      return {
        content: [{ type: "text", text: JSON.stringify({ ...result, message }, null, 2) }],
        details: { subject, assessedLevel, levelLabel },
      };
    },
  };
}
