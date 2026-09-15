/**
 * Authentication service for JWT-based auth
 */

import { User } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://31.77.158.177:8080';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private currentUser: User | null = null;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

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

    // Schedule token refresh if we have tokens
    if (this.accessToken && this.refreshToken) {
      this.scheduleRefresh();
    }
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      console.log('[Auth] Attempting to register user:', credentials.email);
      console.log('[Auth] API URL:', `${API_BASE}/api/auth/register`);
      
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('[Auth] Response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('[Auth] Registration failed:', error);
        throw new Error(error || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      console.log('[Auth] Registration successful');
      this.setTokens(data.access_token, data.refresh_token, data.user);
      return data;
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Не удалось подключиться к серверу. Проверьте, что сервер запущен на ${API_BASE}`);
      }
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('[Auth] Attempting to login:', credentials.email);
      console.log('[Auth] API URL:', `${API_BASE}/api/auth/login`);
      
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('[Auth] Response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('[Auth] Login failed:', error);
        throw new Error(error || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      console.log('[Auth] Login successful');
      this.setTokens(data.access_token, data.refresh_token, data.user);
      return data;
    } catch (error) {
      console.error('[Auth] Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Не удалось подключиться к серверу. Проверьте, что сервер запущен на ${API_BASE}`);
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('[Auth] Attempting to refresh token');
      
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        console.error('[Auth] Token refresh failed:', response.status);
        // Refresh token is invalid, logout
        this.logout();
        throw new Error('Token refresh failed');
      }

      const data: AuthResponse = await response.json();
      console.log('[Auth] Token refresh successful');
      this.setTokens(data.access_token, data.refresh_token, data.user);
      return data;
    } catch (error) {
      console.error('[Auth] Refresh error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Не удалось подключиться к серверу. Проверьте, что сервер запущен на ${API_BASE}`);
      }
      throw error;
    }
  }

  /**
   * Check if server is available
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      console.log('[Auth] Checking server availability...');
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 seconds timeout
      });
      
      const isAvailable = response.ok;
      console.log('[Auth] Server availability:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('[Auth] Server not available:', error);
      return false;
    }
  }

  /**
   * Logout and clear tokens
   */
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

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.accessToken) return null;

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try refresh
          await this.refresh();
          return this.getCurrentUser();
        }
        return null;
      }

      const user: User = await response.json();
      this.currentUser = user;
      localStorage.setItem('voicehub-user', JSON.stringify(user));
      return user;
    } catch (e) {
      console.error('[Auth] Failed to get current user:', e);
      return null;
    }
  }

  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return {
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Set tokens after login/register/refresh
   */
  private setTokens(accessToken: string, refreshToken: string, user: User) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.currentUser = user;

    localStorage.setItem('voicehub-access-token', accessToken);
    localStorage.setItem('voicehub-refresh-token', refreshToken);
    localStorage.setItem('voicehub-user', JSON.stringify(user));

    this.scheduleRefresh();
  }

  /**
   * Clear tokens on logout
   */
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;

    localStorage.removeItem('voicehub-access-token');
    localStorage.removeItem('voicehub-refresh-token');
    localStorage.removeItem('voicehub-user');

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Schedule token refresh (refresh 5 minutes before expiry)
   */
  private scheduleRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Decode JWT to get expiry
    if (!this.accessToken) return;

    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      const expiresIn = payload.exp * 1000 - Date.now();
      const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 60 * 1000); // 5 min before expiry, min 1 min

      this.refreshTimeout = setTimeout(() => {
        this.refresh().catch(err => {
          console.error('[Auth] Scheduled refresh failed:', err);
        });
      }, refreshIn);
    } catch (e) {
      console.error('[Auth] Failed to schedule refresh:', e);
    }
  }
}

export const authService = new AuthService();
export default authService;
