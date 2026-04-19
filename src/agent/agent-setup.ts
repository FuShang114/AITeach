/**
 * Agent 初始化模块
 */
import { Agent } from "@mariozechner/pi-agent-core";
import { TEACHING_SYSTEM_PROMPT } from "./system-prompt";
import { getAllLearningTools } from "../tools";

// DeepSeek 模型配置
const DEEPSEEK_MODEL = {
  id: "deepseek-chat",
  name: "deepseek-chat",
  provider: "DeepSeek",
  api: "openai-completions",
  baseUrl: "https://api.deepseek.com",
  reasoning: false,
  input: ["text", "image"] as ("text" | "image")[],
  cost: { input: 0.14, output: 0.28, cacheRead: 0.014, cacheWrite: 0.28 },
  contextWindow: 65536,
  maxTokens: 8192,
};

export function createTeachingAgent(options?: {
  getApiKey?: (provider: string) => string | Promise<string | undefined>;
}): Agent {
  const { getApiKey } = options || {};
  const tools = getAllLearningTools();

  const agent = new Agent({
    getApiKey: getApiKey as any,
    initialState: {
      systemPrompt: TEACHING_SYSTEM_PROMPT,
      model: DEEPSEEK_MODEL as any,
      thinkingLevel: "off",
      messages: [],
      tools,
    },
  });

  return agent;
}
