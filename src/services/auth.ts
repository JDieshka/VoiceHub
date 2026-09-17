/**
 * Authentication service for JWT-based auth
 */

// Динамический URL сервера - устанавливается при выборе сервера
let API_BASE = '';

export const setServerUrl = (url: string) => {
  API_BASE = url;
  console.log('[Auth] Server URL set to:', API_BASE);
};

export const getServerUrl = () => API_BASE;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: any = null;

  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('voicehub-access-token');
    this.refreshToken = localStorage.getItem('voicehub-refresh-token');
    
    const userStr = localStorage.getItem('voicehub-user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        console.error('[Auth] Failed to parse user:', e);
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('[Auth] Attempting to login:', credentials.email);
      
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      this.setTokens(data.access_token, data.refresh_token, data.user);
      return data;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      console.log('[Auth] Attempting to register:', credentials.email);
      
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      this.setTokens(data.access_token, data.refresh_token, data.user);
      return data;
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      } catch (e) {
        console.error('[Auth] Logout request failed:', e);
      }
    }

    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  getUser(): any {
    return this.currentUser;
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return {
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  private setTokens(accessToken: string, refreshToken: string, user: any) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.currentUser = user;

    localStorage.setItem('voicehub-access-token', accessToken);
    localStorage.setItem('voicehub-refresh-token', refreshToken);
    localStorage.setItem('voicehub-user', JSON.stringify(user));
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;

    localStorage.removeItem('voicehub-access-token');
    localStorage.removeItem('voicehub-refresh-token');
    localStorage.removeItem('voicehub-user');
  }
}

export const authService = new AuthService();
export default authService;
