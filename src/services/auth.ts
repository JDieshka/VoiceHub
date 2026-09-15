/**
 * Authentication service for JWT-based auth
 */

import { User } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || `http://${window.location.hostname}:8080`;

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
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid, logout
      this.logout();
      throw new Error('Token refresh failed');
    }

    const data: AuthResponse = await response.json();
    this.setTokens(data.access_token, data.refresh_token, data.user);
    return data;
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
