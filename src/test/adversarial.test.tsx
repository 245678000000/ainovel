import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { streamNovelGeneration } from "../lib/stream-novel";
import { NovelSettingsForm } from "../components/novel-settings/NovelSettingsForm";
import NovelView from "../pages/NovelView";
import { supabase, setMockDataForTable, clearSupabaseMocks } from "./mocks/supabase";
import React from "react";

// Mock React Router
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "novel-123" }),
  useNavigate: () => vi.fn(),
}));

// Mock Supabase 客户端，防止真实的 Supabase SDK 发起网络请求
vi.mock("@/integrations/supabase/client", async () => {
  const { supabase } = await import("./mocks/supabase");
  return { supabase };
});

// Mock Auth
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-456" },
    session: { access_token: "fake-token" },
  }),
}));

// Mock ReactMarkdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("Adversarial Testing - 对抗性与异常边界测试", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.spyOn(global, "fetch");
    localStorage.clear();
    mockToast.mockClear();

    // 默认的 Supabase 数据预设，供 NovelView 使用
    clearSupabaseMocks();
    setMockDataForTable("profiles", { default_llm_model: "deepseek" });
    setMockDataForTable("model_providers", [
      {
        provider_type: "deepseek",
        api_key: "fake-api-key",
        is_default: true,
        name: "DeepSeek",
        default_model: "deepseek-chat",
        enabled: true,
        api_base_url: null,
      },
    ]);
    setMockDataForTable("novels", {
      id: "novel-123",
      title: "测试网络小说",
      genre: ["仙侠"],
      outline: "主线故事大纲",
      word_count: 5000,
      settings_json: {},
    });
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Bug 1: stream-novel.ts 流截断数据污染死锁测试 ====================
  it("流式截断死锁测试：当流数据包中包含有物理换行但 JSON 损坏的恶意切包，且其后粘连正常数据时，程序是否会发生粘连污染并导致无法继续解析后续数据", async () => {
    // 构造极端的 SSE chunk 序列：
    // chunk 1 在换行符处截断，并且该换行符不是正规的 SSE 结束，而是内容中损坏的分包
    // 它和后续的正常数据 `正常三` 同时在第一包到达。
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "正常一"}}]}\n' +
      'data: {"choices": [{"delta": {"content": "第二包残缺\n' + // 这里有个物理换行符，且该行 JSON 损坏
      'data: {"choices": [{"delta": {"content": "正常三"}}]}\n', // 跟着一行正常数据
      '"}}]}\n' + // chunk 2 用来尝试修复 chunk 1 中“第二包残缺”的 JSON 结构
      'data: {"choices": [{"delta": {"content": "正常四"}}]}\n' +
      'data: [DONE]\n'
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        if (chunkIndex < mockChunks.length) {
          const value = new TextEncoder().encode(mockChunks[chunkIndex]);
          chunkIndex++;
          return Promise.resolve({ done: false, value });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    const mockResponse = {
      ok: true,
      status: 200,
      body: {
        getReader: () => mockReader,
      },
    };

    mockFetch.mockResolvedValue(mockResponse);

    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamNovelGeneration({
      params: {
        mode: "continue",
        settings: {},
        model: "gpt-4",
        apiKey: "test-api-key",
      },
      onDelta,
      onDone,
      onError,
      accessToken: "test-token",
    });

    // 理论上，如果能妥善处理切包：
    // - "正常一" 应当被解析输出。
    // - "第二包残缺" 应当与后面的 `"}}]}"` 拼合，输出 `"第二包残缺"`。
    // - "正常三" 和 "正常四" 也应该被正确解析输出。
    // 然而，因为 `buffer = line + buffer;` 导致了粘连污染（"第二包残缺" 与 "正常三" 粘连，拼合后变成无法解析的畸形 JSON）。
    // 所以，"正常三" 和 "正常四" 将因粘连污染而在 JSON.parse 时不断报错，无法被解析出来。
    
    // 我们在此断言，目前的实现会导致数据丢失，即 "正常三" 无法被正确消费输出。
    // 正常期望应当是包含 "正常三" 和 "正常四" 的调用，但实际实现由于粘连污染导致失败：
    const receivedDeltas = onDelta.mock.calls.map(call => call[0]);
    
    // 修改为正向断言，期待流式生成已修复，能正确解析并包含正常三和正常四
    expect(receivedDeltas).toContain("正常三");
    expect(receivedDeltas).toContain("正常四");
  });

  // ==================== Bug 2: NovelSettingsForm.tsx 大表单极限注入崩溃测试 ====================
  it("大表单极限注入测试：当导入的设定文件中，genres 顶级属性为非数组类型（如字符串、对象、数字、null 等）时，验证清洗兜底且不崩溃", async () => {
    const maliciousCases = [
      "仙侠", // 字符串
      { name: "仙侠" }, // 对象
      12345, // 数字
      null, // null
    ];

    for (const badGenre of maliciousCases) {
      const { container, unmount } = render(
        <NovelSettingsForm
          modelName="GPT-4"
          isGenerating={false}
          onGenerate={vi.fn()}
          onStop={vi.fn()}
        />
      );

      const maliciousImportData = {
        oneLinePitch: "恶意导入注入测试",
        genres: badGenre,
        mainCharacter: {
          name: "王五",
          gender: "其他",
          age: "30",
          personality: "神秘",
        },
      };

      const file = new File([JSON.stringify(maliciousImportData)], "malicious_settings.json", {
        type: "application/json",
      });

      if (typeof file.text !== "function") {
        file.text = () => Promise.resolve(JSON.stringify(maliciousImportData));
      }

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      fireEvent.change(fileInput, {
        target: { files: [file] },
      });

      // 异步等待导入成功
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "导入成功" })
        );
      });

      const promptBtn = screen.getByText("生成小说提示词");
      
      // 验证点击不崩溃
      expect(() => {
        fireEvent.click(promptBtn);
      }).not.toThrow();

      unmount();
      mockToast.mockClear();
    }
  });

  it("大表单极限注入测试：从 LocalStorage 恢复时，若 genres 为非数组类型（如字符串、对象、数字、null 等），验证能正确清洗兜底且点击生成提示词不崩溃", async () => {
    const maliciousCases = [
      "仙侠", // 字符串
      { name: "仙侠" }, // 对象
      12345, // 数字
      null, // null
    ];

    for (const badGenre of maliciousCases) {
      localStorage.clear();
      // 写入恶意数据到 localStorage
      const badData = {
        oneLinePitch: "LocalStorage 恶意注入测试",
        genres: badGenre,
        mainCharacter: {
          name: "李四",
          gender: "女",
          age: "18",
          personality: "傲娇",
        },
      };
      localStorage.setItem("novel_settings_v1", JSON.stringify(badData));

      // 渲染组件
      const { container, unmount } = render(
        <NovelSettingsForm
          modelName="GPT-4"
          isGenerating={false}
          onGenerate={vi.fn()}
          onStop={vi.fn()}
        />
      );

      const promptBtn = screen.getByText("生成小说提示词");
      
      // 点击不抛出任何错误，表明 buildPrompt 的 join 等数组操作不会抛出 TypeError
      expect(() => {
        fireEvent.click(promptBtn);
      }).not.toThrow();

      // 卸载组件，防止污染下一个循环的 render 实例
      unmount();
    }
  });

  // ==================== 异常流连接断开、网络异常与重连测试 ====================
  it("网络异常捕捉测试：当流式生成遇到网络异常抛错时，页面组件应妥善捕捉，防止 isGenerating 锁死", async () => {
    // 精细化 Mock fetch：仅在包含 generate-novel 时拦截抛出网络错误，其他 fetch 请求放行返回默认的成功响应
    mockFetch.mockImplementation((url: any) => {
      const urlStr = typeof url === "string" ? url : url?.url || "";
      if (urlStr.includes("/functions/v1/generate-novel")) {
        return Promise.reject(new Error("TypeError: Failed to fetch"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "test", title: "测试网络小说", content: "..." }),
      });
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    
    // 触发继续写作，这将发起 fetch，并在 streamNovelGeneration 内部捕获异常后回调 onError
    fireEvent.click(continueBtn);

    // 验证：即使网络瞬间断开并抛出异常，组件也必须妥善释放 isGenerating 锁
    // 页面上不应该继续残留“正在生成中...”字样
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "生成失败",
          variant: "destructive",
        })
      );
    });
  });
});
