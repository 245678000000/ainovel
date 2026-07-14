# 测试基础设施说明书 (TEST_INFRA.md)

本文档规定了 AI 小说写作辅助系统的测试策略、Mock 方法与测试设计规约。

## 一、 测试框架配置与依赖体系

本项目的测试基础设施主要基于以下组件构建：
- **测试执行器 (Test Runner)**：`Vitest`，用于快速执行单元测试与组件测试，具有原生 ESM 支持和极快的启动速度。
- **渲染库 (Rendering Library)**：`React Testing Library (RTL)`，用于模拟真实用户交互进行组件级别的渲染与行为测试。
- **环境模拟 (DOM Simulation)**：`jsdom`，在 Node.js 环境中模拟浏览器 DOM API。
- **匹配器增强 (Matchers)**：`@testing-library/jest-dom`，提供诸如 `toBeInTheDocument`、`toHaveClass` 等高级断言。

相关配置文件为 `vitest.config.ts`，测试初始化脚本为 `src/test/setup.ts`。

---

## 二、 Supabase Client 链式 API 模拟设计

由于 `@/integrations/supabase/client` 的调用具有流式、链式的 Fluent API 特征（如 `supabase.from('table').select('...').eq('id', 1).single()`），直接对每个调用进行零散的 jest.fn Mock 会导致测试代码冗长难维护。

我们的 Mock 设计采用**统一的链式代理对象**（Fluent Mock API）：
- 模拟所有常用的 Supabase 链式方法：`select`、`eq`、`order`、`single`、`insert`、`update`。
- 每个方法返回 Mock 代理对象本身（即 `this`），以支持任意深度的链式调用。
- 提供 `__setMockData` 和 `__setMockError` 等控制接口，允许在具体测试用例中灵活改写返回值。
- 最终的执行方法（如 `single` 或在链结束时）解析为返回 `{ data, error }` 的 Promise。

具体实现在 `src/test/mocks/supabase.ts` 中，并在测试文件中通过 `vi.mock` 进行全局劫持。

---

## 三、 LocalStorage 持久化与防抖的测试方法

对于带有防抖（Debounce）自动保存功能的表单：
- **LocalStorage 模拟**：在测试执行前使用 Vitest 的全局 Mock 或直接代理 `window.localStorage`。
- **防抖时间控制**：使用 Vitest 的虚拟时间机制（`vi.useFakeTimers()`）。在触发修改事件后，通过 `vi.advanceTimersByTime(400)` 推进时间，以验证防抖函数的触发与 LocalStorage 写入。
- **数据一致性验证**：在时间推进后，断言 `localStorage.getItem` 中的数据与表单最新状态一致。

---

## 四、 流式生成 SSE 分包断裂解析测试方法

流式 SSE（Server-Sent Events）在真实网络环境下，可能会遇到网络切包（TCP 分包或流式传输截断），导致一个 JSON 字符串被拆分在两个或多个不同的 SSE chunk 中。

测试流式解析的鲁棒性（Buffer 倒退拼接）方法：
- **切包场景模拟**：构造一组不完整的 SSE chunk。例如，第一包输出 `data: {"text": "Hello`，第二包输出 ` world"}`。
- **状态维持测试**：在解析第一包时，由于 JSON 不完整，解析器应当将当前 Buffer 暂存，且不触发内容变更；在收到第二包时，将旧 Buffer 与新内容拼接，完成 JSON 反序列化并成功回调输出整个字符串。
- **验证机制**：通过 Mock 回调函数（如 `onDelta`）来捕捉每次有效输出，断言其是否在拼接完整后正确触发。

---

## 五、 移动端视口宽度测试方法

为了验证响应式布局（如章节列表在移动端下的显示/隐藏行为）：
- **模拟视口宽度**：修改 `window.innerWidth` 的值。
- **触发 Resize 事件**：在修改 `window.innerWidth` 后，必须手动分发 `resize` 事件以更新组件内部监听的状态：
  ```typescript
  window.innerWidth = 500;
  window.dispatchEvent(new Event('resize'));
  ```
- **样式类断言**：使用 RTL 渲染组件，并断言特定元素是否包含特定的 CSS 响应式类（例如 `hidden md:block`），以及它们的可见状态。

---

## 六、 已知业务逻辑缺陷与安全隐患 (Known Issues)

本文档在此处记录在测试及评审中发现但因当前 Track 限制（严禁修改业务代码）而未修复的业务逻辑缺陷。这些问题作为技术债留档，供后续 Milestone 重构。

