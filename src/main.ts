/**
 * AI 智能教学平台 - 入口文件
 */
import {
  ChatPanel,
  IndexedDBStorageBackend,
  ProviderKeysStore,
  SessionsStore,
  SettingsStore,
  CustomProvidersStore,
  setAppStorage,
  AppStorage,
} from "@mariozechner/pi-web-ui";
import { createTeachingAgent } from "./agent/agent-setup";
import { registerToolRenderers } from "./renderers/tool-renderers";
import { eventBus, AppEvents } from "./utils/event-bus";
import { initPlanStreamParser } from "./utils/plan-stream-parser";
import "./components/app-layout";
import "./components/teach-overlay";
import "./components/l2d-bubble-chat";
import "./components/plan-preview-panel";
import "./views/home-view";
import "./views/learning-path-view";
import "./views/exercise-view";
import "./views/quiz-view";
import "./views/flashcard-view";
import "./views/evaluation-view";
import "./app.css";

/**
 * 核心修复 1：Patch Agent.finishRun()
 * finishRun() 将 state.isStreaming 设为 false，但不发出事件也不触发 UI 更新。
 */
async function patchAgentFinishRun() {
  const agentModule = await import("@mariozechner/pi-agent-core");
  const AgentClass = agentModule.Agent;
  if (!(AgentClass.prototype as any)?.finishRun) return;

  const origFinishRun = (AgentClass.prototype as any).finishRun;
  (AgentClass.prototype as any).finishRun = function () {
    origFinishRun.call(this);
    setTimeout(() => {
      const ai = document.querySelector("agent-interface");
      if (ai && (ai as any).session === this) {
        (ai as any).requestUpdate();
      }
    }, 0);
  };
  console.log("[FIX] Agent.finishRun patch installed");
}

/**
 * 核心修复 2：Patch AgentInterface.renderMessages()
 *
 * 根因：Agent.state.messages 是同一个数组引用，通过 push 添加新消息。
 * LitElement 用 === 比较属性新旧值，同一引用 === 为 true，不会触发子组件更新。
 * 所以 message-list 拿到的 messages 引用没变，不会重新渲染用户消息。
 *
 * 修复：在 renderMessages() 中将 messages 展开为新数组 [...messages]，
 * 每次 render 都产生新引用，强制 message-list 检测到变化并重新渲染。
 */
function patchAgentInterfaceRenderMessages() {
  const proto = customElements.get("agent-interface")?.prototype;
  if (!proto) {
    setTimeout(patchAgentInterfaceRenderMessages, 100);
    return;
  }
  const origRenderMessages = proto.renderMessages;
  if (!origRenderMessages) return;
  proto.renderMessages = function () {
    // 创建新的 messages 引用，强制 message-list 更新
    const state = this.session?.state;
    if (state && state.messages) {
      // 临时替换为数组副本，render 完恢复
      const original = state.messages;
      state.messages = [...original];
      try {
        return origRenderMessages.call(this);
      } finally {
        state.messages = original;
      }
    }
    return origRenderMessages.call(this);
  };
  console.log("[FIX] AgentInterface.renderMessages patch installed");
}

// 等待 custom elements 注册后安装补丁
setTimeout(patchAgentFinishRun, 100);
setTimeout(patchAgentInterfaceRenderMessages, 200);

const DEEPSEEK_API_KEY = "sk-daf85e283f4442268851ae10f13263d1";
const DEEPSEEK_PROVIDER_ID = "deepseek-custom";

// 防止 HMR 重复初始化
const INIT_KEY = "__ai_teaching_initialized__";
if (!(window as any)[INIT_KEY]) {
  (window as any)[INIT_KEY] = true;
  init().catch((error) => {
    console.error("应用初始化失败：", error);
  });
}

// 当前会话 ID
let currentSessionId: string | null = null;
let currentTitle: string | null = null;

