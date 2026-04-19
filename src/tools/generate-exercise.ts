/**
 * 练习题生成工具
 * 根据知识点和难度生成各类练习题
 */
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export interface ExerciseQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "fill_blank" | "true_false" | "short_answer";
  difficulty: number;
  topic: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface GenerateExerciseDetails {
  topic: string;
  difficulty: number;
  type: string;
  count: number;
}

const generateExerciseSchema = Type.Object({
  topic: Type.String({
    description: "知识点/主题，例如：'二次方程'、'牛顿第三定律'、'英语现在完成时'",
  }),
  difficulty: Type.Integer({
    minimum: 1,
    maximum: 5,
    description: "难度等级，1=入门，2=基础，3=进阶，4=高级，5=精通",
  }),
  type: Type.Union([
    Type.Literal("multiple_choice"),
    Type.Literal("fill_blank"),
    Type.Literal("true_false"),
    Type.Literal("short_answer"),
  ], {
    description: "题目类型：multiple_choice=单选题，fill_blank=填空题，true_false=判断题，short_answer=简答题",
  }),
  count: Type.Optional(Type.Integer({
    minimum: 1,
    maximum: 10,
    description: "生成数量，默认为 3 题",
  })),
});

type GenerateExerciseParams = Static<typeof generateExerciseSchema>;

function generateId(): string {
  return `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    multiple_choice: "单选题",
    fill_blank: "填空题",
    true_false: "判断题",
    short_answer: "简答题",
  };
  return typeNames[type] || type;
}

export function createGenerateExerciseTool(): AgentTool<typeof generateExerciseSchema, GenerateExerciseDetails> {
  return {
    name: "generate_exercise",
    label: "生成练习题",
    description:
      "根据知识点生成练习题。支持单选题、填空题、判断题和简答题。可以根据难度等级和题目类型灵活生成，帮助学习者巩固知识。",
    parameters: generateExerciseSchema,
    async execute(_toolCallId, params) {
      const { topic, difficulty, type, count = 3 } = params;

      const exercises: ExerciseQuestion[] = [];

      for (let i = 0; i < count; i++) {
        const exercise: ExerciseQuestion = {
          id: generateId(),
          question: "",
          type,
          difficulty,
          topic,
          correctAnswer: "",
          explanation: "",
        };

        switch (type) {
          case "multiple_choice":
            exercise.question = `[${topic}] 单选题 #${i + 1}（难度 ${difficulty}）：请根据你的知识生成一道关于"${topic}"的单选题，包含 4 个选项。`;
            exercise.options = ["选项 A", "选项 B", "选项 C", "选项 D"];
            exercise.correctAnswer = "请根据知识点确定正确答案";
            exercise.explanation = `本题考查${topic}的核心概念，难度等级 ${difficulty}`;
            break;

          case "fill_blank":
            exercise.question = `[${topic}] 填空题 #${i + 1}（难度 ${difficulty}）：请根据你的知识生成一道关于"${topic}"的填空题，用 ___ 标记空白处。`;
            exercise.correctAnswer = "请填写正确答案";
            exercise.explanation = `本题考查${topic}的关键知识点，难度等级 ${difficulty}`;
            break;

          case "true_false":
            exercise.question = `[${topic}] 判断题 #${i + 1}（难度 ${difficulty}）：请根据你的知识生成一道关于"${topic}"的判断题。`;
            exercise.correctAnswer = "正确/错误";
            exercise.explanation = `本题考查${topic}中容易混淆的概念，难度等级 ${difficulty}`;
            break;

          case "short_answer":
            exercise.question = `[${topic}] 简答题 #${i + 1}（难度 ${difficulty}）：请根据你的知识生成一道关于"${topic}"的简答题，要求用户详细阐述。`;
            exercise.correctAnswer = "请提供详细的参考答案";
            exercise.explanation = `本题考查${topic}的综合理解能力，难度等级 ${difficulty}`;
            break;
        }

        exercises.push(exercise);
      }

      const result = {
        success: true,
        topic,
        difficulty,
        type,
        count: exercises.length,
        exercises,
        message: `已成功生成 ${exercises.length} 道${getTypeName(type)}，主题：${topic}，难度等级：${difficulty}`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { topic, difficulty, type, count: exercises.length },
      };
    },
  };
}
