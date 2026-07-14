# Project: 小说创作设定助手重构与升级项目

## Architecture
本系统是一个基于 React + TypeScript + Vite 构建的单页应用（SPA），数据持久化与业务处理依托 Supabase (包含 Database 与 Edge Functions)。

```
                  ┌──────────────────────┐
                  │      React App       │
                  │ (Vite + TS + Tailwind)│
                  └──────────┬───────────┘
                             │ (SQL / Auth / Functions)
                             ▼
                  ┌──────────────────────┐
                  │      Supabase        │
                  │ (Postgres + Edge Fn) │
                  └──────────────────────┘
```

### 核心组成部分
1.  **大表单设定系统** (`NovelSettingsForm.tsx`): 收集题材、主角、世界观、剧情大纲、写作风格等参数，保存于 LocalStorage，并为 AI 提示词拼接提供输入。
2.  **阅读与创作系统** (`NovelView.tsx`): 展示已生成的章节列表及当前章，底部为 AI 创作操作区，包含“续写当前章”、“重写当前章”和“生成下一章”。
3.  **模型与供应商配置管理**: 从 `profiles` 和 `model_providers` 中读取 LLM 配置，供流式请求使用。

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | M1: 测试基础设施建设与 Codebase 探索 | 编写集成测试 Mock 及测试基建，输出 TEST_INFRA.md | 无 | DONE (Conv: fd324e17, auditor: 704b72bc, worker: 6ed26b46) |
| 2 | M2: 核心表单拆分与性能重构 | 将 NovelSettingsForm 拆分为 5 个子组件，提高渲染性能 | M1 | DONE (Conv: 1cfdf4f7) |
| 3 | M3: 移动端章节切换与阅读体验优化 | 修复移动端 NovelView 切换缺陷，引入 Sheet 抽屉组件 | M1 | DONE (Conv: b978645a) |
| 4 | M4: AI 创作交互逻辑理顺与后端续写扩展 | 边缘函数扩展模式，前端区分续写和生成下一章，实现流式防重 | M1, M2 | DONE (Conv: 78194c61) |
| 5 | M5: 视觉升级与动画体验提升 | 背景渐变微动画、磨砂玻璃拟态、过渡过渡，修复 index.css 警告 | M1 | DONE (Conv: a33b2b63) |
| 6 | M6: 整体回归、对抗验证与 Victory Audit | Challenger 极限验证，Forensic Auditor 合规核查，最终上线交付 | M2, M3, M4, M5 | IN_PROGRESS |

---

## Interface Contracts

### 1. 表单设定数据结构 (`NovelSettings` - `src/components/novel-settings/types.ts`)
大表单数据需要符合 `NovelSettings` 规范。子组件间通过 `NovelSettings` 的增量修改进行通信。
```typescript
export interface NovelSettings {
  genres: string[];
  oneLinePitch: string;
  mainCharacter: {
    name: string;
    gender: string;
    age: string;
    personality: string;
  };
  worldSetting: string;
  worldDetails: {
    type: string;
    powerSystem: string;
    geography: string;
  };
  conflict: string;
  synopsis: string;
  style: string;
  chapterWords: number;
  totalWords: number;
  nsfw: boolean;
  systemNovel: boolean;
  harem: boolean;
}
```

### 2. 边缘函数调用契约 (`generate-novel`)
- **请求地址**: `/functions/v1/generate-novel`
- **请求方式**: `POST`
- **请求体格式**:
```json
{
  "mode": "continue" | "rewrite" | "continue_chapter" | "outline" | "characters",
  "settings": { ...NovelSettings },
  "model": "deepseek" | "claude" | "openai" | ...,
  "apiKey": "sk-...",
  "apiBaseUrl": "https://...",
  "actualModel": "...",
  "temperature": 0.7,
  "novelId": "uuid-of-novel",
  "rewriteContent": "...",
  "chapterNumber": 1
}
```
- **模式定义与职责**:
  1.  `continue`: **生成下一章**。由后端计算 `chapterNumber = chapters.length + 1` 并给出新章节的流式标题与正文。
  2.  `continue_chapter`: **续写当前章** (新增)。基于当前章节已写内容在末尾续写后续正文，流式输出续写正文。
  3.  `rewrite`: **重写当前章**。对已传入的 `rewriteContent` 进行润色和重构。
  4.  `outline`: 生成大纲。
  5.  `characters`: 生成人物卡。

---

## Code Layout
- `src/components/novel-settings/` - 重构后拆分的表单子组件目录
- `src/pages/` - 主页、库页面和阅读器页面
- `src/lib/` - 工具类与流式连接层
- `src/test/` - 集成测试、Mock 数据库及单元测试定义
- `supabase/functions/` - 边缘函数，包含 `generate-novel`

---

## Code Layout Compliance
1. 严禁在此目录外直接写入代码或任何测试代码。
2. 每一个重构后的组件必须有对应的单元/集成测试。
3. 构建产物不能有任何 CSS 或 JS 警告。
