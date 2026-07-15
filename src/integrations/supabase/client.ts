import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// 真实的 Supabase 客户端实例
export const rawSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// 本地单机数据库 Fluent API 模拟实现
class LocalQueryBuilder {
  private table: string;
  private filters: Array<{ column: string; value: any }> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private isSingle = false;
  private action: () => Promise<any>;

  constructor(table: string) {
    this.table = table;

    // 初始化默认数据
    this.initDefaultData();

    this.action = async () => {
      let data = JSON.parse(localStorage.getItem(`local_db_${this.table}`) || "[]");
      // 应用过滤
      for (const filter of this.filters) {
        data = data.filter((item: any) => item[filter.column] === filter.value);
      }
      // 排序
      if (this.orderCol) {
        data.sort((a: any, b: any) => {
          const valA = a[this.orderCol!];
          const valB = b[this.orderCol!];
          if (valA < valB) return this.orderAsc ? -1 : 1;
          if (valA > valB) return this.orderAsc ? 1 : -1;
          return 0;
        });
      }
      if (this.isSingle) {
        return { data: data[0] || null, error: null };
      }
      return { data, error: null };
    };
  }

  private initDefaultData() {
    const key = `local_db_${this.table}`;
    if (!localStorage.getItem(key)) {
      if (this.table === 'model_providers') {
        localStorage.setItem(key, JSON.stringify([
          {
            id: "mp-deepseek",
            user_id: "local-user-id",
            provider_type: "deepseek",
            name: "DeepSeek",
            default_model: "deepseek-chat",
            api_base_url: "https://api.deepseek.com/v1",
            enabled: true,
            is_default: true,
            api_key: ""
          },
          {
            id: "mp-claude",
            user_id: "local-user-id",
            provider_type: "claude",
            name: "Claude",
            default_model: "claude-3-5-sonnet-20241022",
            api_base_url: "https://api.anthropic.com/v1",
            enabled: true,
            is_default: false,
            api_key: ""
          },
          {
            id: "mp-grok",
            user_id: "local-user-id",
            provider_type: "grok",
            name: "Grok",
            default_model: "grok-3",
            api_base_url: "https://api.x.ai/v1",
            enabled: true,
            is_default: false,
            api_key: ""
          },
          {
            id: "mp-qwen",
            user_id: "local-user-id",
            provider_type: "qwen",
            name: "通义千问 (Qwen)",
            default_model: "qwen-plus",
            api_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            enabled: true,
            is_default: false,
            api_key: ""
          }
        ]));
      } else if (this.table === 'profiles') {
        localStorage.setItem(key, JSON.stringify([
          {
            id: "prof-local",
            user_id: "local-user-id",
            default_llm_model: "deepseek",
            nsfw_enabled: false
          }
        ]));
      } else {
        localStorage.setItem(key, "[]");
      }
    }
  }

  select(fields?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  limit(num: number) {
    const parentAction = this.action;
    this.action = async () => {
      const res = await parentAction();
      if (res.data && Array.isArray(res.data)) {
        res.data = res.data.slice(0, num);
      }
      return res;
    };
    return this;
  }

  insert(values: any) {
    this.action = async () => {
      let current = JSON.parse(localStorage.getItem(`local_db_${this.table}`) || "[]");
      const rowsToInsert = Array.isArray(values) ? values : [values];
      const inserted: any[] = [];
      for (const row of rowsToInsert) {
        const newRow = {
          id: Math.random().toString(36).substring(2, 11),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row
        };
        current.push(newRow);
        inserted.push(newRow);
      }
      localStorage.setItem(`local_db_${this.table}`, JSON.stringify(current));
      return { data: Array.isArray(values) ? inserted : inserted[0], error: null };
    };
    return this;
  }

  update(values: any) {
    this.action = async () => {
      let current = JSON.parse(localStorage.getItem(`local_db_${this.table}`) || "[]");
      let updatedCount = 0;
      let lastUpdated: any = null;
      current = current.map((item: any) => {
        const match = this.filters.every(f => item[f.column] === f.value);
        if (match) {
          const newItem = { ...item, ...values, updated_at: new Date().toISOString() };
          updatedCount++;
          lastUpdated = newItem;
          return newItem;
        }
        return item;
      });
      localStorage.setItem(`local_db_${this.table}`, JSON.stringify(current));
      return { data: this.isSingle ? lastUpdated : current, error: null };
    };
    return this;
  }

  delete() {
    this.action = async () => {
      let current = JSON.parse(localStorage.getItem(`local_db_${this.table}`) || "[]");
      current = current.filter((item: any) => {
        const match = this.filters.every(f => item[f.column] === f.value);
        return !match;
      });
      localStorage.setItem(`local_db_${this.table}`, JSON.stringify(current));
      return { data: null, error: null };
    };
    return this;
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.action().then(onfulfilled, onrejected);
  }

  catch(onrejected?: (reason: any) => any) {
    return this.action().catch(onrejected);
  }

  finally(onfinally?: () => void) {
    return this.action().finally(onfinally);
  }
}

// 封装导出全局统一的 supabase 客户端代理对象
export const supabase = {
  from(table: string) {
    const isLocal = localStorage.getItem("is_local_mode") === "true";
    if (isLocal) {
      return new LocalQueryBuilder(table) as any;
    }
    return rawSupabase.from(table);
  },
  get auth() {
    const isLocal = localStorage.getItem("is_local_mode") === "true";
    if (isLocal) {
      const localUser = {
        id: "local-user-id",
        aud: "authenticated",
        role: "authenticated",
        email: "local-user@ainovel.local",
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      };
      const localSession = {
        access_token: "local-bypass-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "local-bypass-refresh",
        user: localUser,
      };

      return {
        signInAnonymously: async () => ({ data: { user: localUser, session: localSession }, error: null }),
        signInWithPassword: async () => ({ data: { user: localUser, session: localSession }, error: null }),
        signUp: async () => ({ data: { user: localUser, session: localSession }, error: null }),
        signInWithOAuth: async () => ({ data: {}, error: null }),
        signOut: async () => {
          localStorage.removeItem("is_local_mode");
          window.location.reload();
          return { error: null };
        },
        getSession: async () => ({ data: { session: localSession }, error: null }),
        onAuthStateChange: (callback: any) => {
          // 延迟触发以匹配 React 挂载周期
          setTimeout(() => {
            callback("SIGNED_IN", localSession);
          }, 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      } as any;
    }
    return rawSupabase.auth;
  }
};