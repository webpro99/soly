import { useCallback, useEffect, useState } from 'react';
import {
  loadSolyBootstrap,
  loginSoly,
  logoutSoly,
  restoreSolySession,
  type SolyBootstrap,
  type SolyUser,
} from '../api/solyApi';

export function useSolySession() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SolyUser | null>(null);
  const [bootstrap, setBootstrap] = useState<SolyBootstrap | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([restoreSolySession(), loadSolyBootstrap()]).then(([sessionResult, bootstrapResult]) => {
      if (!mounted) return;
      if (sessionResult.status === 'fulfilled' && sessionResult.value) {
        setToken(sessionResult.value.token);
        setUser(sessionResult.value.user);
      }
      if (bootstrapResult.status === 'fulfilled') setBootstrap(bootstrapResult.value);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setSubmitting(true);
    try {
      const result = await loginSoly(email, password);
      setToken(result.token);
      setUser(result.user);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setSubmitting(true);
    try {
      await logoutSoly(token);
      setToken(null);
      setUser(null);
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  return { loading, submitting, token, user, bootstrap, login, logout };
}
