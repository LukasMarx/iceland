import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../api-base-url.token';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    initials: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly _isAuthenticated = signal(this.hasValidToken());

  readonly isAuthenticated = computed(() => this._isAuthenticated());
  readonly role = computed(() => this.getUser()?.role ?? null);

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, password });
  }

  handleLoginSuccess(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this._isAuthenticated.set(true);
    this.router.navigateByUrl('/spots');
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._isAuthenticated.set(false);
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): LoginResponse['user'] | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    return !!token;
  }
}