/**
 * 计划流式解析器
 * 监听 Agent 的流式消息事件，解析 AI 输出中的计划结构化数据
 * 并通过 eventBus 发送 PLAN_PREVIEW_* 事件供 plan-preview-panel 消费
 */
import { eventBus, AppEvents } from './event-bus';

// 状态
let buffer = '';
let inPlanSection = false;
let currentPhaseIndex = 0;
let overviewEmitted = false;

/**
 * 初始化计划流式解析器
 * @param agent - Agent 实例，需要有 subscribe 方法
 */
export function initPlanStreamParser(agent: any): void {
  agent.subscribe((event: any) => {
    if (event.type === 'message_update' && event.delta) {
      buffer += event.delta;
      parseBuffer();
    }

    if (event.type === 'turn_end') {
      // Flush remaining phase
      flushCurrentPhase();
      eventBus.emit(AppEvents.PLAN_PREVIEW_DONE);
      resetState();
    }
  });
}

function resetState(): void {
  buffer = '';
  inPlanSection = false;
  currentPhaseIndex = 0;
  overviewEmitted = false;
}

function parseBuffer(): void {
  // Check for plan overview section
  if (!overviewEmitted) {
    const overviewMatch = buffer.match(/##\s*📋\s*计划概览\s*\n([\s\S]*?)(?=\n---|\n##\s*📌)/);
    if (overviewMatch) {
      parseOverview(overviewMatch[1]);
      overviewEmitted = true;
      inPlanSection = true;
    }
  }

  // Parse phases
  if (inPlanSection) {
    parsePhases();
  }
}

function parseOverview(text: string): void {
  // Parse: **{学科} Lv.{起始} → Lv.{目标}** | 预计 {天数} 天 | 每天 {时间} 分钟
  const nameMatch = text.match(/\*\*(.+?)\*\*/);
  const daysMatch = text.match(/预计\s*(\d+)\s*天/);
  const timeMatch = text.match(/每天\s*(\d+)\s*分钟/);
  const levelMatch = text.match(/Lv\.(\d+)\s*→\s*Lv\.(\d+)/);

  const name = nameMatch ? nameMatch[1].trim() : '学习计划';
  const subject = name.replace(/\s*Lv\..+$/, '').trim();
  const from = levelMatch ? parseInt(levelMatch[1]) : 0;
  const to = levelMatch ? parseInt(levelMatch[2]) : 5;
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  const timePerDay = timeMatch ? `${timeMatch[1]}分钟` : '60分钟';

  eventBus.emit(AppEvents.PLAN_PREVIEW_OVERVIEW, {
    name,
    subject,
    from,
    to,
    days,
    timePerDay,
  });
}

function parsePhases(): void {
  // Match all phase headers: ## 📌 阶段 X：{name}（{dayRange}）
  const phaseRegex = /##\s*📌\s*阶段\s*(\d+)[：:]\s*(.+?)[（(](.+?)[）)]/g;
  let match: RegExpExecArray | null;

  while ((match = phaseRegex.exec(buffer)) !== null) {
    const index = parseInt(match[1]);
    const name = match[2].trim();
    const dayRange = match[3].trim();

    // If we've moved to a new phase, flush the previous one
    if (index > currentPhaseIndex) {
      flushCurrentPhase();
      currentPhaseIndex = index;
    }

    // Extract description (the line after > )
    const afterPhaseHeader = buffer.slice(match.index + match[0].length);
    const descMatch = afterPhaseHeader.match(/>\s*(.+?)(?:\n|$)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Store current phase info for lesson parsing
    (parsePhases as any)._currentPhaseData = {
      index,
      name,
      dayRange,
      description,
    };
  }

  // Parse lessons for current phase
  if ((parsePhases as any)._currentPhaseData) {
    parseLessons(buffer);
  }
}

function parseLessons(text: string): void {
  const phaseData = (parsePhases as any)._currentPhaseData;
  if (!phaseData) return;

  // Find the section after this phase header
  const phaseHeaderRegex = new RegExp(
    `##\\s*📌\\s*阶段\\s*${phaseData.index}[：:]\\s*${escapeRegex(phaseData.name)}[（(]${escapeRegex(phaseData.dayRange)}[）)]`
  );
  const phaseStartMatch = text.match(phaseHeaderRegex);
  if (!phaseStartMatch) return;

  const afterPhase = text.slice((phaseStartMatch.index ?? 0) + phaseStartMatch[0].length);

  // Find where the next phase starts (or end of plan section)
  const nextPhaseMatch = afterPhase.match(/##\s*📌\s*阶段\s*\d+/);
  const sectionEnd = nextPhaseMatch ? nextPhaseMatch.index : afterPhase.length;
  const phaseSection = afterPhase.slice(0, sectionEnd);

  // Parse lessons: - 📝 {title}（{duration}）
  const lessonRegex = /-\s*📝\s*(.+?)[（(](.+?)[）)]/g;
  let lessonMatch: RegExpExecArray | null;

  while ((lessonMatch = lessonRegex.exec(phaseSection)) !== null) {
    eventBus.emit(AppEvents.PLAN_PREVIEW_LESSON, {
      title: lessonMatch[1].trim(),
      duration: lessonMatch[2].trim(),
    });
  }

  // Emit phase event (with description)
  eventBus.emit(AppEvents.PLAN_PREVIEW_PHASE, {
    index: phaseData.index,
    name: phaseData.name,
    dayRange: phaseData.dayRange,
    description: phaseData.description,
    lessons: [],
  });
}

function flushCurrentPhase(): void {
  // Reset current phase tracking
  (parsePhases as any)._currentPhaseData = null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
