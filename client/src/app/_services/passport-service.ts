import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Passport } from '../_models/passport';

export interface MockUser {
    username: string;
    password: string;
    display_name: string;
    avatar_url?: string;
    email?: string;
    institution?: string;
    education_level?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PassportService {
    private http = inject(HttpClient);
    data = signal<Passport | undefined>(undefined);
    private readonly USERS_KEY = 'mock_users_db';

    constructor() {
        const stored = localStorage.getItem('passport');
        if (stored) {
            try {
                this.data.set(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem('passport');
            }
        }
    }

    private getStoredUsers(): MockUser[] {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    }

    private saveUsers(users: MockUser[]) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    mockRegister(user: MockUser): string | null {
        const users = this.getStoredUsers();
        if (users.find(u => u.username === user.username)) {
            return 'Username already exists';
        }
        // Initialize email with username if not provided
        if (!user.email) {
            user.email = user.username;
        }
        users.push(user);
        this.saveUsers(users);
        
        // Auto login after register
        return this.mockLogin(user.username, user.password);
    }

    mockLogin(username: string, password?: string): string | null {
        const users = this.getStoredUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return 'User not found. Please sign up first.';
        }

        if (password && user.password !== password) {
            return 'Invalid password';
        }

        const passport: Passport = {
            access_token: 'mock-token-' + Date.now(),
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            email: user.email || user.username, // Use stored email or fallback to login username
            institution: user.institution,
            education_level: user.education_level
        };
        
        this.data.set(passport);
        localStorage.setItem('passport', JSON.stringify(passport));
        return null;
    }

    updateAvatar(url: string) {
        const current = this.data();
        if (current) {
            const updated = { ...current, avatar_url: url };
            this.updatePassportData(updated);
        }
    }

    updateProfileInfo(institution: string, educationLevel: string, email: string) {
        const current = this.data();
        if (current) {
            const updated = { ...current, institution, education_level: educationLevel, email };
            this.updatePassportData(updated);
        }
    }

    private updatePassportData(updated: Passport) {
        this.data.set(updated);
        localStorage.setItem('passport', JSON.stringify(updated));

        // Also update in mock DB if user is logged in
        const users = this.getStoredUsers();
        const userIndex = users.findIndex(u => u.display_name === updated.display_name);
        if (userIndex !== -1) {
            const user = users[userIndex];
            const updatedMockUser: MockUser = {
                ...user,
                avatar_url: updated.avatar_url,
                email: updated.email,
                institution: updated.institution,
                education_level: updated.education_level
            };
            users[userIndex] = updatedMockUser;
            this.saveUsers(users);
        }
    }

    logout() {
        this.data.set(undefined);
        localStorage.removeItem('passport');
    }

    // Keep old methods for compatibility but they are now replaced by mockLogin/mockRegister logic in Login.ts
    async login(credentials: any): Promise<string | null> {
        // Use mock logic if no backend is available or for testing
        return this.mockLogin(credentials.username, credentials.password);
    }

    async register(data: any): Promise<string | null> {
        return this.mockRegister({
            username: data.username,
            password: data.password,
            display_name: data.display_name
        });
    }
}