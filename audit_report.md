# 最终审计交接报告 (audit_report.md)

## VERDICT: 【VICTORY REJECTED】

在针对 `ainovel` 交付物进行全量回归与合规审计后，由于**测试用例无法全部通过**以及**存在未解决的安全防崩溃隐患**，本次 Victory Audit 判定为**驳回 (REJECTED)**。

---

## 阻碍结项的具体漏洞缺陷清单

### 1. 测试用例未全部通过 (Vitest Suite Failures)
执行 `npx vitest run` 时，虽然大部分测试（包括 `NovelView.test.tsx` 中的 27 个测试用例）全部通过，但 `src/test/adversarial.test.tsx` 中的 3 个对抗性与异常边界测试用例均执行失败：
*   **流式截断死锁测试失败**：
    *   **失败原因**：业务代码 `src/lib/stream-novel.ts` 中确实已经修复了网络物理分包换行导致的死锁 Bug，能够正确接收并消费后续的正常分包 `"正常三"`。然而，测试文件 `adversarial.test.tsx` 中仍遗留了**逆向 Bug 证明断言**：`expect(receivedDeltas).not.toContain("正常三")`，这导致在 Bug 被修复后，该测试断言发生矛盾而报错失败。
*   **大表单极限注入测试失败**：
    *   **失败原因**：在测试用例中，触发文件导入的 `fireEvent.change(fileInput, ...)` 操作后，数据读取 `file.text()` 的 Promise 解析以及 React 状态更新是**异步执行**的。但测试代码紧接着在同步线程中直接调用了 `fireEvent.click(promptBtn)` 并断言其抛出异常，未能通过 `await waitFor(...)` 等待状态更新完成，导致 `toThrow(TypeError)` 无法捕获异常而失败。
*   **网络异常捕捉测试失败**：
    *   **失败原因**：测试代码在 `beforeEach` 中对全局 `fetch` 进行了 Spy 代理，并在测试中执行 `mockFetch.mockRejectedValue(...)` 模拟网络错误。但这导致在挂载 `NovelView` 组件时，Supabase 客户端加载小说详情的底层 API 请求也因 `fetch` 报错而失败，使页面直接渲染为 `"小说不存在"`，从而无法通过 `await screen.findAllByText("测试网络小说")` 的初始化节点校验。

### 2. 大表单 genres 顶级属性类型注入崩溃缺陷未修复 (Bug 2 真实存在)
*   **缺陷逻辑**：
    在 `src/components/novel-settings/NovelSettingsForm.tsx` 的 `handleImportChange`（导入配置）和 `useEffect`（初次挂载恢复 LocalStorage）中，代码对反序列化后的 `parsed` 对象直接使用解构合并：
    ```typescript
    setSettings((prev) => {
      // ... 仅对 sideCharacters, antagonists 等进行了 Array.isArray 过滤
      return {
        ...prev,
        ...parsed, // 直接覆盖合并
        ...
      };
    });
    ```
    对于核心属性 `genres`（类型声明应为 `NovelGenre[]` 数组），代码**完全缺失**了 `Array.isArray()` 的防御性类型验证和清洗过滤。
*   **安全隐患**：
    如果导入的 JSON 文件中 `genres` 顶级属性被恶意更改为非数组类型（如 `"genres": "仙侠"` 字符串），在数据合并后，`settings.genres` 将被污染为字符串。当用户点击页面中的“生成小说提示词”时，会执行 `buildPrompt`，并在内部调用 `s.genres.join("、")`。由于 JavaScript 中字符串没有 `join` 方法，系统将当场抛出 `TypeError: s.genres.join is not a function` 异常，导致整页白屏和组件崩溃。

---

## 详细审计细节与证据链

### Phase A — Timeline & Provenance Audit
*   **审计结果**：**PASS**
*   **历史与修改特征分析**：
    通过对项目文件修改痕迹进行分析，所有的 7 个拆分子组件目录均在 `src/components/novel-settings/` 目录下组织，且在 `PROJECT.md` 中有清晰的 Milestone 开发轨迹。无预先捏造的测试报告或欺骗性 attestation 日志文件，项目构建配置完好。

### Phase B — Integrity Check
*   **审计结果**：**FAIL**
*   **欺骗行为严查**：
    *   **无硬编码测试结果**：未发现通过在测试中写死期望输出或在业务代码中通过检测测试环境直接返回预定数据的作弊行为。
    *   **无 Facade 伪装实现**：所有的子组件拆分和 `NovelView` 页面逻辑、流式拼接与优雅保存都具备真实的 Supabase Fluent API 数据库交互和 SSE 协议处理。
    *   **缺陷未彻底修复**：针对大表单导入类型安全的过滤要求未达标，对非数组类型注入的防崩溃漏洞（Bug 2）没有在 `NovelSettingsForm.tsx` 中得到规范修复。

### Phase C — Independent Test Execution
*   **审计结果**：**FAIL**
*   **测试执行结果**：
    *   **执行命令**：`npx vitest run`
    *   **测试总览**：共计 51 个测试用例，通过 48 个，失败 3 个。
    *   **失败清单**：
        1.  `Adversarial Testing... > 流式截断死锁测试...` (AssertionError)
        2.  `Adversarial Testing... > 大表单极限注入测试...` (AssertionError)
        3.  `Adversarial Testing... > 网络异常捕捉测试...` (TestingLibraryElementError)
*   **打包构建审查**：
    *   `src/index.css` 已经彻底清除了 `@import` 指令，全量使用 Tailwind 原生的 `@layer` 层规范组织，彻底消除了过期的编译警告。

---

## 结论与行动建议
在当前代码库中，**流式死锁缺陷已得到解决**，**移动端章节切换与优雅中止保存交互也符合需求**，**打包警告已经清除**。
但必须修复以下两点才能通过审计结项：
1.  **修复业务代码缺陷**：在 `NovelSettingsForm.tsx` 的挂载和导入 JSON 逻辑中，增加对 `genres` 属性（以及 `writingStyle.tones`、`writingStyle.focusAreas` 等）的 `Array.isArray()` 类型校验和安全过滤（如果不是数组则重置为 `[]`），彻底防止 TypeError 白屏崩溃。
2.  **修正 adversarial.test.tsx 对抗测试用例**：
    *   将*流式截断死锁测试* 中的逆向断言修正为正向验证（例如，期望在 Bug 被修复后，流依然能正确输出 `"正常三"` 和 `"正常四"`）。
    *   在*大表单极限注入测试* 中加入 `await waitFor(...)`，等待异步状态更新完成后再进行点击断言。
    *   在*网络异常捕捉测试* 中，修正全局 `fetch` Mock 污染，或使 Supabase 小说加载的 Fetch 逻辑保持独立不报错，确保测试用例自身能够健壮执行。
