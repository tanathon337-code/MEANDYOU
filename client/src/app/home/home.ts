import { Component, OnInit, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BackgroundService } from '../_services/background-service';

declare var THREE: any;

interface UniversityEvent {
  id: number;
  name: string;
  university: string;
  date: Date;
  description: string;
  type: 'academic' | 'festival' | 'sports' | 'other';
  location: string;
}

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

  // Calendar properties
  currentDate = new Date();
  calendarDays: any[] = [];
  monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  // Mockup University Events
  universityEvents: UniversityEvent[] = [
    {
      id: 1,
      name: 'งานเกษตรแฟร์ 2569',
      university: 'มหาวิทยาลัยเกษตรศาสตร์',
      date: new Date(2026, 1, 2), // Feb 2, 2026
      description: 'งานแสดงสินค้าเกษตรและเทคโนโลยีที่ใหญ่ที่สุด',
      type: 'festival',
      location: 'วิทยาเขตบางเขน'
    },
    {
      id: 2,
      name: 'TU Open House 2026',
      university: 'มหาวิทยาลัยธรรมศาสตร์',
      date: new Date(2026, 1, 15), // Feb 15, 2026
      description: 'เปิดบ้านแนะนำคณะและหลักสูตรการศึกษา',
      type: 'academic',
      location: 'ศูนย์รังสิต'
    },
    {
      id: 3,
      name: 'CU-TU Traditional Football',
      university: 'จุฬาฯ - ธรรมศาสตร์',
      date: new Date(2026, 1, 20), // Feb 20, 2026
      description: 'งานฟุตบอลประเพณี จุฬาฯ-ธรรมศาสตร์ ครั้งที่ 76',
      type: 'sports',
      location: 'สนามศุภชลาศัย'
    },
    {
      id: 4,
      name: 'Mahidol Open House',
      university: 'มหาวิทยาลัยมหิดล',
      date: new Date(2026, 2, 10), // March 10, 2026
      description: 'กิจกรรมแนะแนวการศึกษาต่อมหาวิทยาลัยมหิดล',
      type: 'academic',
      location: 'วิทยาเขตศาลายา'
    },
    {
      id: 5,
      name: 'งานลอยกระทงจุฬาฯ',
      university: 'จุฬาลงกรณ์มหาวิทยาลัย',
      date: new Date(2026, 10, 24), // Nov 24, 2026
      description: 'งานเทศกาลลอยกระทงรอบสระน้ำจุฬาฯ',
      type: 'festival',
      location: 'สระน้ำจุฬาฯ'
    },
    {
      id: 6,
      name: 'รับน้องขึ้นดอย 2569',
      university: 'มหาวิทยาลัยเชียงใหม่',
      date: new Date(2026, 6, 5), // July 5, 2026
      description: 'ประเพณีรับน้องขึ้นดอยไปนมัสการพระธาตุดอยสุเทพ',
      type: 'festival',
      location: 'มหาวิทยาลัยเชียงใหม่'
    }
  ];

  ngOnInit() {
    this.generateCalendar();
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

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDay = firstDayOfMonth.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, events: [] });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = new Date(year, month, i).toDateString();
      const eventsOnDay = this.universityEvents.filter(event => {
        return new Date(event.date).toDateString() === dateStr;
      });
      
      days.push({
        day: i,
        isToday: i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(),
        events: eventsOnDay
      });
    }
    
    this.calendarDays = days;
  }

  changeMonth(delta: number) {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    this.generateCalendar();
  }

  getEventTypeColor(type: string): string {
    switch (type) {
      case 'academic': return '#1890ff';
      case 'festival': return '#eb2f96';
      case 'sports': return '#52c41a';
      default: return '#722ed1';
    }
  }
}
