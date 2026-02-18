import { Component, OnInit, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BackgroundService } from '../_services/background-service';
import { KyosorService, MissionHistory } from '../_services/kyosor-service';
import { PassportService } from '../_services/passport-service';

declare var THREE: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  platformId = inject(PLATFORM_ID);
  private backgroundService = inject(BackgroundService);
  private kyosorService = inject(KyosorService);
  private passportService = inject(PassportService);
  
  showAdjuster = false;
  showBgSelector = false;
  colors = this.backgroundService.colors();
  schemes = [
    ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F7FFF7', '#FF9F1C'],
    ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7', '#ecf0f1'],
    ['#e74c3c', '#c0392b', '#d35400', '#e67e22', '#f39c12', '#f1c40f'],
    ['#8e44ad', '#9b59b6', '#2980b9', '#3498db', '#1abc9c', '#16a085'],
    ['#27ae60', '#2ecc71', '#f1c40f', '#f39c12', '#e67e22', '#e74c3c'],
    ['#ffffff', '#f5f5f5', '#e0e0e0', '#f5f5f5', '#ffffff', '#e0e0e0']
  ];

  currentMonth = new Date();
  calendarDays: { date: Date | null; day: number | null; missions: MissionHistory[] }[] = [];
  recommendedMissions: { id: number; name: string; description: string; location?: string; tag: string }[] = [];

  ngOnInit() {
    this.buildCalendar();
    this.loadRecommendedMissions();
  }

  ngOnDestroy() {
    // No local cleanup needed
  }

  toggleBgSelector() {
    this.showBgSelector = !this.showBgSelector;
  }

  toggleAdjuster() {
    this.showAdjuster = !this.showAdjuster;
  }

  setScheme(index: number) {
    this.colors = [...this.schemes[index]];
    this.updateMaterialColors();
    
    if (isPlatformBrowser(this.platformId)) {
      const buttons = document.querySelectorAll('.background-thumb.preset');
      buttons.forEach((btn, i) => {
        if (i === index) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  }

  updateColor(index: number, event: any) {
    this.colors[index] = event.target.value;
    this.updateMaterialColors();
  }

  updateMaterialColors() {
    this.backgroundService.updateColors(this.colors);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied: ' + text);
  }

  exportColors() {
    const text = this.colors.join(', ');
    navigator.clipboard.writeText(text);
    alert('Exported all colors to clipboard!');
  }

  private loadRecommendedMissions() {
    if (!isPlatformBrowser(this.platformId)) {
      this.recommendedMissions = [];
      return;
    }
    const raw = localStorage.getItem('missions_data');
    if (!raw) {
      this.recommendedMissions = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw) as any[];
      const allUsers = this.passportService.getAllUsers();
      const userNames = new Set(allUsers.map(u => u.display_name));
      const validMissions = parsed.filter(m => m && m.chief && userNames.has(m.chief));
      const sorted = validMissions
        .map(m => ({
          ...m,
          created_at: m.created_at ? new Date(m.created_at) : new Date()
        }))
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      const top = sorted.slice(0, 3);
      this.recommendedMissions = top.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        location: m.location,
        tag: m.status || 'Open'
      }));
    } catch {
      this.recommendedMissions = [];
    }
  }

  get currentMonthLabel(): string {
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear() + 543}`;
  }

  buildCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const history = this.kyosorService
      .stats()
      .history
      .filter(h => h.name?.toLowerCase() !== 'bnw');

    const days: { date: Date | null; day: number | null; missions: MissionHistory[] }[] = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push({ date: null, day: null, missions: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const missions = history.filter(h => {
        const hd = new Date(h.date);
        return hd.getFullYear() === year && hd.getMonth() === month && hd.getDate() === d;
      });
      days.push({ date, day: d, missions });
    }

    this.calendarDays = days;
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }
}