async function init() {
  registerToolRenderers();

  // 初始化存储
  const settings = new SettingsStore();
  const providerKeys = new ProviderKeysStore();
  const sessions = new SessionsStore();
  const customProviders = new CustomProvidersStore();

  const backend = new IndexedDBStorageBackend({
    dbName: "ai-teaching-platform",
    version: 2,
    stores: [
      settings.getConfig(),
      SessionsStore.getMetadataConfig(),
      providerKeys.getConfig(),
      customProviders.getConfig(),
      sessions.getConfig(),
    ],
  });

  settings.setBackend(backend);
  providerKeys.setBackend(backend);
  customProviders.setBackend(backend);
  sessions.setBackend(backend);

  const storage = new AppStorage(settings, providerKeys, sessions, customProviders, backend);
  setAppStorage(storage);

  // 注册 DeepSeek 为自定义 Provider
  await customProviders.set({
    id: DEEPSEEK_PROVIDER_ID,
    name: "DeepSeek",
    type: "openai-completions",
    baseUrl: "https://api.deepseek.com",
    apiKey: DEEPSEEK_API_KEY,
    models: [
      {
        id: "deepseek-chat",
        name: "deepseek-chat",
        provider: "DeepSeek",
        api: "openai-completions" as any,
        baseUrl: "https://api.deepseek.com",
        reasoning: false,
        input: ["text", "image"],
        cost: { input: 0.14, output: 0.28, cacheRead: 0.014, cacheWrite: 0.28 },
        contextWindow: 65536,
        maxTokens: 8192,
      },
      {
        id: "deepseek-reasoner",
        name: "deepseek-reasoner",
        provider: "DeepSeek",
        api: "openai-completions" as any,
        baseUrl: "https://api.deepseek.com",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.55, output: 2.19, cacheRead: 0.055, cacheWrite: 2.19 },
        contextWindow: 65536,
        maxTokens: 8192,
      },
    ],
  });

  await providerKeys.set("DeepSeek", DEEPSEEK_API_KEY);
  await settings.set("proxy.url", "http://localhost:3001");
  await settings.set("proxy.enabled", true);

  // 创建教学 Agent
  const agent = createTeachingAgent({
    getApiKey: async (provider: string) => {
      if (provider === "DeepSeek") return DEEPSEEK_API_KEY;
      const storedKey = await providerKeys.get(provider);
      return storedKey || undefined;
    },
  });

  // 安全措施：确保 Agent 不会卡在 streaming 状态
  // （页面刷新后 ChatPanel 可能从 IndexedDB 恢复了 isStreaming=true 的旧状态）
  if ((agent.state as any).isStreaming) {
    (agent.state as any).isStreaming = false;
    (agent.state as any).streamingMessage = undefined;
  }

  // 监听 Agent 事件 - 持久化 + 强制 UI 更新
  agent.subscribe(async (event: any) => {
    // 持久化
    if (event.type === "turn_end" || event.type === "agent_end") {
      const messages = agent.state.messages;
      if (!messages || messages.length === 0) return;

      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
        const firstUserMsg = messages.find((m: any) => m.role === "user");
        currentTitle = firstUserMsg
          ? (typeof firstUserMsg.content === "string" ? firstUserMsg.content.slice(0, 50) : "新对话") || "新对话"
          : "新对话";
      }

      try {
        await sessions.saveSession(currentSessionId, agent.state, undefined, currentTitle || "新对话");
      } catch (e) {
        console.error("保存会话失败:", e);
      }
    }

    // 关键修复：在 message_end 和 agent_end 后强制触发 AgentInterface 重新渲染
    // message_end: 用户消息发送后立即显示（不等 AI 回复）
    // agent_end: AI 回复完成后确保最终状态正确
    if (event.type === "message_end" || event.type === "agent_end") {
      requestAnimationFrame(() => {
        const ai = document.querySelector("agent-interface");
        if (ai) {
          (ai as any).requestUpdate();
        }
      });
    }
  });

  // 初始化计划流式解析器
  initPlanStreamParser(agent);

  // 创建 ChatPanel
  const chatPanel = new ChatPanel();

  await chatPanel.setAgent(agent, {
    onApiKeyRequired: async () => true,
    toolsFactory: () => [],
  });

  // 挂载 layout（不再包含 ChatPanel，ChatPanel 由 l2d-bubble-chat 管理）
  const app = document.getElementById("app")!;
  app.innerHTML = "";
  const layout = document.createElement("app-layout") as any;
  layout.agent = agent;
  app.appendChild(layout);

  // 创建 teach-overlay 实例并添加到 body
  const teachOverlay = document.createElement('teach-overlay') as any;
  document.body.appendChild(teachOverlay);
  // 暴露全局访问
  (window as any).__teachOverlay = teachOverlay;

  // 创建 Live2D 抽屉聊天组件，先将组件挂载到 DOM，再设置 ChatPanel
  const l2dChat = document.createElement('l2d-bubble-chat') as any;
  document.body.appendChild(l2dChat);
  // connectedCallback 执行后再挂载 ChatPanel，确保 #l2dChatArea 已存在
  l2dChat.setChatPanel(chatPanel);

  // 创建计划预览面板
  const planPreviewPanel = document.createElement('plan-preview-panel');
  document.body.appendChild(planPreviewPanel);

  // 视图路由
  const viewLayer = layout.querySelector('#viewLayer') as HTMLElement;
  const views: Record<string, HTMLElement | null> = {};

  function loadView(viewId: string) {
    // 清除所有旧视图和占位符
    viewLayer.innerHTML = '';
    Object.keys(views).forEach(k => { views[k] = null; });

    // 创建新视图
    let view: HTMLElement | null = null;
    switch(viewId) {
      case 'home':
        view = document.createElement('home-view');
        break;
      case 'learning-path':
        view = document.createElement('learning-path-view');
        break;
      case 'exercise':
        view = document.createElement('exercise-view');
        break;
      case 'quiz':
        view = document.createElement('quiz-view');
        break;
      case 'flashcard':
        view = document.createElement('flashcard-view');
        break;
      case 'evaluation':
        view = document.createElement('evaluation-view');
        break;
      // 其他视图将在后续阶段添加
      default:
        break;
    }

    if (view) {
      views[viewId] = view;
      viewLayer.appendChild(view);
    }
  }

  // 监听导航切换（从 app-layout DOM 事件）
  layout.addEventListener('view-change', ((e: CustomEvent) => {
    loadView(e.detail.viewId);
    // 同步导航栏 active 状态
    layout.querySelectorAll('.nav-item').forEach((btn: Element) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.view === e.detail.viewId);
    });
  }) as EventListener);

  // 桥接 eventBus VIEW_CHANGE → DOM view-change 事件
  eventBus.on(AppEvents.VIEW_CHANGE, (detail: any) => {
    layout.dispatchEvent(new CustomEvent('view-change', { detail, bubbles: true, composed: true }));
  });

  // 初始加载首页
  loadView('home');

  // 全局错误捕获
  window.addEventListener("error", (event) => {
    console.error("[全局错误]:", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[未处理Promise]:", event.reason);
  });

  console.log("AI 智能教学平台初始化完成！");
}
