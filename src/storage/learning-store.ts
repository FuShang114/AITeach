/**
 * 学习数据存储
 * 扩展 pi-web-ui 的存储系统，添加学习相关的数据持久化
 */

import { eventBus, AppEvents } from '../utils/event-bus';

// 学习路径数据结构
export interface LearningPath {
  id: string;
  subject: string;
  goal: string;
  currentLevel: number;
  phases: LearningPhase[];
  createdAt: number;
  updatedAt: number;
}

export interface LearningPhase {
  name: string;
  description: string;
  milestones: string[];
  dailyPlan: string;
  estimatedDays: number;
}

// 学习进度数据结构
export interface LearningProgress {
  subject: string;
  currentLevel: number;
  totalExercises: number;
  completedExercises: number;
  correctAnswers: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  flashcardCount: number;
  masteredFlashcards: number;
  lastStudyDate: number;
  streakDays: number;
}

// 学习记录
export interface LearningRecord {
  id: string;
  type: 'exercise' | 'quiz' | 'flashcard_review' | 'level_evaluation';
  subject: string;
  topic: string;
  score?: number;
  details: string;
  timestamp: number;
}

// 计划数据结构（对照原型）
export interface LearningPlan {
  id: string;
  name: string;
  subject: string;
  icon: string;
  color: string;
  bg: string;
  from: number;      // 起始水平 (1-10)
  to: number;        // 目标水平 (1-10)
  progress: number;  // 总进度百分比 (0-100)
  days: number;      // 预计天数
  status: 'active' | 'paused' | 'archived';
  phases: LearningPlanPhase[];
  lessons: LearningLesson[];
  createdAt: number;
  updatedAt: number;
}

export interface LearningPlanPhase {
  name: string;
  done: boolean;
  pct: number;       // 阶段进度百分比
  current?: boolean;
  locked?: boolean;
}

export interface LearningLesson {
  id: string;
  title: string;
  icon: string;
  duration: string;
  done: boolean;
  current?: boolean;
  locked?: boolean;
  points?: string[];
  summary?: string;
  script?: TeachingScriptStep[];
}

export interface TeachingScriptStep {
  type: 'guide' | 'tool';
  text?: string;
  tool?: string;
  params?: any;
  guide?: string;
}

// 用户统计
export interface UserStats {
  xp: number;
  streak: number;
  accuracy: number;
  totalExercises: number;
  totalQuizzes: number;
  totalFlashcards: number;
  lastStudyDate: number;
}

// 存储键名常量
const STORAGE_KEYS = {
  LEARNING_PATHS: 'learning_paths',
  LEARNING_PROGRESS: 'learning_progress',
  LEARNING_RECORDS: 'learning_records',
  CURRENT_SUBJECT: 'current_subject',
} as const;

/**
 * 学习数据存储管理类
 * 使用 localStorage 进行持久化（浏览器端轻量存储）
 */
export class LearningStore {
  private static instance: LearningStore;

  private constructor() {}

  static getInstance(): LearningStore {
    if (!LearningStore.instance) {
      LearningStore.instance = new LearningStore();
    }
    return LearningStore.instance;
  }

  // ===== 学习路径管理 =====

