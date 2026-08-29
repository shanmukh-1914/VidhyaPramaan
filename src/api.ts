import { useAppStore } from './store/useAppStore';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAppStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(endpoint, {
    ...options,
    headers,
  });

  // Handle 401 token expiry with automatic refresh attempt
  if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh') {
    const refreshToken = localStorage.getItem('skillforge_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.token) {
            useAppStore.getState().setAuth(refreshData.token, useAppStore.getState().user!);
            if (refreshData.refreshToken) {
              localStorage.setItem('skillforge_refresh_token', refreshData.refreshToken);
            }
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.token}`;
            res = await fetch(endpoint, { ...options, headers });
          }
        }
      } catch (err) {
        console.warn('Auto refresh failed:', err);
      }
    }
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }

  return data;
}

// Microservice Client Wrappers (Phases 8, 9, 10, 11)
export const microservicesApi = {
  getScoringHealth: () => apiRequest('/api/scoring/health'),
  scoreSkill: (payload: { skill: string; codeSnippet?: string; repositoryData?: any; experienceYears?: number }) =>
    apiRequest('/api/scoring/score', { method: 'POST', body: JSON.stringify(payload) }),

  getProctoringHealth: () => apiRequest('/api/proctoring/health'),
  checkPresence: (payload: { faceCount?: number; detectedObjects?: string[]; headPoseAngles?: any }) =>
    apiRequest('/api/proctoring/presence', { method: 'POST', body: JSON.stringify(payload) }),

  getIdentityHealth: () => apiRequest('/api/identity/health'),
  verifyIdentity: (payload: { referenceDescriptor?: number[]; currentDescriptor?: number[]; threshold?: number }) =>
    apiRequest('/api/identity/verify', { method: 'POST', body: JSON.stringify(payload) }),

  getOcrHealth: () => apiRequest('/api/ocr/health'),
  extractCertificateOcr: (payload: { imageBase64: string; mimeType?: string }) =>
    apiRequest('/api/ocr/ocr', { method: 'POST', body: JSON.stringify(payload) }),

  getAdminStats: () => apiRequest('/api/admin/stats'),
  getAdminUsers: () => apiRequest('/api/admin/users'),
  getAdminLogs: () => apiRequest('/api/admin/audit-logs'),
  getAdminProctoringSessions: () => apiRequest('/api/admin/proctoring-sessions'),
  updateUserRole: (userId: string, role: string) =>
    apiRequest(`/api/admin/users/${userId}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
};

