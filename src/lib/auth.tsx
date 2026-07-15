import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检测是否开启了本地单机模式
    const isLocal = localStorage.getItem("is_local_mode") === "true";
    if (isLocal) {
      setSession({
        access_token: "local-bypass-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "local-bypass-refresh",
        user: {
          id: "local-user-id",
          aud: "authenticated",
          role: "authenticated",
          email: "local-user@ainovel.local",
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        } as any,
      });
      setUser({
        id: "local-user-id",
        aud: "authenticated",
        role: "authenticated",
        email: "local-user@ainovel.local",
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      } as any);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const isLocal = localStorage.getItem("is_local_mode") === "true";
    if (isLocal) {
      localStorage.removeItem("is_local_mode");
      setSession(null);
      setUser(null);
      window.location.reload();
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isLocal = localStorage.getItem("is_local_mode") === "true";
    if (!loading && !user && !isLocal) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const isLocal = localStorage.getItem("is_local_mode") === "true";
  if (!user && !isLocal) return null;
  return <>{children}</>;
}
