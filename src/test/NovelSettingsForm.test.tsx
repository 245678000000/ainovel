import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NovelSettingsForm } from "../components/novel-settings/NovelSettingsForm";
import React from "react";

describe("NovelSettingsForm", () => {
  const defaultProps = {
    modelName: "GPT-4",
    isGenerating: false,
    onGenerate: vi.fn(),
    onStop: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    // 模拟剪贴板 API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
    // 模拟 document.execCommand 避免 jsdom 环境缺失导致 spy 报错
    if (typeof document.execCommand !== "function") {
      Object.defineProperty(document, "execCommand", {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // 清理动态添加的 execCommand 模拟，还原测试环境
    if (Object.prototype.hasOwnProperty.call(document, "execCommand")) {
      // @ts-ignore
      delete document.execCommand;
    }
  });

  it("应当在挂载时从 LocalStorage 读取数据", () => {
    const savedSettings = {
      oneLinePitch: "从缓存中恢复的小说简介",
      genres: ["科幻"],
      mainCharacter: {
        name: "李四",
        gender: "男",
        age: "25",
        personality: "冷静沉着",
      },
    };
    localStorage.setItem("novel_settings_v1", JSON.stringify(savedSettings));

    render(<NovelSettingsForm {...defaultProps} />);

    // 验证小说简介是否成功恢复
    const textarea = screen.getByPlaceholderText(
      "例如：卑微社畜穿越异界，一边摸鱼一边靠系统苟成天道之主。"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("从缓存中恢复的小说简介");
  });

  it("当输入内容改变时，应当在 400ms 防抖后自动保存到 LocalStorage", async () => {
    vi.useFakeTimers();
    render(<NovelSettingsForm {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      "例如：卑微社畜穿越异界，一边摸鱼一边靠系统苟成天道之主。"
    ) as HTMLTextAreaElement;

    // 模拟用户输入
    fireEvent.change(textarea, { target: { value: "测试自动保存的简介" } });

    // 在 399ms 时不应该写入 LocalStorage
    vi.advanceTimersByTime(399);
    expect(localStorage.getItem("novel_settings_v1")).toBeNull();

    // 在推进至 400ms 后应当写入 LocalStorage
    vi.advanceTimersByTime(1);
    const stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.oneLinePitch).toBe("测试自动保存的简介");
  });

  it("当点击导出 JSON 和生成小说提示词时，应当正确调用剪贴板 writeText", async () => {
    render(<NovelSettingsForm {...defaultProps} />);

    // 1. 导出 JSON 测试
    // 通过 title 属性定位“导出 JSON”按钮并点击
    const exportBtn = screen.getByTitle("导出 JSON");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    const lastCallArg = (navigator.clipboard.writeText as any).mock.calls[0][0];
    const parsedData = JSON.parse(lastCallArg);
    // 应当是默认值之一的 totalWords 属性
    expect(parsedData).toHaveProperty("totalWords", 100000);

    // 2. 生成小说提示词测试
    const promptBtn = screen.getByText("生成小说提示词");
    fireEvent.click(promptBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
    });
    const secondCallArg = (navigator.clipboard.writeText as any).mock.calls[1][0];
    expect(secondCallArg).toContain("你现在是一名经验丰富的中文网络小说作者");
  });

  it("当导入配置文件时，应当解析并更新表单状态", async () => {
    const { container } = render(<NovelSettingsForm {...defaultProps} />);

    // 构造被导入的文件内容
    const importData = {
      oneLinePitch: "导入后的新颖设定",
      genres: ["都市", "游戏"],
      mainCharacter: {
        name: "张三丰",
        gender: "男",
        age: "100",
        personality: "仙风道骨",
      },
    };

    const file = new File([JSON.stringify(importData)], "settings.json", {
      type: "application/json",
    });

    // 确保 text 方法可用
    if (typeof file.text !== "function") {
      file.text = () => Promise.resolve(JSON.stringify(importData));
    }

    // 查找隐藏的 file input 并触发 change 事件
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    fireEvent.change(input, {
      target: { files: [file] },
    });

    // 验证表单状态确实已更新
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(
        "例如：卑微社畜穿越异界，一边摸鱼一边靠系统苟成天道之主。"
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("导入后的新颖设定");
    });
  });

  it("应当支持题材 Badge 的增删选择交互", async () => {
    vi.useFakeTimers();
    render(<NovelSettingsForm {...defaultProps} />);

    // 选择题材 "科幻"
    const sciFiBadge = screen.getByText("科幻");
    fireEvent.click(sciFiBadge);

    // 推进防抖时间以保存
    vi.advanceTimersByTime(400);

    let stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.genres).toContain("科幻");

    // 取消选择题材 "科幻"
    fireEvent.click(sciFiBadge);
    vi.advanceTimersByTime(400);

    stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.genres).not.toContain("科幻");
  });

  it("应当支持配角的动态添加与删除，并保存状态", async () => {
    vi.useFakeTimers();
    const { container } = render(<NovelSettingsForm {...defaultProps} />);

    // 1. 初始状态：配角列表为空，显示提示语
    expect(screen.queryByPlaceholderText("如：李师兄 / 小胖")).toBeNull();
    expect(screen.getByText("还没有配角。可以添加主角的青梅竹马、死党、导师、队友等。")).toBeInTheDocument();

    // 2. 点击“添加配角”按钮
    const addBtn = screen.getByText("添加配角");
    fireEvent.click(addBtn);

    // 3. 此时应当渲染了一个配角的输入框
    const nameInput = screen.getByPlaceholderText("如：李师兄 / 小胖") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();

    // 4. 输入姓名并更新
    fireEvent.change(nameInput, { target: { value: "王小二" } });
    vi.advanceTimersByTime(400);

    let stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.sideCharacters).toHaveLength(1);
    expect(stored.sideCharacters[0].name).toBe("王小二");

    // 5. 点击删除按钮删除该配角
    const deleteBtn = container.querySelector(".text-destructive");
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn!);

    vi.advanceTimersByTime(400);
    stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.sideCharacters).toHaveLength(0);
    expect(screen.queryByPlaceholderText("如：李师兄 / 小胖")).toBeNull();
  });

  it("应当支持写作风格（叙述视角、金手指、总字数、NSFW开关）的交互与保存", async () => {
    vi.useFakeTimers();
    const { container } = render(<NovelSettingsForm {...defaultProps} />);

    // 1. 验证叙述视角的默认值
    expect(screen.getByText("第三人称有限")).toBeInTheDocument();

    // 2. 模拟修改总字数
    const numberInputs = container.querySelectorAll('input[type="number"]');
    const totalWordsInput = numberInputs[0] as HTMLInputElement;
    fireEvent.change(totalWordsInput, { target: { value: "200000" } });
    vi.advanceTimersByTime(400);

    let stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.totalWords).toBe(200000);

    // 3. 模拟勾选 NSFW 内容
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const nsfwCheckbox = checkboxes[0] as HTMLInputElement;
    fireEvent.click(nsfwCheckbox);
    vi.advanceTimersByTime(400);

    stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.nsfw).toBe(true);
  });

  it("应当支持写作禁忌的动态添加、修改与删除，并保存状态", async () => {
    vi.useFakeTimers();
    const { container } = render(<NovelSettingsForm {...defaultProps} />);

    // 1. 初始状态
    expect(screen.queryByPlaceholderText("不想出现的内容或写作雷点。")).toBeNull();
    expect(screen.getByText("例如：禁止 NTR、禁止虐主、避免过度血腥、避免现实政治等。")).toBeInTheDocument();

    // 2. 点击添加禁忌按钮
    const addBtn = screen.getByText("添加禁忌");
    fireEvent.click(addBtn);

    // 3. 验证禁忌输入框已渲染并输入内容
    const tabooTextarea = screen.getByPlaceholderText("不想出现的内容或写作雷点。") as HTMLTextAreaElement;
    expect(tabooTextarea).toBeInTheDocument();
    fireEvent.change(tabooTextarea, { target: { value: "禁止NTR" } });
    vi.advanceTimersByTime(400);

    let stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.taboos).toHaveLength(1);
    expect(stored.taboos[0].content).toBe("禁止NTR");

    // 4. 删除禁忌
    const deleteBtn = container.querySelector(".text-destructive");
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn!);
    vi.advanceTimersByTime(400);

    stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.taboos).toHaveLength(0);
  });

  it("应当支持参考作品的动态添加、修改与删除，并保存状态", async () => {
    vi.useFakeTimers();
    const { container } = render(<NovelSettingsForm {...defaultProps} />);

    // 1. 初始状态
    expect(screen.queryByPlaceholderText("作品名，如：斗破苍穹")).toBeNull();
    expect(screen.getByText("例如：世界观像《斗破苍穹》，主角性格像《诡秘之主》，感情线像某部作品等。")).toBeInTheDocument();

    // 2. 点击添加作品按钮
    const addBtn = screen.getByText("添加作品");
    fireEvent.click(addBtn);

    // 3. 验证参考作品表单字段已渲染并输入数据
    const titleInput = screen.getByPlaceholderText("作品名，如：斗破苍穹") as HTMLInputElement;
    const inspirationTextarea = screen.getByPlaceholderText("具体借鉴点，如：世界观设定、修炼体系、主角成长曲线、叙事节奏等。") as HTMLTextAreaElement;

    expect(titleInput).toBeInTheDocument();
    expect(inspirationTextarea).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: "诡秘之主" } });
    fireEvent.change(inspirationTextarea, { target: { value: "借鉴其扮演法和克苏鲁风格" } });
    vi.advanceTimersByTime(400);

    let stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.references).toHaveLength(1);
    expect(stored.references[0].title).toBe("诡秘之主");
    expect(stored.references[0].inspiration).toBe("借鉴其扮演法和克苏鲁风格");

    // 4. 点击删除参考作品
    const deleteBtn = container.querySelector(".text-destructive");
    expect(deleteBtn).not.toBeNull();
    fireEvent.click(deleteBtn!);
    vi.advanceTimersByTime(400);

    stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
    expect(stored.references).toHaveLength(0);
  });

  describe("健壮性与安全加固测试", () => {
    it("挂载时如果 LocalStorage 缓存是无效格式（如 null 或非对象），应当安全退避，不发生崩溃", () => {
      localStorage.setItem("novel_settings_v1", "null");
      expect(() => render(<NovelSettingsForm {...defaultProps} />)).not.toThrow();

      localStorage.setItem("novel_settings_v1", '"invalid_string"');
      expect(() => render(<NovelSettingsForm {...defaultProps} />)).not.toThrow();
    });

    it("挂载时如果 6 大数组属性缺失、为 null 或非数组类型，应当防御清洗为默认空数组，防止白屏", () => {
      const corruptedSettings = {
        oneLinePitch: "损坏的配置",
        sideCharacters: null, // 应当清洗为 []
        antagonists: "not_an_array", // 应当清洗为 []
        taboos: undefined, // 应当清洗为 []
      };
      localStorage.setItem("novel_settings_v1", JSON.stringify(corruptedSettings));

      render(<NovelSettingsForm {...defaultProps} />);
      // 检验是否正常渲染且没有抛错导致白屏
      expect(screen.getByText("创作设定")).toBeInTheDocument();
    });

    it("挂载或导入时，对于数组中的元素，应当通过默认空元素创建方法做项级深层属性补全", () => {
      const legacySettings = {
        sideCharacters: [
          {
            id: "char-1",
            name: "李大师",
            // 缺失 abilities, background, relationship 等诸多属性
          }
        ]
      };
      localStorage.setItem("novel_settings_v1", JSON.stringify(legacySettings));
      
      vi.useFakeTimers();
      render(<NovelSettingsForm {...defaultProps} />);
      
      // 触发一次防抖保存，检验自动保存到 LocalStorage 的数据是否已经被项级补全
      vi.advanceTimersByTime(400);
      const stored = JSON.parse(localStorage.getItem("novel_settings_v1") || "{}");
      
      expect(stored.sideCharacters).toHaveLength(1);
      expect(stored.sideCharacters[0].id).toBe("char-1");
      expect(stored.sideCharacters[0].name).toBe("李大师");
      // 验证缺失的属性被自动补全
      expect(stored.sideCharacters[0]).toHaveProperty("abilities", "");
      expect(stored.sideCharacters[0]).toHaveProperty("background", "");
      expect(stored.sideCharacters[0]).toHaveProperty("relationship", "");
    });

    it("剪贴板 fallback：当 navigator.clipboard 不存在时，应当降级到 document.execCommand 方案", async () => {
      // 模拟非安全环境，clipboard 为 undefined
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true
      });

      const execSpy = vi.spyOn(document, "execCommand").mockReturnValue(true);

      render(<NovelSettingsForm {...defaultProps} />);
      const exportBtn = screen.getByTitle("导出 JSON");
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(execSpy).toHaveBeenCalledWith("copy");
      });

      // 恢复原有的 clipboard 模拟
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true
      });
      execSpy.mockRestore();
    });

    it("剪贴板 fallback：当 navigator.clipboard.writeText 抛出异常时，同样应当降级到 document.execCommand", async () => {
      // 模拟 writeText 抛异常
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard Permission Denied")),
        },
        writable: true,
        configurable: true
      });

      const execSpy = vi.spyOn(document, "execCommand").mockReturnValue(true);

      render(<NovelSettingsForm {...defaultProps} />);
      const promptBtn = screen.getByText("生成小说提示词");
      fireEvent.click(promptBtn);

      await waitFor(() => {
        expect(execSpy).toHaveBeenCalledWith("copy");
      });

      // 恢复原有的 clipboard 模拟
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true
      });
      execSpy.mockRestore();
    });
  });
});

