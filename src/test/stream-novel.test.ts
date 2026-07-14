import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamNovelGeneration } from "../lib/stream-novel";

describe("streamNovelGeneration", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应当能够成功解析完整的流式数据并触发 onDelta 和 onDone", async () => {
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "第一章"}}]}\n',
      'data: {"choices": [{"delta": {"content": "：启程"}}]}\n',
      "data: [DONE]\n",
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

    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, "第一章");
    expect(onDelta).toHaveBeenNthCalledWith(2, "：启程");
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("应当能够容忍网络切包导致的 JSON 截断并执行 Buffer 倒退拼接", async () => {
    // 模拟网络切包截断：
    // 本测试用例验证的是常规网络分包（分包结尾无换行符）下的流式拼接鲁棒性。
    // 第一个 chunk 包含了一个完整的行和一个在末尾被强行截断的 JSON 串。
    // 注意：由于 `stream-novel.ts` 的 catch 回滚机制存在死锁缺陷，如果切包时遇到了物理换行符且 JSON 损坏，
    // 会导致该损坏行被带换行符拼回 buffer 头部，进而陷入死循环/死锁。
    // 因此，为了使本测试用例能够顺利通过，此处的模拟数据中未包含物理换行但 JSON 损坏的恶意切包场景。
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "有效内容"}}]}\ndata: {"choices": [{"delta": {"content": "截断的',
      '内容"}}]}\ndata: [DONE]\n',
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

    // 验证截断内容成功被拼接并正确解析
    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, "有效内容");
    expect(onDelta).toHaveBeenNthCalledWith(2, "截断的内容");
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("应当能够成功处理切包残缺 JSON 带有换行符的情况并防止死锁", async () => {
    // 模拟带有物理换行符的残损切包，测试防死锁机制
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "第一包正常"}}]}\ndata: {"choices": [{"delta": {"content": "第二包带换行\n',
      '截断"}}]}\ndata: [DONE]\n',
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

    // 验证流能够成功恢复且没有被死锁假死，并最终能消费完所有正确的内容
    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, "第一包正常");
    expect(onDelta).toHaveBeenNthCalledWith(2, "第二包带换行截断");
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("当接口返回 401 错误时应当触发 onError 并提示登录过期", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("Unauthorized"),
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

    expect(onError).toHaveBeenCalledWith("登录已过期，请重新登录");
    expect(onDelta).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("应当揭露由于带有 data: 前缀的残缺 JSON 回滚拼接导致的后续流数据丢失缺陷", async () => {
    // 模拟真实的 SSE 流切包：
    // 第二个包是一个在结构上少了一个右大括号的损坏 JSON 包。
    // 第三个包是合法的、带有 data: 前缀的正常 JSON 包。
    // 预期：程序应该能够跳过或恢复损坏包，不能因为回滚拼接污染了 buffer 从而丢失后续的“正常包2”。
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "正常包1"}}]}\n',
      'data: {"choices": [{"delta": {"content": "坏包2"}}]\n',
      'data: {"choices": [{"delta": {"content": "正常包2"}}]}\n',
      "data: [DONE]\n",
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

    // 这里由于 stream-novel.ts 存在回滚死锁（挂起/污染）缺陷，导致后续正常包2的数据也一起丢失。
    // 我们断言应当成功接收到“正常包2”的内容。如果此测试失败，代表复现了该重大缺陷。
    expect(onDelta).toHaveBeenCalledWith("正常包2");
    expect(onDone).toHaveBeenCalled();
  });

  it("当流中包含非 JSON 的乱码或控制字符等垃圾数据时应当优雅忽略而不崩溃", async () => {
    // 模拟包含特殊控制字符、非法非 JSON 内容以及正常内容的混合流
    const mockChunks = [
      'data: {"choices": [{"delta": {"content": "有效前缀"}}]}\n',
      "data: !!!非合法JSON垃圾字符!!!\n",
      "data: \u0000\u0001\u0002控制字符\n",
      'data: {"choices": [{"delta": {"content": "有效后缀"}}]}\n',
      "data: [DONE]\n",
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

    // 检查合法部分是否成功解析，且垃圾数据没有导致整体抛错或崩溃
    expect(onDelta).toHaveBeenCalledWith("有效前缀");
    expect(onDelta).toHaveBeenCalledWith("有效后缀");
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

