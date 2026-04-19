/**
 * 综合测验生成工具
 * 生成包含多种题型的综合测验
 */
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "fill_blank" | "true_false" | "short_answer";
  topic: string;
  difficulty: number;
  points: number;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  topics: string[];
  difficulty: number;
  totalPoints: number;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
  passingScore: number;
}

export interface GenerateQuizDetails {
  topics: string[];
  difficulty: number;
  questionCount: number;
  totalPoints: number;
}

const generateQuizSchema = Type.Object({
  topics: Type.Array(Type.String(), {
    description: "测验涵盖的知识点列表，例如：['函数', '方程', '不等式']",
  }),
  difficulty: Type.Optional(Type.Integer({
    minimum: 1,
    maximum: 5,
    description: "整体难度等级，1=入门，5=精通，默认为 3",
  })),
  question_count: Type.Optional(Type.Integer({
    minimum: 3,
    maximum: 30,
    description: "题目总数，默认为 10 题",
  })),
  time_limit_minutes: Type.Optional(Type.Integer({
    minimum: 5,
    maximum: 180,
    description: "时间限制（分钟），默认为 30 分钟",
  })),
});

type GenerateQuizParams = Static<typeof generateQuizSchema>;

function generateId(): string {
  return `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function distributeQuestionTypes(count: number): Array<"multiple_choice" | "fill_blank" | "true_false" | "short_answer"> {
  const types: Array<"multiple_choice" | "fill_blank" | "true_false" | "short_answer"> = [];
  const mcCount = Math.round(count * 0.4);
  const fbCount = Math.round(count * 0.25);
  const tfCount = Math.round(count * 0.2);
  const saCount = count - mcCount - fbCount - tfCount;

  for (let i = 0; i < mcCount; i++) types.push("multiple_choice");
  for (let i = 0; i < fbCount; i++) types.push("fill_blank");
  for (let i = 0; i < tfCount; i++) types.push("true_false");
  for (let i = 0; i < saCount; i++) types.push("short_answer");

  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  return types;
}

export function createGenerateQuizTool(): AgentTool<typeof generateQuizSchema, GenerateQuizDetails> {
  return {
    name: "generate_quiz",
    label: "生成综合测验",
    description:
      "生成包含多种题型的综合测验，用于检验学习成果。测验可以覆盖多个知识点，混合不同题型，并设置时间限制，模拟真实考试环境。",
    parameters: generateQuizSchema,
    async execute(_toolCallId, params) {
      const {
        topics,
        difficulty = 3,
        question_count = 10,
        time_limit_minutes = 30,
      } = params;

      const questionTypes = distributeQuestionTypes(question_count);
      const questions: QuizQuestion[] = [];

      let questionIndex = 0;
      for (const type of questionTypes) {
        const topic = topics[questionIndex % topics.length];
        const pointsPerQuestion = type === "short_answer" ? 15 : type === "multiple_choice" ? 10 : 5;

        const question: QuizQuestion = {
          id: generateId(),
          question: "",
          type,
          topic,
          difficulty,
          points: pointsPerQuestion,
          correctAnswer: "",
          explanation: "",
        };

        switch (type) {
          case "multiple_choice":
            question.question = `【单选题 #${questionIndex + 1}】关于"${topic}"的以下哪个说法是正确的？`;
            question.options = ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"];
            question.correctAnswer = "请根据知识点确定正确选项";
            question.explanation = `本题考查${topic}的核心概念`;
            break;

          case "fill_blank":
            question.question = `【填空题 #${questionIndex + 1}】${topic}中，___ 是最基本的概念之一。`;
            question.correctAnswer = "请填写正确答案";
            question.explanation = `本题考查${topic}的基础知识`;
            break;

          case "true_false":
            question.question = `【判断题 #${questionIndex + 1}】关于"${topic}"的以下说法是否正确？`;
            question.correctAnswer = "正确/错误";
            question.explanation = `本题考查${topic}中容易混淆的概念`;
            break;

          case "short_answer":
            question.question = `【简答题 #${questionIndex + 1}】请详细解释"${topic}"的核心原理及其应用。`;
            question.correctAnswer = "请提供详细的参考答案";
            question.explanation = `本题考查${topic}的综合理解能力`;
            break;
        }

        questions.push(question);
        questionIndex++;
      }

      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const passingScore = Math.round(totalPoints * 0.6);

      const quiz: Quiz = {
        id: generateId(),
        title: `${topics.join("、")} 综合测验`,
        topics,
        difficulty,
        totalPoints,
        timeLimitMinutes: time_limit_minutes,
        questions,
        passingScore,
      };

      const typeSummary = {
        multiple_choice: questions.filter((q) => q.type === "multiple_choice").length,
        fill_blank: questions.filter((q) => q.type === "fill_blank").length,
        true_false: questions.filter((q) => q.type === "true_false").length,
        short_answer: questions.filter((q) => q.type === "short_answer").length,
      };

      const message = `综合测验已生成！\n\n` +
        `测验标题：${quiz.title}\n` +
        `涵盖主题：${topics.join("、")}\n` +
        `难度等级：${difficulty}/5\n` +
        `题目数量：${questions.length} 题\n` +
        `  - 单选题：${typeSummary.multiple_choice} 题\n` +
        `  - 填空题：${typeSummary.fill_blank} 题\n` +
        `  - 判断题：${typeSummary.true_false} 题\n` +
        `  - 简答题：${typeSummary.short_answer} 题\n` +
        `总分：${totalPoints} 分\n` +
        `及格分：${passingScore} 分（60%）\n` +
        `时间限制：${time_limit_minutes} 分钟`;

      return {
        content: [{ type: "text", text: JSON.stringify({ ...quiz, message, typeSummary }, null, 2) }],
        details: { topics, difficulty, questionCount: questions.length, totalPoints },
      };
    },
  };
}
