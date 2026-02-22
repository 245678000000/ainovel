

# 小说AI工坊 (AI Novel Studio) — 实现计划

## 概述
一个全栈AI小说生成Web应用，用户可以通过多种LLM模型（Grok、Claude、DeepSeek、Qwen）流式生成百万字中文小说。暗色主题，全中文界面，沉浸式阅读体验。

---

## 第一阶段：基础架构与页面框架（本次实现）

### 1. 项目基础设置
- 配置暗色主题为默认主题（黑色/紫色渐变风格）
- 设置全中文界面
- 添加 `react-markdown` 依赖用于Markdown渲染

### 2. Supabase Cloud 数据库
- **novels 表**：id, user_id, title, genre, outline, settings_json, created_at, updated_at, word_count
- **chapters 表**：id, novel_id, chapter_number, title, content, word_count, created_at
- **characters 表**：id, novel_id, name, card_json, created_at
- 配置 RLS 策略确保用户只能访问自己的数据

### 3. 用户认证
- Supabase Auth（邮箱注册/登录 + Google登录）
- 登录/注册页面，全中文界面

### 4. 导航与布局
- 侧边栏导航：首页、创作、我的书库、设置
- 响应式布局，移动端友好

### 5. 落地页 (/)
- 英雄区：大标题"用AI瞬间写出百万字小说" + 副标题
- 快速生成卡片：小说类型、主角名字、风格、一句话简介输入
- "立即开始创作"按钮
- 暗色沉浸式设计，玻璃态效果

### 6. 创作页 (/generate)
- 左侧详细设定表单（小说类型多选、主角设定、世界观、冲突主题、字数、风格、语气、NSFW开关、创意度滑块等）
- 右侧实时流式预览区域（占位，AI集成在后续阶段）
- 操作按钮：开始创作、生成大纲、生成人物卡

### 7. 我的书库页 (/library)
- 小说列表：标题、类型、更新时间、字数
- 搜索和类型筛选
- 导出为 TXT / Markdown

### 8. 小说阅读/编辑页 (/novel/:id)
- 章节列表
- 全屏阅读模式（暗色优雅排版）
- 操作按钮：继续写作、重写本章、生成下一章（占位）

### 9. 设置页 (/settings)
- 默认LLM模型选择（Grok / Claude 3.5 Sonnet / Qwen2.5 / DeepSeek）
- API密钥安全输入与存储
- NSFW全局开关

---

## 第二阶段：AI生成流程（后续实现）
- Edge Function 调用多个LLM API（根据用户选择的模型）
- 流式响应 + 打字机效果
- 多步生成：先大纲 → 再逐章生成
- 上下文维持（前文 + 人物卡 + 大纲）
- 人物卡自动生成

## 第三阶段：高级功能（后续实现）
- EPUB导出
- 章节重写与大纲修改
- 更精细的生成参数控制