### 1. 流式生成 `stream-novel.ts` 损坏 JSON 回滚死锁 Bug (Deadlock)
- **逻辑原理**：
  在 `streamNovelGeneration` 中，利用 `while ((newlineIndex = buffer.indexOf("\n")) !== -1)` 循环按行切包处理流式 SSE 数据。当遇到网络物理换行但 JSON 被截断的非完整数据包时，会触发 `JSON.parse` 异常，进而走入 `catch` 分支。在 `catch` 内，代码采用如下回滚机制：
  ```typescript
  catch {
    // Partial JSON, put back
    buffer = line + "\n" + buffer;
    break;
  }
  ```
  该逻辑本意是将读取出的当前损坏行（不含换行符）拼接换行符后重新插回 `buffer` 头部，并跳出当前内层解析循环，等待下一次 `read()` 读取更多包来完成拼接。
  然而，由于重新拼回的 `line + "\n"` 中依然包含换行符 `\n`，而在下一次循环中，`buffer.indexOf("\n")` 会在此拼回的换行符处再次截断，从而重新切出相同且已经损坏的 `line` 进行解析。这导致程序不断在 `catch -> buffer = line + "\n" + buffer -> break` 这一路径上循环往复，陷入无限死锁，无法消费后续到达的任何流数据。
- **复现方式**：
  1. 模拟上游流数据发送一个块（Chunk），其内容在一个换行符处截断（例如在 SSE 数据中有意植入物理换行字符 `\n`，但此换行并非出于 SSE 规约中的行结束，而是 JSON 内容中的不完整数据段，如 `data: {"choices": [{"delta": {"content": "部分内容\n`，其后本该有接续的 `再次拼接内容"}}]}\n`）。
  2. 触发流式读取。在解析到该 Chunk 时，会因为 `\n` 而将其切成一包，从而在 `JSON.parse` 时抛出异常被 `catch` 捕获。
  3. 执行 `buffer = line + "\n" + buffer; break;` 拼回 buffer。
  4. 当后续包含 `再次拼接内容"}}]}\n` 的新 Chunk 到达并被 `decoder.decode` 追加到 `buffer` 后，`buffer.indexOf("\n")` 会再次匹配到刚才拼回的那个 `\n`，并重新切分出原本出错的那个损坏 JSON行进行解析。
  5. 再次抛出异常，进入死循环/死锁，无法合并后面的正确数据。

### 2. 章节生成 `NovelView.tsx` 并发点击与竞态数据冲突缺陷 (Race Condition)
- **逻辑原理**：
  在 `NovelView.tsx` 页面组件中，当点击生成按钮后会执行 `handleContinue`（或 `handleGenerate` / `handleRewrite` 等）。在开始生成时设置 `setIsGenerating(true)` 禁用按钮。
  在流式生成完成（`onDone` 回调触发）时，代码执行了如下逻辑：
  ```typescript
  onDone: async () => {
    requestAbortControllerRef.current = null;
    setIsGenerating(false); // 提前解禁按钮
    
    // 开始异步操作插入 Supabase
    const { data, error } = await supabase.from("chapters").insert({...});
    ...
  }
  ```
  在这里，`setIsGenerating(false)` 被同步调用，早于紧随其后的 `supabase.from("chapters").insert` 这一异步网络数据库写入操作的完成。这意味着当按钮被解禁、界面恢复可点击状态时，新生成的章节其实还未成功写入 Supabase，对应的章节数量/编号（如 `chapters.length + 1`）也未在本地状态和远程数据库中更新。
- **复现方式**：
  1. 在网络连接较慢或数据库写入有明显延迟的环境下，点击“继续生成”生成章节。
  2. 待流式传输完成，界面按钮在 `onDone` 刚开始执行时即解禁变亮，而此时底部的 `toast("章节已保存")` 尚未弹出。
  3. 在插入操作的 Promise 决议之前，用户快速再次点击“继续生成”或相关触发操作。
  4. 此时由于之前的写入尚未完成，本地 `chapters` 状态尚未更新，计算的 `nextNum = chapters.length + 1` 将会和前一次生成时计算的一模一样。
  5. 这将导致并发执行的第二次操作插入具有相同 `chapter_number` 编号的章节记录，触发 Supabase 数据库主键/唯一约束冲突，或者在极短时间内写入两条相同章节编号的多余脏数据，引起界面状态与后端存储的竞态冲突。
