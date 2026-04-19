/**
 * 记忆卡片创建工具
 * 用于创建间隔重复学习的闪卡
 */
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  difficulty: number;
  reviewCount: number;
  lastReviewed: number;
}

export interface CreateFlashcardDetails {
  topic: string;
  difficulty: number;
  count: number;
}

const createFlashcardSchema = Type.Object({
  topic: Type.String({
    description: "知识主题，例如：'化学元素周期表'、'英语不规则动词'、'历史事件年表'",
  }),
  count: Type.Optional(Type.Integer({
    minimum: 1,
    maximum: 20,
    description: "生成卡片数量，默认为 5 张",
  })),
  difficulty: Type.Optional(Type.Integer({
    minimum: 1,
    maximum: 5,
    description: "难度等级，1=入门，5=精通，默认为 2",
  })),
});

type CreateFlashcardParams = Static<typeof createFlashcardSchema>;

function generateId(): string {
  return `fc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFlashcardTool(): AgentTool<typeof createFlashcardSchema, CreateFlashcardDetails> {
  return {
    name: "create_flashcard",
    label: "创建记忆卡片",
    description:
      "创建记忆卡片（闪卡），用于间隔重复学习。每张卡片包含正面（问题/概念）和背面（答案/解释）。适合用于记忆术语、公式、定义等需要反复记忆的知识点。",
    parameters: createFlashcardSchema,
    async execute(_toolCallId, params) {
      const { topic, count = 5, difficulty = 2 } = params;

      const flashcards: Flashcard[] = [];

      for (let i = 0; i < count; i++) {
        flashcards.push({
          id: generateId(),
          front: `[${topic}] 卡片 #${i + 1}\n\n请根据"${topic}"主题，生成一个需要记忆的关键概念、术语或公式作为卡片正面。`,
          back: `请提供该概念/术语/公式的准确定义、解释或答案，以及相关的记忆技巧或联想方法。`,
          topic,
          difficulty,
          reviewCount: 0,
          lastReviewed: 0,
        });
      }

      const result = {
        success: true,
        topic,
        difficulty,
        count: flashcards.length,
        flashcards,
        message: `已成功创建 ${flashcards.length} 张关于"${topic}"的记忆卡片`,
        studyTips: [
          "建议每天复习 10-20 张卡片",
          "对熟悉的卡片可以降低复习频率",
          "对困难的卡片增加复习次数",
          "使用间隔重复法效果最佳：1天、3天、7天、14天、30天",
        ],
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: { topic, difficulty, count: flashcards.length },
      };
    },
  };
}
