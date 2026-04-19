/**
 * CORS 代理工具函数
 * 为开发环境提供跨域请求代理配置
 */

/**
 * 获取 CORS 代理的基础 URL
 * 在开发环境中使用 Vite proxy 转发，生产环境使用独立代理服务
 */
export function getCorsProxyBaseUrl(): string {
  // 开发环境通过 Vite proxy 转发
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) {
    return '/cors-proxy';
  }
  // 生产环境使用环境变量配置的代理地址
  return (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PROXY_URL) || 'http://localhost:3001';
}

/**
 * 通过 CORS 代理构建完整的 API 请求 URL
 * @param targetUrl 目标 API 的完整 URL
 * @returns 代理 URL
 */
export function buildProxiedUrl(targetUrl: string): string {
  const proxyBase = getCorsProxyBaseUrl();
  return `${proxyBase}/${encodeURIComponent(targetUrl)}`;
}

/**
 * 检查 CORS 代理是否已启用
 */
export function isCorsProxyEnabled(): boolean {
  if (typeof import.meta !== "undefined" && (import.meta as any).env?.DEV) return true;
  return (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PROXY_ENABLED) !== 'false';
}
