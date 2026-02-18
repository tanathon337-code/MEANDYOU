import { Injectable, signal } from '@angular/core';

export interface MissionHistory {
  id: number;
  name: string;
  hours: number;
  type: 'internal' | 'external';
  date: Date;
  status?: 'InProgress' | 'Completed';
  isFinished?: boolean;
}

export interface KyosorStats {
  internal: number;
  external: number;
  total: number;
  history: MissionHistory[];
}

@Injectable({
  providedIn: 'root'
})
export class KyosorService {
  private readonly STORAGE_KEY = 'kyosor_stats_';
  stats = signal<KyosorStats>({ internal: 0, external: 0, total: 0, history: [] });

  constructor() {
    this.loadStats();
  }

  private getUserKey(): string {
    const passport = localStorage.getItem('passport');
    if (passport) {
      const data = JSON.parse(passport);
      return data.display_name || 'guest';
    }
    return 'guest';
  }

  loadStats() {
    const key = this.STORAGE_KEY + this.getUserKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.history) parsed.history = [];
      parsed.history = parsed.history.map((h: any) => ({
        ...h,
        date: h.date ? new Date(h.date) : new Date()
      }));
      this.stats.set(parsed);
    } else {
      this.stats.set({ internal: 0, external: 0, total: 0, history: [] });
    }
  }

  addHours(type: 'internal' | 'external', hours: number, missionInfo?: { id: number, name: string, date?: Date, status?: 'InProgress' | 'Completed', isFinished?: boolean }) {
    const current = this.stats();
    const updated = { ...current };
    
    // เพิ่มชั่วโมงเฉพาะเมื่อมีการยืนยันว่า Finished หรือสถานะเป็น Completed (ที่มาจาก finishMission)
    if (missionInfo?.isFinished) {
      if (type === 'internal') {
        updated.internal = Math.min(18, updated.internal + hours);
      } else {
        updated.external = Math.min(18, updated.external + hours);
      }
      updated.total = Math.min(36, updated.internal + updated.external);
    }
    
    if (missionInfo) {
      // Check if mission already in history to avoid duplicates
      const index = updated.history.findIndex(m => m.id === missionInfo.id);
      if (index === -1) {
        updated.history.push({
          id: missionInfo.id,
          name: missionInfo.name,
          hours: hours,
          type: type,
          date: missionInfo.date || new Date(),
          status: missionInfo.status || 'Completed',
          isFinished: missionInfo.isFinished
        });
      } else {
        // อัปเดตข้อมูลเดิมที่มีอยู่
        if (missionInfo.status) updated.history[index].status = missionInfo.status;
        if (missionInfo.isFinished) updated.history[index].isFinished = true;
        if (hours > 0) updated.history[index].hours = hours;
      }
    }
    
    this.stats.set(updated);
    this.saveStats(updated);
  }

  removeHours(type: 'internal' | 'external', hours: number, missionId?: number) {
    const current = this.stats();
    const updated = { ...current };
    
    if (type === 'internal') {
      updated.internal = Math.max(0, updated.internal - hours);
    } else {
      updated.external = Math.max(0, updated.external - hours);
    }
    
    if (missionId !== undefined) {
      updated.history = updated.history.filter(m => m.id !== missionId);
    }
    
    updated.total = updated.internal + updated.external;
    
    this.stats.set(updated);
    this.saveStats(updated);
  }

  private saveStats(stats: KyosorStats) {
    const key = this.STORAGE_KEY + this.getUserKey();
    localStorage.setItem(key, JSON.stringify(stats));
  }
}