  async saveLearningPath(path: LearningPath): Promise<void> {
    const paths = await this.getLearningPaths();
    const existingIndex = paths.findIndex((p) => p.id === path.id);
    if (existingIndex >= 0) {
      paths[existingIndex] = { ...path, updatedAt: Date.now() };
    } else {
      paths.push(path);
    }
    localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(paths));
  }

  async getLearningPaths(): Promise<LearningPath[]> {
    const data = localStorage.getItem(STORAGE_KEYS.LEARNING_PATHS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      console.warn(`[LearningStore] Failed to parse ${STORAGE_KEYS.LEARNING_PATHS}, resetting to default`);
      return [];
    }
  }

  async getLearningPath(id: string): Promise<LearningPath | undefined> {
    const paths = await this.getLearningPaths();
    return paths.find((p) => p.id === id);
  }

  async deleteLearningPath(id: string): Promise<void> {
    const paths = await this.getLearningPaths();
    const filtered = paths.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.LEARNING_PATHS, JSON.stringify(filtered));
  }

  // ===== 学习进度管理 =====

  async getProgress(subject: string): Promise<LearningProgress | undefined> {
    const allProgress = await this.getAllProgress();
    return allProgress[subject];
  }

  async getAllProgress(): Promise<Record<string, LearningProgress>> {
    const data = localStorage.getItem(STORAGE_KEYS.LEARNING_PROGRESS);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      console.warn(`[LearningStore] Failed to parse ${STORAGE_KEYS.LEARNING_PROGRESS}, resetting to default`);
      return {};
    }
  }

  async updateProgress(subject: string, updates: Partial<LearningProgress>): Promise<void> {
    const allProgress = await this.getAllProgress();
    const existing = allProgress[subject] || {
      subject,
      currentLevel: 1,
      totalExercises: 0,
      completedExercises: 0,
      correctAnswers: 0,
      totalQuizzes: 0,
      completedQuizzes: 0,
      averageScore: 0,
      flashcardCount: 0,
      masteredFlashcards: 0,
      lastStudyDate: 0,
      streakDays: 0,
    };
    allProgress[subject] = { ...existing, ...updates, lastStudyDate: Date.now() };
    localStorage.setItem(STORAGE_KEYS.LEARNING_PROGRESS, JSON.stringify(allProgress));
  }

  // ===== 学习记录管理 =====

  async addRecord(record: LearningRecord): Promise<void> {
    const records = await this.getRecords();
    records.unshift(record);
    // 最多保留 500 条记录
    if (records.length > 500) {
      records.length = 500;
    }
    localStorage.setItem(STORAGE_KEYS.LEARNING_RECORDS, JSON.stringify(records));
  }

  async getRecords(subject?: string): Promise<LearningRecord[]> {
    const data = localStorage.getItem(STORAGE_KEYS.LEARNING_RECORDS);
    if (!data) return [];
    let records: LearningRecord[];
    try {
      records = JSON.parse(data);
    } catch {
      console.warn(`[LearningStore] Failed to parse ${STORAGE_KEYS.LEARNING_RECORDS}, resetting to default`);
      records = [];
    }
    if (subject) {
      return records.filter((r) => r.subject === subject);
    }
    return records;
  }

  async getRecentRecords(limit: number = 20): Promise<LearningRecord[]> {
    const records = await this.getRecords();
    return records.slice(0, limit);
  }

  // ===== 当前学科 =====

  async setCurrentSubject(subject: string): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SUBJECT, subject);
  }

  async getCurrentSubject(): Promise<string | null> {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SUBJECT);
  }

  // ===== 统计数据 =====

  async getOverallStats(): Promise<{
    totalSubjects: number;
    totalStudyDays: number;
    totalExercises: number;
    totalQuizzes: number;
    averageScore: number;
  }> {
    const allProgress = await this.getAllProgress();
    const subjects = Object.values(allProgress);

    return {
      totalSubjects: subjects.length,
      totalStudyDays: subjects.filter((p) => p.lastStudyDate > 0).length,
      totalExercises: subjects.reduce((sum, p) => sum + p.completedExercises, 0),
      totalQuizzes: subjects.reduce((sum, p) => sum + p.completedQuizzes, 0),
      averageScore:
        subjects.length > 0
          ? Math.round(
              subjects.reduce((sum, p) => sum + p.averageScore, 0) / subjects.length
            )
          : 0,
    };
  }

  // ===== 计划管理（新增） =====

  async savePlan(plan: LearningPlan): Promise<void> {
    const plans = await this.getPlans();
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = { ...plan, updatedAt: Date.now() };
    } else {
      plans.push(plan);
    }
    localStorage.setItem('learning_plans', JSON.stringify(plans));
    // 触发事件
    if (idx >= 0) {
      eventBus.emit(AppEvents.PLAN_UPDATED, { plan });
    } else {
      eventBus.emit(AppEvents.PLAN_CREATED, { plan });
    }
  }

  async getPlans(): Promise<LearningPlan[]> {
    const data = localStorage.getItem('learning_plans');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      console.warn('[LearningStore] Failed to parse learning_plans, resetting to default');
      return [];
    }
  }

  async getPlan(id: string): Promise<LearningPlan | undefined> {
    const plans = await this.getPlans();
    return plans.find(p => p.id === id);
  }

  async deletePlan(id: string): Promise<void> {
    const plans = await this.getPlans();
    localStorage.setItem('learning_plans', JSON.stringify(plans.filter(p => p.id !== id)));
    eventBus.emit(AppEvents.PLAN_DELETED, { planId: id });
  }

  async getCurrentPlanId(): Promise<string | null> {
    return localStorage.getItem('current_plan_id');
  }

  async setCurrentPlanId(id: string): Promise<void> {
    localStorage.setItem('current_plan_id', id);
    eventBus.emit(AppEvents.PLAN_SWITCHED, { planId: id });
  }

  // ===== 用户统计（新增） =====

  async getUserStats(): Promise<UserStats> {
    const data = localStorage.getItem('user_stats');
    if (!data) return {
      xp: 0,
      streak: 0,
      accuracy: 0,
      totalExercises: 0,
      totalQuizzes: 0,
      totalFlashcards: 0,
      lastStudyDate: 0,
    };
    try {
      return JSON.parse(data);
    } catch {
      console.warn('[LearningStore] Failed to parse user_stats, resetting to default');
      return {
        xp: 0,
        streak: 0,
        accuracy: 0,
        totalExercises: 0,
        totalQuizzes: 0,
        totalFlashcards: 0,
        lastStudyDate: 0,
      };
    }
  }

  async updateUserStats(updates: Partial<UserStats>): Promise<void> {
    const stats = await this.getUserStats();
    const updated = { ...stats, ...updates };
    localStorage.setItem('user_stats', JSON.stringify(updated));
  }

  async addXP(amount: number): Promise<void> {
    const stats = await this.getUserStats();
    stats.xp += amount;
    localStorage.setItem('user_stats', JSON.stringify(stats));
  }
}

// 导出单例实例
export const learningStore = LearningStore.getInstance();
