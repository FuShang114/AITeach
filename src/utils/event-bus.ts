/**
 * 事件总线 - 视图层与 ChatPanel 之间的通信桥梁
 */

type EventCallback = (detail: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    // 返回取消订阅函数
    return () => this.off(event, callback);
  }

  /**
   * 取消订阅
   */
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * 触发事件
   */
  emit(event: string, detail?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(detail);
        } catch (e) {
          console.error(`[EventBus] Error in handler for "${event}":`, e);
        }
      });
    }
  }

  /**
   * 一次性订阅
   */
  once(event: string, callback: EventCallback): () => void {
    const wrapper = (detail: any) => {
      this.off(event, wrapper);
      callback(detail);
    };
    return this.on(event, wrapper);
  }
}

// 全局单例
export const eventBus = new EventBus();

// 预定义事件类型常量
export const AppEvents = {
  // 视图切换
  VIEW_CHANGE: 'view-change',

  // 计划相关
  PLAN_CREATED: 'plan-created',
  PLAN_UPDATED: 'plan-updated',
  PLAN_DELETED: 'plan-deleted',
  PLAN_SWITCHED: 'plan-switched',

  // 教具相关
  TEACH_OVERLAY_OPEN: 'teach-overlay-open',
  TEACH_OVERLAY_CLOSE: 'teach-overlay-close',

  // 学习进度
  EXERCISE_COMPLETED: 'exercise-completed',
  QUIZ_COMPLETED: 'quiz-completed',
  FLASHCARD_REVIEWED: 'flashcard-reviewed',
  EVALUATION_COMPLETED: 'evaluation-completed',

  // AI 相关
  AI_MESSAGE: 'ai-message',
  AI_STATUS_CHANGE: 'ai-status-change',

  // Live2D
  L2D_SHOW_BUBBLE: 'l2d-show-bubble',
  L2D_SET_EXPRESSION: 'l2d-set-expression',
  L2D_OPEN_CHAT: 'l2d-open-chat',
  L2D_SEND_MESSAGE: 'l2d-send-message',

  // AI 引导式计划创建
  AI_CREATE_PLAN_START: 'ai-create-plan-start',
  PLAN_PREVIEW_OVERVIEW: 'plan-preview-overview',
  PLAN_PREVIEW_PHASE: 'plan-preview-phase',
  PLAN_PREVIEW_LESSON: 'plan-preview-lesson',
  PLAN_PREVIEW_DONE: 'plan-preview-done',
  PLAN_PREVIEW_CONFIRMED: 'plan-preview-confirmed',
} as const;
