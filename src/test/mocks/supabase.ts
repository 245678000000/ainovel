import { vi } from "vitest";

export const mockUpdateSpy = vi.fn();
export const mockEqSpy = vi.fn();

// 保存每个表的模拟数据和错误
let tableData: Record<string, any> = {};
let tableErrors: Record<string, any> = {};

// 提供给测试用例使用的辅助函数，用于改写模拟返回值
export const setMockDataForTable = (table: string, data: any) => {
  tableData[table] = data;
};

export const setMockErrorForTable = (table: string, error: any) => {
  tableErrors[table] = error;
};

export const clearSupabaseMocks = () => {
  tableData = {};
  tableErrors = {};
};

// 链式查询构建器，模拟 Fluent API 并完整代理 Promise
class MockQueryBuilder {
  private table: string;
  private promise: Promise<any> | null = null;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  private getPromise() {
    if (!this.promise) {
      this.promise = Promise.resolve().then(() => this.getFinalResult(this.isSingle));
    }
    return this.promise;
  }

  select(fields?: string) {
    return this;
  }

  eq(column: string, value: any) {
    mockEqSpy(column, value);
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(values: any) {
    this.promise = Promise.resolve().then(() => {
      const presetData = tableData[this.table];
      const data = presetData !== undefined ? presetData : values;
      const error = tableErrors[this.table] || null;
      return { data, error };
    });
    return this;
  }

  update(values: any) {
    mockUpdateSpy(values);
    this.promise = Promise.resolve().then(() => {
      const presetData = tableData[this.table];
      const data = presetData !== undefined ? presetData : values;
      const error = tableErrors[this.table] || null;
      return { data, error };
    });
    return this;
  }

  delete() {
    this.promise = Promise.resolve().then(() => {
      const error = tableErrors[this.table] || null;
      return { data: null, error };
    });
    return this;
  }

  // 实现 Thenable 接口以支持 await 和 Promise.all
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.getPromise().then(onfulfilled, onrejected);
  }

  catch(onrejected?: (reason: any) => any) {
    return this.getPromise().catch(onrejected);
  }

  finally(onfinally?: () => void) {
    return this.getPromise().finally(onfinally);
  }

  private getFinalResult(isSingle: boolean) {
    const error = tableErrors[this.table] || null;
    let data = tableData[this.table] !== undefined ? tableData[this.table] : null;

    if (data && isSingle) {
      if (Array.isArray(data)) {
        data = data[0] || null;
      }
    }
    return { data, error };
  }
}

// 模拟的 Auth 模块
export const mockAuth = {
  onAuthStateChange: vi.fn((callback) => {
    callback("SIGNED_IN", { user: { id: "test-user-id" } });
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  }),
  getSession: vi.fn(() =>
    Promise.resolve({
      data: {
        session: {
          user: { id: "test-user-id", email: "test@example.com" },
        },
      },
      error: null,
    })
  ),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
};

// 导出的 supabase Mock 对象
export const supabase = {
  from: vi.fn((table: string) => {
    return new MockQueryBuilder(table);
  }),
  auth: mockAuth,
};
