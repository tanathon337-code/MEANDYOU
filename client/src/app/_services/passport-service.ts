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
    friends?: string[];
    incomingFriendRequests?: string[];
    outgoingFriendRequests?: string[];
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

    getAllUsers(): MockUser[] {
        return this.getStoredUsers();
    }

    findUserByDisplayName(display_name: string): MockUser | undefined {
        const users = this.getStoredUsers();
        return users.find(u => u.display_name === display_name);
    }

    getFriends(display_name: string): MockUser[] {
        const users = this.getStoredUsers();
        const user = users.find(u => u.display_name === display_name);
        if (!user || !user.friends || user.friends.length === 0) {
            return [];
        }
        return user.friends
            .map(name => users.find(u => u.display_name === name))
            .filter((u): u is MockUser => !!u);
    }

    addFriend(currentDisplayName: string, friendDisplayName: string) {
        if (currentDisplayName === friendDisplayName) return;

        const users = this.getStoredUsers();
        const me = users.find(u => u.display_name === currentDisplayName);
        const friend = users.find(u => u.display_name === friendDisplayName);

        if (!me || !friend) return;

        if (!me.friends) me.friends = [];
        if (!friend.friends) friend.friends = [];

        if (!me.friends.includes(friendDisplayName)) {
            me.friends.push(friendDisplayName);
        }

        if (!friend.friends.includes(currentDisplayName)) {
            friend.friends.push(currentDisplayName);
        }

        this.saveUsers(users);
    }

    removeFriend(currentDisplayName: string, friendDisplayName: string) {
        if (currentDisplayName === friendDisplayName) return;

        const users = this.getStoredUsers();
        const me = users.find(u => u.display_name === currentDisplayName);
        const friend = users.find(u => u.display_name === friendDisplayName);

        if (!me || !friend) return;

        if (me.friends && me.friends.length > 0) {
            me.friends = me.friends.filter(name => name !== friendDisplayName);
        }

        if (friend.friends && friend.friends.length > 0) {
            friend.friends = friend.friends.filter(name => name !== currentDisplayName);
        }

        this.saveUsers(users);
    }

    sendFriendRequest(fromDisplayName: string, toDisplayName: string) {
        if (fromDisplayName === toDisplayName) return;

        const users = this.getStoredUsers();
        const from = users.find(u => u.display_name === fromDisplayName);
        const to = users.find(u => u.display_name === toDisplayName);

        if (!from || !to) return;

        if (from.friends && from.friends.includes(toDisplayName)) return;

        if (!from.outgoingFriendRequests) from.outgoingFriendRequests = [];
        if (!to.incomingFriendRequests) to.incomingFriendRequests = [];

        if (!from.outgoingFriendRequests.includes(toDisplayName)) {
            from.outgoingFriendRequests.push(toDisplayName);
        }

        if (!to.incomingFriendRequests.includes(fromDisplayName)) {
            to.incomingFriendRequests.push(fromDisplayName);
        }

        this.saveUsers(users);
    }

    getIncomingFriendRequests(display_name: string): MockUser[] {
        const users = this.getStoredUsers();
        const me = users.find(u => u.display_name === display_name);
        if (!me || !me.incomingFriendRequests || me.incomingFriendRequests.length === 0) {
            return [];
        }
        return me.incomingFriendRequests
            .map(name => users.find(u => u.display_name === name))
            .filter((u): u is MockUser => !!u);
    }

    getOutgoingFriendRequests(display_name: string): MockUser[] {
        const users = this.getStoredUsers();
        const me = users.find(u => u.display_name === display_name);
        if (!me || !me.outgoingFriendRequests || me.outgoingFriendRequests.length === 0) {
            return [];
        }
        return me.outgoingFriendRequests
            .map(name => users.find(u => u.display_name === name))
            .filter((u): u is MockUser => !!u);
    }

    acceptFriendRequest(currentDisplayName: string, fromDisplayName: string) {
        if (currentDisplayName === fromDisplayName) return;

        const users = this.getStoredUsers();
        const me = users.find(u => u.display_name === currentDisplayName);
        const from = users.find(u => u.display_name === fromDisplayName);

        if (!me || !from) return;

        if (me.incomingFriendRequests) {
            me.incomingFriendRequests = me.incomingFriendRequests.filter(name => name !== fromDisplayName);
        }
        if (from.outgoingFriendRequests) {
            from.outgoingFriendRequests = from.outgoingFriendRequests.filter(name => name !== currentDisplayName);
        }

        if (!me.friends) me.friends = [];
        if (!from.friends) from.friends = [];

        if (!me.friends.includes(fromDisplayName)) {
            me.friends.push(fromDisplayName);
        }
        if (!from.friends.includes(currentDisplayName)) {
            from.friends.push(currentDisplayName);
        }

        this.saveUsers(users);
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
        if (!user.friends) {
            user.friends = [];
        }
        if (!user.incomingFriendRequests) {
            user.incomingFriendRequests = [];
        }
        if (!user.outgoingFriendRequests) {
            user.outgoingFriendRequests = [];
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

    updateDisplayName(newDisplayName: string): string | null {
        const current = this.data();
        if (!current) {
            return 'User is not logged in';
        }

        const trimmed = newDisplayName.trim();
        if (!trimmed) {
            return 'กรุณากรอกชื่อ';
        }

        const oldDisplayName = current.display_name;
        if (trimmed === oldDisplayName) {
            return null;
        }

        const users = this.getStoredUsers();
        const existing = users.find(u => u.display_name === trimmed);
        if (existing && existing.username !== users.find(u => u.display_name === oldDisplayName)?.username) {
            return 'ชื่อนี้ถูกใช้แล้ว กรุณาใช้ชื่ออื่น';
        }

        const updatedPassport: Passport = {
            ...current,
            display_name: trimmed
        };

        this.data.set(updatedPassport);
        localStorage.setItem('passport', JSON.stringify(updatedPassport));

        const updatedUsers = users.map(user => {
            const updatedUser: MockUser = { ...user };

            if (user.display_name === oldDisplayName) {
                updatedUser.display_name = trimmed;
            }

            if (updatedUser.friends && updatedUser.friends.length > 0) {
                updatedUser.friends = updatedUser.friends.map(name => name === oldDisplayName ? trimmed : name);
            }

            if (updatedUser.incomingFriendRequests && updatedUser.incomingFriendRequests.length > 0) {
                updatedUser.incomingFriendRequests = updatedUser.incomingFriendRequests.map(name => name === oldDisplayName ? trimmed : name);
            }

            if (updatedUser.outgoingFriendRequests && updatedUser.outgoingFriendRequests.length > 0) {
                updatedUser.outgoingFriendRequests = updatedUser.outgoingFriendRequests.map(name => name === oldDisplayName ? trimmed : name);
            }

            return updatedUser;
        });

        this.saveUsers(updatedUsers);

        const migrateMissions = (key: string) => {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return;
                parsed.forEach((m: any) => {
                    if (m.chief === oldDisplayName) {
                        m.chief = trimmed;
                    }
                    if (Array.isArray(m.crew_members)) {
                        m.crew_members = m.crew_members.map((name: string) => name === oldDisplayName ? trimmed : name);
                    }
                    if (Array.isArray(m.pending_members)) {
                        m.pending_members = m.pending_members.map((name: string) => name === oldDisplayName ? trimmed : name);
                    }
                });
                localStorage.setItem(key, JSON.stringify(parsed));
            } catch {
            }
        };

        migrateMissions('missions_data');
        migrateMissions('missions_history');

        const prefix = 'kyosor_stats_';
        const oldStatsKey = prefix + oldDisplayName;
        const newStatsKey = prefix + trimmed;
        const oldStats = localStorage.getItem(oldStatsKey);
        if (oldStats && !localStorage.getItem(newStatsKey)) {
            localStorage.setItem(newStatsKey, oldStats);
            localStorage.removeItem(oldStatsKey);
        }

        return null;
    }

    changePassword(currentEmail: string, newPassword: string): string | null {
        const current = this.data();
        if (!current) {
            return 'User is not logged in';
        }

        const trimmedEmail = (currentEmail || '').trim().toLowerCase();
        if (!trimmedEmail) {
            return 'กรุณากรอกอีเมลปัจจุบัน';
        }

        const users = this.getStoredUsers();
        const user = users.find(u => u.display_name === current.display_name);
        if (!user) {
            return 'ไม่พบผู้ใช้ในระบบ';
        }

        const expectedEmail = (current.email || user.email || user.username || '').trim().toLowerCase();
        if (!expectedEmail || trimmedEmail !== expectedEmail) {
            return 'อีเมลไม่ตรงกับที่ใช้อยู่';
        }

        user.password = newPassword;
        this.saveUsers(users);
        return null;
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
