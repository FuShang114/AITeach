/**
 * 工具注册中心
 * 导出所有教学工具并提供统一的获取函数
 */
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { createGenerateExerciseTool } from "./generate-exercise";
import { createFlashcardTool } from "./create-flashcard";
import { createLearningPathTool } from "./create-learning-path";
import { createEvaluateLevelTool } from "./evaluate-level";
import { createGenerateQuizTool } from "./generate-quiz";

// 重新导出所有工具创建函数
export { createGenerateExerciseTool } from "./generate-exercise";
export { createFlashcardTool } from "./create-flashcard";
export { createLearningPathTool } from "./create-learning-path";
export { createEvaluateLevelTool } from "./evaluate-level";
export { createGenerateQuizTool } from "./generate-quiz";

// 重新导出类型
export type { ExerciseQuestion, GenerateExerciseDetails } from "./generate-exercise";
export type { Flashcard, CreateFlashcardDetails } from "./create-flashcard";
export type { PlanPhase as LearningPathPhase, PlanResult as LearningPathResult } from "./create-learning-path";
export type { LevelAssessment, EvaluateLevelDetails } from "./evaluate-level";
export type { Quiz, QuizQuestion, GenerateQuizDetails } from "./generate-quiz";

/**
 * 获取所有教学工具的实例列表
 * 用于注册到 Agent 中
 */
export function getAllLearningTools(): AgentTool<any, any>[] {
  return [
    createEvaluateLevelTool(),
    createLearningPathTool(),
    createGenerateExerciseTool(),
    createFlashcardTool(),
    createGenerateQuizTool(),
  ];
}

/**
 * 获取工具名称列表（用于日志和调试）
 */
export function getToolNames(): string[] {
  return getAllLearningTools().map((tool) => tool.name);
}
