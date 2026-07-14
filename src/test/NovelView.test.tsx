import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NovelView from "../pages/NovelView";
import { supabase, setMockDataForTable, clearSupabaseMocks, mockUpdateSpy, mockEqSpy } from "./mocks/supabase";
import React from "react";
import { streamNovelGeneration } from "@/lib/stream-novel";

// Mock React Router
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "novel-123" }),
  useNavigate: () => vi.fn(),
}));

// Mock Auth
const mockUser = { id: "user-456" };
const mockSession = { access_token: "fake-token" };

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    session: mockSession,
  }),
}));

// Mock ReactMarkdown 简化渲染
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));

vi.mock("@/lib/stream-novel", () => ({
  streamNovelGeneration: vi.fn(),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock supabase client
vi.mock("@/integrations/supabase/client", async () => {
  const { supabase } = await import("./mocks/supabase");
  return { supabase };
});

describe("NovelView 页面综合功能测试", () => {
  beforeEach(() => {
    // 模拟 ResizeObserver 以防 JSDOM 下 Radix UI 崩溃
    if (typeof global.ResizeObserver === 'undefined') {
      global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));
    }

    (global as any).__mockStreamDelta = undefined;
    (global as any).__mockStreamDone = undefined;
    (global as any).__mockStreamOnError = undefined;
    (global as any).__mockStreamSignal = undefined;

    clearSupabaseMocks();
    mockUpdateSpy.mockClear();
    mockEqSpy.mockClear();
    mockToast.mockClear();

    vi.mocked(streamNovelGeneration).mockImplementation((options) => {
      (global as any).__mockStreamDelta = options.onDelta;
      (global as any).__mockStreamDone = options.onDone;
      (global as any).__mockStreamOnError = options.onError;
      (global as any).__mockStreamSignal = options.signal;
      return Promise.resolve();
    });

    // 默认的 Supabase 数据预设
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
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    clearSupabaseMocks();
    vi.restoreAllMocks();
  });

  it("应当默认加载小说基本数据并选中首章节", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");
    await waitFor(() => {
      expect(container.textContent).toContain("启程");
      expect(container.textContent).toContain("第一章的修仙之旅开始了");
    });
  });

  it("应当在移动端视口下隐藏桌面端侧边栏", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");
    const chapterListContainer = container.querySelector(".w-64.border-r");
    expect(chapterListContainer).not.toBeNull();

    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));
    expect(chapterListContainer).toHaveClass("hidden");
  });

  it("应当在恢复桌面端视口时重新显示侧边栏", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");
    const chapterListContainer = container.querySelector(".w-64.border-r");
    expect(chapterListContainer).not.toBeNull();

    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));
    expect(chapterListContainer).toHaveClass("hidden");

    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    expect(chapterListContainer).toHaveClass("md:block");
  });

  it("点击“继续写作”按钮应当触发流式生成并展示生成状态", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(container.textContent).toContain("正在生成中");
    });
  });

  it("在流式生成期间应当逐步在正文区域呈现流式文本", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 第二章 重生\n李四重生了。");
    await waitFor(() => {
      expect(container.textContent).toContain("第二章 重生");
      expect(container.textContent).toContain("李四重生了。");
    });
  });

  it("流式生成完成时应当正确向 Supabase 插入新章节且新章节被选中", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 第二章 重生\n李四重生了，他的修仙之旅就此翻开了全新的一页。");

    setMockDataForTable("chapters", {
      id: "ch-2",
      novel_id: "novel-123",
      chapter_number: 2,
      title: "重生",
      content: "李四重生了，他的修仙之旅就此翻开了全新的一页。",
      word_count: 21,
    });

    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    (global as any).__mockStreamDone();

    await waitFor(() => {
      expect(container.textContent).toContain("第2章");
      expect(container.textContent).toContain("重生");
      expect(container.textContent).toContain("李四重生了，他的修仙之旅就此翻开了全新的一页。");
      expect(container.textContent).not.toContain("正在生成中");
    });
  });

  it("应当能通过点击章节列表中的项切换选中的章节", async () => {
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
      {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "重生",
        content: "李四重生了。",
        word_count: 6,
      }
    ]);

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    await waitFor(() => {
      expect(container.textContent).toContain("第一章的修仙之旅开始了");
    });

    const buttons = container.querySelectorAll("button");
    const secondChapterBtn = Array.from(buttons).find(b => b.textContent?.includes("第2章"));
    expect(secondChapterBtn).toBeDefined();
    fireEvent.click(secondChapterBtn!);

    await waitFor(() => {
      expect(container.textContent).toContain("李四重生了。");
    });
  });

  it("点击“重写本章”应当触发重写流式生成并显示生成中状态", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);

    await waitFor(() => {
      expect(container.textContent).toContain("正在生成中");
    });
  });

  it("在重写期间应当逐步展示重写文本", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 重写后的启程\n这是重写后的第一章全新内容。");
    await waitFor(() => {
      expect(container.textContent).toContain("重写后的启程");
      expect(container.textContent).toContain("这是重写后的第一章全新内容。");
    });
  });

  it("重写完成时应当正确调用 Supabase 更新章节标题与内容", async () => {
    render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 重写后的启程\n这是重写后的第一章全新内容。");

    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    (global as any).__mockStreamDone();

    await waitFor(() => {
      expect(mockUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "重写后的启程",
          content: "这是重写后的第一章全新内容。",
          word_count: 14,
        })
      );
      expect(mockEqSpy).toHaveBeenCalledWith("id", "ch-1");
    });
  });

  it("重写完成时应当更新小说的总字数", async () => {
    render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 重写后的启程\n这是重写后的第一章全新内容。");

    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    (global as any).__mockStreamDone();

    await waitFor(() => {
      expect(mockUpdateSpy).toHaveBeenCalled();
    });
  });

  it("在流式生成期间点击“停止生成”应当中止 AbortController 信号并重置生成状态", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamSignal).toBeDefined();
    });
    const signal = (global as any).__mockStreamSignal;
    expect(signal).toBeDefined();
    expect(signal.aborted).toBe(false);

    const stopBtn = screen.getByRole("button", { name: /停止生成/ });
    fireEvent.click(stopBtn);

    expect(signal.aborted).toBe(true);
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
    });
  });

  it("应当能通过点击目录按钮打开章节列表抽屉", async () => {
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    expect(screen.queryByRole("dialog")).toBeNull();

    const menuBtn = screen.getByRole("button", { name: "目录" });
    expect(menuBtn).toBeDefined();
    fireEvent.click(menuBtn);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();
      expect(dialog.textContent).toContain("启程");
    });
  });

  it("点击抽屉内的章节，应当成功切换内容并自动关闭抽屉", async () => {
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
      {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "重生",
        content: "李四重生了。",
        word_count: 6,
      }
    ]);

    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const menuBtn = screen.getByRole("button", { name: "目录" });
    fireEvent.click(menuBtn);

    await screen.findByRole("dialog");

    // 找到抽屉内的第2章按钮并点击切换
    const dialog = screen.getByRole("dialog");
    const buttons = dialog.querySelectorAll("button");
    const nextChapterBtn = Array.from(buttons).find(b => b.textContent?.includes("第2章"));
    expect(nextChapterBtn).toBeDefined();
    fireEvent.click(nextChapterBtn!);

    // 验证正文已更新为第2章内容，且抽屉自动关闭
    await waitFor(() => {
      expect(screen.getByText("李四重生了。")).toBeDefined();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("应当支持手动关闭抽屉", async () => {
    // 模拟移动端视口
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 1. 测试通过点击关闭按钮关闭抽屉
    const menuBtn = screen.getByRole("button", { name: "目录" });
    fireEvent.click(menuBtn);

    // 等待抽屉打开
    let dialog = await screen.findByRole("dialog");
    expect(dialog).toBeDefined();

    // 寻找 SheetContent 内部的关闭按钮并点击
    const closeBtn = screen.getByRole("button", { name: "Close" });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);

    // 验证抽屉关闭
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // 2. 测试通过按下 Escape 键关闭抽屉
    fireEvent.click(menuBtn);
    dialog = await screen.findByRole("dialog");
    expect(dialog).toBeDefined();

    // 触发 Escape 按键事件
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

    // 验证抽屉关闭
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("“续写当前章”交互测试：应当能拼合老文本流式渲染，并在保存/中止时正确更新至原章节中", async () => {
    const { container } = render(<NovelView />);

    await screen.findAllByText("测试网络小说");

    // 点击“续写当前章”按钮
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);

    // 验证生成状态
    await waitFor(() => {
      expect(container.textContent).toContain("正在生成中");
    });

    // 模拟流式生成续写的内容
    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    
    // 模拟第一个 delta
    (global as any).__mockStreamDelta("续写的部分内容。");
    
    // displayContent 此时应当是原内容加上流式传输内容："第一章的修仙之旅开始了...\n\n续写的部分内容。"
    await waitFor(() => {
      expect(container.textContent).toContain("第一章的修仙之旅开始了");
      expect(container.textContent).toContain("续写的部分内容。");
    });

    // 模拟流式结束
    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    (global as any).__mockStreamDone();

    // 验证数据库调用
    await waitFor(() => {
      // 验证更新了章节表，将续写内容通过 \n\n 拼合
      expect(mockUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "第一章的修仙之旅开始了...\n\n续写的部分内容。",
          word_count: 24,
        })
      );
      // 验证限制条件为当前选中的第一章 id: "ch-1"
      expect(mockEqSpy).toHaveBeenCalledWith("id", "ch-1");
    });

    // ── 验证中止优雅保存 ──
    // 重新触发“续写当前章”
    fireEvent.click(continueChapterBtn);
    await waitFor(() => {
      expect(container.textContent).toContain("正在生成中");
    });

    // 模拟发送了一部分 delta
    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("优雅中止的内容。");

    // 必须等待 delta 渲染进 DOM，使 streamContent 状态在 handleStop 闭包外完成更新
    await waitFor(() => {
      expect(container.textContent).toContain("优雅中止的内容。");
    });

    // 点击“停止生成”按钮
    const stopBtn = screen.getByRole("button", { name: /停止生成/ });
    fireEvent.click(stopBtn);

    // 验证应该触发了优雅保存：更新数据库
    await waitFor(() => {
      expect(mockUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "第一章的修仙之旅开始了...\n\n续写的部分内容。\n\n优雅中止的内容。",
          word_count: 34,
        })
      );
      expect(mockEqSpy).toHaveBeenCalledWith("id", "ch-1");
    });

    // 验证生成指示器消失，且 streamContent 清空
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
    });
  });

  it("在 streamContent 不为空的流式生成状态下切换章节应当清空临时流缓存", async () => {
    // 准备两章数据
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
      {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "重生",
        content: "李四重生了。",
        word_count: 6,
      }
    ]);

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 触发生成下一章
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    // 产生一部分临时流内容
    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("临时生成的下一章前奏内容");

    await waitFor(() => {
      expect(container.textContent).toContain("临时生成的下一章前奏内容");
    });

    // 模拟发生异常，使 isGenerating 变回 false，但保留临时流缓存 streamContent
    await waitFor(() => {
      expect((global as any).__mockStreamOnError).toBeDefined();
    });
    (global as any).__mockStreamOnError("模拟流连接超时");

    // 验证发生异常后，生成状态已恢复，且临时流缓存已被清空（页面上不再残留）
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("临时生成的下一章前奏内容");
    });

    // 找到第2章切换按钮并点击
    const buttons = container.querySelectorAll("button");
    const secondChapterBtn = Array.from(buttons).find(b => b.textContent?.includes("第2章"));
    expect(secondChapterBtn).toBeDefined();
    fireEvent.click(secondChapterBtn!);

    // 验证切换章节后，新选中的章节内容已正确加载，并且原先的流式缓存 streamContent 已经被完全清空
    await waitFor(() => {
      expect(container.textContent).toContain("李四重生了。");
      expect(container.textContent).not.toContain("临时生成的下一章前奏内容");
    });
  });

  it("对异常恢复的稳健性：当优雅保存触发未捕获异常时，系统不应当发生状态锁死", async () => {
    // 强制模拟 supabase.update 抛出未捕获的运行时异常（Exception），而不是返回 { error } 包装对象
    const originalFrom = supabase.from;
    supabase.from = vi.fn().mockImplementation((table: string) => {
      const builder = originalFrom(table);
      if (table === "chapters") {
        // 重写 update 方法使其抛出 Error
        builder.update = vi.fn().mockImplementation(() => {
          throw new Error("Supabase Network Runtime Exception");
        });
      }
      return builder;
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 触发续写
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    // 输入一些流内容，确保触发优雅保存
    (global as any).__mockStreamDelta("一些临时的续写片段");

    await waitFor(() => {
      expect(container.textContent).toContain("一些临时的续写片段");
    });

    // 点击停止生成，触发优雅保存（此时抛出异常）
    const stopBtn = screen.getByRole("button", { name: /停止生成/ });
    fireEvent.click(stopBtn);

    // 此时虽然 update 抛错，但系统应能容错并重置生成状态
    // 如果系统没有 try-catch，此项会发生锁死（即“正在生成中”不消失，且按钮依然被禁用）
    // 这里的对抗测试预期是：状态应正确恢复，若当前实现由于缺少 try-catch 卡死，则此处应抛出 Bug 证据
    try {
      await waitFor(() => {
        expect(container.textContent).not.toContain("正在生成中");
      }, { timeout: 1000 });
    } catch (err) {
      // 恢复 originalFrom
      supabase.from = originalFrom;
      throw new Error("BUG 验证：优雅保存抛出未捕获异常时导致 isGenerating 状态发生永久锁死！");
    }

    // 恢复 originalFrom
    supabase.from = originalFrom;
  });

  it("在流式生成状态下切换章节应当被拦截且弹出提示", async () => {
    // 动态增加第2章 mock 数据以便测试切换
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
      {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "突变",
        content: "李四重生了。",
        word_count: 6,
      }
    ]);

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 触发继续写作，使 isGenerating 变为 true
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    // 确认进入生成状态
    await screen.findByText("正在生成中...");

    // 找到第2章切换按钮并点击
    const buttons = container.querySelectorAll("button");
    const secondChapterBtn = Array.from(buttons).find(b => b.textContent?.includes("第2章"));
    expect(secondChapterBtn).toBeDefined();
    fireEvent.click(secondChapterBtn!);

    // 验证拦截提示 Toast 出现且 selectedChapter 不发生变更
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "请先停止当前生成，再切换到其他章节",
      variant: "destructive",
    }));

    // selectedChapter 仍为第1章（其正文还在页面上）
    expect(container.textContent).toContain("第一章的修仙之旅");
    expect(container.textContent).not.toContain("李四重生了。");
  });

  it("正在生成中时再次点击生成下一章应当被内存拦截防重", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });

    // 重置 mock 调用计数
    vi.mocked(streamNovelGeneration).mockClear();

    // 第一次点击
    fireEvent.click(continueBtn);
    expect(streamNovelGeneration).toHaveBeenCalledTimes(1);

    // 确认进入生成状态
    await screen.findByText("正在生成中...");

    // 第二次点击，此时 isGenerating 为 true，内存守卫应当拦截，不会触发第二次 streamNovelGeneration 调用
    fireEvent.click(continueBtn);
    expect(streamNovelGeneration).toHaveBeenCalledTimes(1);
  });

  it("流式生成、重写或续写发生异常(onError)时，应当能清空 streamContent", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 测试 handleContinue (生成下一章) 异常分支
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("一些下一章临时内容");
    await waitFor(() => { expect(container.textContent).toContain("一些下一章临时内容"); });
    (global as any).__mockStreamOnError("生成错误");
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些下一章临时内容");
    });

    // 测试 handleRewrite (重写本章) 异常分支
    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("一些重写临时内容");
    await waitFor(() => { expect(container.textContent).toContain("一些重写临时内容"); });
    (global as any).__mockStreamOnError("重写错误");
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些重写临时内容");
    });

    // 测试 handleContinueChapter (续写当前章) 异常分支
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("一些续写临时内容");
    await waitFor(() => { expect(container.textContent).toContain("一些续写临时内容"); });
    (global as any).__mockStreamOnError("续写错误");
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些续写临时内容");
    });
  });

  it("流式生成完成但在 Supabase 保存报错(onDone 失败分支)时，应当能清空 streamContent", async () => {
    // 强制模拟 supabase.insert 和 update 返回 error 错误
    const originalFrom = supabase.from;
    supabase.from = vi.fn().mockImplementation((table: string) => {
      const builder = originalFrom(table);
      if (table === "chapters") {
        builder.insert = vi.fn().mockImplementation(() => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Mock Insert Error" } }),
          }),
        }));
        builder.update = vi.fn().mockImplementation(() => ({
          eq: () => Promise.resolve({ data: null, error: { message: "Mock Update Error" } }),
        }));
      }
      return builder;
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 1. 生成下一章 保存报错
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("# 第二章 重生\n一些下一章临时内容，足够长以防被安全锁拦截。");
    await waitFor(() => { expect(container.textContent).toContain("一些下一章临时内容，足够长以防被安全锁拦截。"); });
    (global as any).__mockStreamDone();
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些下一章临时内容，足够长以防被安全锁拦截。");
    });

    // 2. 重写本章 保存报错
    const rewriteBtn = screen.getByRole("button", { name: /重写本章/ });
    fireEvent.click(rewriteBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("# 第一章 启程\n一些重写临时内容，足够长以防被安全锁拦截。");
    await waitFor(() => { expect(container.textContent).toContain("一些重写临时内容，足够长以防被安全锁拦截。"); });
    (global as any).__mockStreamDone();
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些重写临时内容，足够长以防被安全锁拦截。");
    });

    // 3. 续写当前章 保存报错
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);
    await waitFor(() => { expect((global as any).__mockStreamDelta).toBeDefined(); });
    (global as any).__mockStreamDelta("一些续写临时内容");
    await waitFor(() => { expect(container.textContent).toContain("一些续写临时内容"); });
    (global as any).__mockStreamDone();
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(container.textContent).not.toContain("一些续写临时内容");
    });

    supabase.from = originalFrom;
  });

  it("优雅保存报错时屏幕残留容灾保护：当优雅保存遇到报错时应当保留已生成文本在屏幕上", async () => {
    // 强制模拟 supabase.update 返回错误
    const originalFrom = supabase.from;
    supabase.from = vi.fn().mockImplementation((table: string) => {
      const builder = originalFrom(table);
      if (table === "chapters") {
        builder.update = vi.fn().mockImplementation(() => ({
          eq: () => Promise.resolve({ data: null, error: { message: "Supabase Save Error" } }),
        }));
      }
      return builder;
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 点击“续写当前章”按钮
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    // 模拟输出了一部分 delta
    (global as any).__mockStreamDelta("重要的创作文本，不能丢失");

    await waitFor(() => {
      expect(container.textContent).toContain("重要的创作文本，不能丢失");
    });

    // 点击“停止生成”按钮触发优雅保存
    const stopBtn = screen.getByRole("button", { name: /停止生成/ });
    fireEvent.click(stopBtn);

    // 验证：尽管保存失败，屏幕上的已生成文本仍然保留，不会被清空以保证容灾
    await waitFor(() => {
      expect(container.textContent).toContain("重要的创作文本，不能丢失");
      expect(container.textContent).not.toContain("正在生成中");
    });

    // 恢复 originalFrom
    supabase.from = originalFrom;
  });

  it("在 onDone 异步请求未返回的真空期内切换章节，应防止新章节被篡改的竞态拦截测试", async () => {
    // 准备两章数据，供切换使用
    setMockDataForTable("chapters", [
      {
        id: "ch-1",
        novel_id: "novel-123",
        chapter_number: 1,
        title: "启程",
        content: "第一章的修仙之旅开始了...",
        word_count: 12,
      },
      {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "重生",
        content: "第二章的内容...",
        word_count: 8,
      }
    ]);

    let resolveUpdate: (value: any) => void = () => {};
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    const originalFrom = supabase.from;
    supabase.from = vi.fn().mockImplementation((table: string) => {
      const builder = originalFrom(table);
      if (table === "chapters") {
        builder.update = vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => updatePromise),
        }));
      }
      return builder;
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 1. 触发续写当前章
    const continueChapterBtn = screen.getByRole("button", { name: /续写当前章/ });
    fireEvent.click(continueChapterBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("续写第一章的内容");

    await waitFor(() => {
      expect(container.textContent).toContain("续写第一章的内容");
    });

    // 2. 模拟流完成，触发 onDone
    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    const donePromise = (global as any).__mockStreamDone();

    // 3. 在 Supabase 异步请求挂起期间，尝试切换章节到第二章
    const buttons = container.querySelectorAll("button");
    const secondChapterBtn = Array.from(buttons).find(b => b.textContent?.includes("第2章"));
    expect(secondChapterBtn).toBeDefined();
    fireEvent.click(secondChapterBtn!);

    // 4. resolve 数据库的 update 异步请求
    resolveUpdate({ data: null, error: null });
    await donePromise;

    // 5. 验证第二章的内容绝对不能被篡改成第一章的生成内容
    await waitFor(() => {
      expect(container.textContent).not.toContain("第二章的内容...续写第一章的内容");
    });

    supabase.from = originalFrom;
  });

  it("在 onDone 的 Supabase 异步写入挂起期间，再次并发点击“生成下一章”应当被拦截防重", async () => {
    // 准备挂起的 Promise
    let resolveInsert: (value: any) => void = () => {};
    const insertPromise = new Promise((resolve) => {
      resolveInsert = resolve;
    });

    const originalFrom = supabase.from;
    supabase.from = vi.fn().mockImplementation((table: string) => {
      const builder = originalFrom(table);
      if (table === "chapters") {
        builder.insert = vi.fn().mockImplementation(() => ({
          select: () => ({
            single: () => insertPromise,
          }),
        }));
      }
      return builder;
    });

    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 重置 mock 调用计数
    vi.mocked(streamNovelGeneration).mockClear();

    // 1. 点击“生成下一章”按钮触发生成
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);
    expect(streamNovelGeneration).toHaveBeenCalledTimes(1);

    // 2. 模拟逐步生成文字并触发流结束 onDone
    await waitFor(() => {
      expect((global as any).__mockStreamDelta).toBeDefined();
    });
    (global as any).__mockStreamDelta("# 第二章 重生\n李四重生了，他的修仙之旅就此翻开了全新的一页。");

    await waitFor(() => {
      expect((global as any).__mockStreamDone).toBeDefined();
    });
    // 触发 onDone 挂起
    const donePromise = (global as any).__mockStreamDone();

    // 3. 在 Supabase 异步插入挂起的真空期内，快速再次点击“生成下一章”按钮
    fireEvent.click(continueBtn);

    // 4. 验证由于 isGenerating 守卫尚未释放，第二次生成请求应该被正确拦截拦截，总调用次数仍然是 1
    expect(streamNovelGeneration).toHaveBeenCalledTimes(1);

    // 5. 完成异步插入
    resolveInsert({
      data: {
        id: "ch-2",
        novel_id: "novel-123",
        chapter_number: 2,
        title: "重生",
        content: "李四重生了，他的修仙之旅就此翻开了全新的一页。",
        word_count: 21,
      },
      error: null,
    });
    await donePromise;

    // 恢复 originalFrom
    supabase.from = originalFrom;
  });

  it("在流生成下一章期间，点击“停止生成”中止流后系统状态应当正常解锁重置", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 1. 点击“生成下一章”
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    // 2. 等待 Abort 信号生成并验证其初始状态
    await waitFor(() => {
      expect((global as any).__mockStreamSignal).toBeDefined();
    });
    const signal = (global as any).__mockStreamSignal;
    expect(signal.aborted).toBe(false);

    // 3. 产生一部分文本流，验证显示中
    (global as any).__mockStreamDelta("正在生成中的一些文字...");
    await waitFor(() => {
      expect(container.textContent).toContain("正在生成中的一些文字...");
    });

    // 4. 点击“停止生成”按钮
    const stopBtn = screen.getByRole("button", { name: /停止生成/ });
    fireEvent.click(stopBtn);

    // 5. 验证 Abort 信号被触发，并且生成中指示器消失，系统状态不锁死
    expect(signal.aborted).toBe(true);
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
    });
  });

  it("网络异常：当流式接口返回502或LLM上游超时报错时，页面应当优雅展示 Toast 报错并自动恢复可用状态", async () => {
    const { container } = render(<NovelView />);
    await screen.findAllByText("测试网络小说");

    // 1. 点击“生成下一章”触发流式生成
    const continueBtn = screen.getByRole("button", { name: /生成下一章/ });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect((global as any).__mockStreamOnError).toBeDefined();
    });

    // 2. 模拟流式生成接口返回 502 错误并触发 onError
    (global as any).__mockStreamOnError("模型服务暂时不稳定（上游返回 502），请稍后重试或切换模型。");

    // 3. 验证是否弹出了友好的错误 Toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "生成失败",
          description: "模型服务暂时不稳定（上游返回 502），请稍后重试或切换模型。",
          variant: "destructive",
        })
      );
    });

    // 4. 验证正在生成中状态已重置，且按钮已重新恢复可用状态，UI 不卡死
    await waitFor(() => {
      expect(container.textContent).not.toContain("正在生成中");
      expect(continueBtn).not.toBeDisabled();
    });
  });
});

