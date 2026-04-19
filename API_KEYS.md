# AI 智能教学平台 - API Key 配置

## DeepSeek

- **Provider**: deepseek
- **API Key**: `sk-daf85e283f4442268851ae10f13263d1`
- **默认模型**: deepseek-chat
- **API Base URL**: `https://api.deepseek.com`

## 使用方式

在 `src/main.ts` 中通过 `ProviderKeysStore` 存储，或直接在 `createTeachingAgent()` 中传入 `getApiKey` 回调。

## 注意事项

- 请勿将此文件提交到公开仓库
- 建议添加到 `.gitignore`
