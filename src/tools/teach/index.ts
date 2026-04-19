/**
 * 教具系统入口
 * 初始化 window.__teachTools 并导入所有教具组件（注册副作用）
 */

// 初始化 window.__teachTools
if (!(window as any).__teachTools) {
  (window as any).__teachTools = {};
}

// 导入所有教具（import 副作用：自动执行 registerTool 注册）
import './tools/code-stepper';
import './tools/memory-visualizer';
import './tools/data-structure';
import './tools/flowchart';
import './tools/compare';
import './tools/code-editor';
import './tools/error-demo';
import './tools/step-breakdown';

// 导出核心 API
export { registerTool, renderTool, wrapTool, escHTML, getToolState, setToolState } from './tool-registry';
