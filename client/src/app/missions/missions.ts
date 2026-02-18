import { Component, OnInit, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

declare var THREE: any;
import { FormsModule } from '@angular/forms';
import { PassportService } from '../_services/passport-service';
import { BackgroundService } from '../_services/background-service';
import { KyosorService } from '../_services/kyosor-service';

export interface Mission {
  id: number;
  name: string;
  description: string;
  status: 'Open' | 'InProgress' | 'Completed';
  chief_id: number;
  chief?: string;
  crew_count: number;
  crew_members?: string[];
  max_crew: number;
  allow_join?: boolean;
  mission_date?: Date;
  created_at: Date;
  updated_at: Date;
  email?: string;
  phone?: string;
  location?: string;
  rewards?: string[];
}

export interface MissionFilter {
  name?: string;
  status?: string;
}

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './missions.html',
  styleUrl: './missions.scss',
})
export class Missions implements OnInit, OnDestroy {
  platformId = inject(PLATFORM_ID);
  private backgroundService = inject(BackgroundService);
  private route = inject(ActivatedRoute);
  defaultMaxCrewPerMission = 5;
  
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

  private passportService = inject(PassportService);
  private kyosorService = inject(KyosorService);
  filter: MissionFilter = {}
  missions: Mission[] = []
  filteredMissions: Mission[] = []
  isLoading = false
  errorMsg = ''
  searchTerm: string = ''
  statusFilter: string = ''
  expandedMissionId: number | null = null
  viewMode: 'all' | 'my' = 'all'

  // ... (existing code)

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

  // Create Mission Form State
  showCreateForm = false
  newMission: Partial<Mission> = {
    name: '',
    description: '',
    email: '',
    phone: '',
    location: '',
    mission_date: undefined,
    rewards: [],
    crew_members: [],
    crew_count: 0,
    max_crew: 5,
    allow_join: true
  }

  availableRewards = [
    'น้ำดื่ม',
    'คูปองอาหาร',
    'ของที่ระลึก',
    'ประกาศนียบัตร'
  ]

  get currentUserName(): string {
    return this.passportService.data()?.display_name || 'Anonymous';
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm
    if (!this.showCreateForm) {
      this.resetNewMission()
    }
  }

  resetNewMission() {
    this.newMission = {
      name: '',
      description: '',
      email: '',
      phone: '',
      location: '',
      mission_date: undefined,
      rewards: [],
      crew_members: [],
      crew_count: 0,
      max_crew: 5,
      allow_join: true
    }
  }

  toggleReward(reward: string) {
    const rewards = this.newMission.rewards || []
    if (rewards.includes(reward)) {
      this.newMission.rewards = rewards.filter(r => r !== reward)
    } else {
      this.newMission.rewards = [...rewards, reward]
    }
  }

  addMission() {
    if (!this.newMission.name || !this.newMission.description || !this.newMission.mission_date) {
      alert('กรุณากรอกชื่อ รายละเอียดภารกิจ และวันที่')
      return
    }
    if (!this.newMission.max_crew || this.newMission.max_crew <= 0) {
      alert('กรุณาระบุจำนวนคนสูงสุดของภารกิจให้ถูกต้อง')
      return
    }

    const mission: Mission = {
      id: this.missions.length + 1,
      name: this.newMission.name!,
      description: this.newMission.description!,
      status: 'Open',
      chief_id: 99, // Current user ID placeholder
      chief: this.currentUserName,
      crew_count: 0,
      crew_members: [],
      max_crew: this.newMission.max_crew,
      allow_join: true,
      mission_date: new Date(this.newMission.mission_date),
      created_at: new Date(),
      updated_at: new Date(),
      email: this.newMission.email,
      phone: this.newMission.phone,
      location: this.newMission.location,
      rewards: this.newMission.rewards
    }

    this.missions = [mission, ...this.missions]
    this.filterMissions()
    this.toggleCreateForm()
    console.log('New mission added:', mission)
  }

  // Chief names mapping
  chiefNames: { [key: number]: string } = {
    1: 'Alex Johnson',
    2: 'Sarah Williams',
    3: 'Michael Chen',
    4: 'Emma Davis',
    5: 'James Wilson',
    6: 'Lisa Anderson',
    7: 'David Martinez',
    8: 'Nicole Taylor',
    9: 'Robert Brown',
    10: 'Jessica Miller'
  }

  // Sample missions data
  sampleMissions: Mission[] = [
    {
      id: 1,
      name: 'ajs',
      description: 'Alpha Juliet Sierra',
      status: 'Open',
      chief_id: 1,
      chief: 'Alex Johnson',
      crew_count: 5,
      crew_members: ['Player One', 'Crimson Fox', 'Silent Wave', 'Night Owl', 'Silver Arrow'],
      max_crew: 5,
      mission_date: new Date('2025-10-25'),
      created_at: new Date('2025-10-21T08:03'),
      updated_at: new Date('2025-10-21T08:03'),
      email: 'alex.j@example.com',
      phone: '081-234-5678',
      location: 'Central Plaza, Bangkok',
      rewards: ['ตั๋วอาหาร', 'น้ำดื่ม'],
      allow_join: false
    },
    {
      id: 2,
      name: 'tre',
      description: 'Training exercise',
      status: 'Open',
      chief_id: 2,
      chief: 'Sarah Williams',
      crew_count: 0,
      crew_members: [],
      max_crew: 4,
      mission_date: new Date('2025-10-26'),
      created_at: new Date('2025-10-21T06:23'),
      updated_at: new Date('2025-10-21T06:23'),
      email: 'sarah.w@example.com',
      phone: '082-345-6789',
      location: 'Siam Square, Bangkok',
      rewards: ['น้ำดื่ม'],
      allow_join: true
    },
    {
      id: 3,
      name: 'lkm',
      description: 'Logistics management',
      status: 'Open',
      chief_id: 3,
      chief: 'Michael Chen',
      crew_count: 0,
      crew_members: [],
      max_crew: 6,
      mission_date: new Date('2025-10-27'),
      created_at: new Date('2025-10-21T06:22'),
      updated_at: new Date('2025-10-21T06:22'),
      email: 'michael.c@example.com',
      phone: '083-456-7890',
      location: 'Sukhumvit Soi 11, Bangkok',
      rewards: ['ตั๋วอาหาร', 'น้ำดื่ม'],
      allow_join: true
    },
    {
      id: 4,
      name: 'bnw',
      description: 'Brawler new world',
      status: 'Open',
      chief_id: 4,
      chief: 'Emma Davis',
      crew_count: 0,
      crew_members: [],
      max_crew: 5,
      mission_date: new Date('2025-10-28'),
      created_at: new Date('2025-10-21T06:21'),
      updated_at: new Date('2025-10-21T06:21'),
      email: 'emma.d@example.com',
      phone: '084-567-8901',
      location: 'Chatuchak Park, Bangkok',
      rewards: ['น้ำดื่ม'],
      allow_join: true
    },
    {
      id: 5,
      name: 'bbb',
      description: 'Blitz battle bonanza',
      status: 'Open',
      chief_id: 5,
      chief: 'James Wilson',
      crew_count: 0,
      crew_members: [],
      max_crew: 8,
      mission_date: new Date('2025-10-29'),
      created_at: new Date('2025-10-21T06:09'),
      updated_at: new Date('2025-10-21T06:09'),
      email: 'james.w@example.com',
      phone: '085-678-9012',
      location: 'Lumpini Park, Bangkok',
      rewards: ['ตั๋วอาหาร', 'น้ำดื่ม'],
      allow_join: false
    },
    {
      id: 6,
      name: 'aaa',
      description: 'Awesome adventure awaits',
      status: 'Open',
      chief_id: 6,
      chief: 'Lisa Anderson',
      crew_count: 0,
      crew_members: [],
      max_crew: 10,
      mission_date: new Date('2025-10-30'),
      created_at: new Date('2025-10-21T06:06'),
      updated_at: new Date('2025-10-21T06:06'),
      email: 'lisa.a@example.com',
      phone: '086-789-0123',
      location: 'Icon Siam, Bangkok',
      rewards: ['ตั๋วอาหาร'],
      allow_join: true
    },
    {
      id: 7,
      name: 'crystal-quest',
      description: 'Find the legendary crystal',
      status: 'Open',
      chief_id: 7,
      chief: 'David Martinez',
      crew_count: 2,
      crew_members: ['Sky Wanderer', 'Iron Heart'],
      max_crew: 6,
      mission_date: new Date('2025-10-20'),
      created_at: new Date('2025-10-20T10:15'),
      updated_at: new Date('2025-10-20T10:15'),
      email: 'david.m@example.com',
      phone: '087-890-1234',
      location: 'Grand Palace, Bangkok',
      rewards: ['ตั๋วอาหาร', 'เข็มกลัดที่ระลึก'],
      allow_join: true
    },
    {
      id: 8,
      name: 'shadow-hunt',
      description: 'Eliminate the shadow creatures',
      status: 'Open',
      chief_id: 8,
      chief: 'Nicole Taylor',
      crew_count: 5,
      crew_members: ['Aurora', 'Shadow Wolf', 'Neon Rider', 'Star Runner', 'Blue Comet'],
      max_crew: 5,
      mission_date: new Date('2025-10-19'),
      created_at: new Date('2025-10-19T14:30'),
      updated_at: new Date('2025-10-21T08:00'),
      email: 'nicole.t@example.com',
      phone: '088-901-2345',
      location: 'Wat Arun, Bangkok',
      rewards: ['ตั๋วอาหาร', 'น้ำดื่ม'],
      allow_join: true
    },
    {
      id: 9,
      name: 'dragon-slayer',
      description: 'Face the ancient dragon',
      status: 'Open',
      chief_id: 9,
      chief: 'Robert Brown',
      crew_count: 1,
      crew_members: ['Lone Dragon'],
      max_crew: 3,
      mission_date: new Date('2025-10-18'),
      created_at: new Date('2025-10-18T09:45'),
      updated_at: new Date('2025-10-18T09:45'),
      email: 'robert.b@example.com',
      phone: '089-012-3456',
      location: 'Khao San Road, Bangkok',
      rewards: ['ประกาศนียบัตร', 'น้ำดื่ม'],
      allow_join: true
    },
    {
      id: 10,
      name: 'realm-defense',
      description: 'Defend the kingdom from invaders',
      status: 'Open',
      chief_id: 10,
      chief: 'Jessica Miller',
      crew_count: 3,
      crew_members: ['Vanguard', 'Echo Blade', 'Crystal Wind'],
      max_crew: 5,
      mission_date: new Date('2025-10-17'),
      created_at: new Date('2025-10-17T16:20'),
      updated_at: new Date('2025-10-17T16:20'),
      email: 'jessica.m@example.com',
      phone: '090-123-4567',
      location: 'Asiatique, Bangkok',
      rewards: ['น้ำดื่ม'],
      allow_join: true
    }
  ]

  ngOnInit() {
    this.setViewModeFromRoute();
    this.loadMissions();
  }

  ngOnDestroy() {
    // No local cleanup needed for background anymore as it's global
  }



  async loadMissions() {
    try {
      this.isLoading = true;
      this.errorMsg = '';
      this.missions = this.sampleMissions.map(m => {
        const crewMembers = m.crew_members || [];
        const maxCrew = m.max_crew || this.defaultMaxCrewPerMission;
        return {
          ...m,
          crew_members: crewMembers,
          crew_count: crewMembers.length,
          max_crew: maxCrew,
          status: m.status || 'Open',
          allow_join: m.allow_join ?? true,
        };
      });
      this.filterMissions();
    } catch (error: any) {
      console.error('Error loading missions:', error);
      this.errorMsg = error?.error?.message || 'Failed to load missions';
    } finally {
      this.isLoading = false;
    }
  }

  setViewModeFromRoute() {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === 'my-missions') {
      this.setViewMode('my');
    } else {
      this.setViewMode('all');
    }
  }

  filterMissions() {
    let filtered = [...this.missions]

    if (this.viewMode === 'my') {
      const userName = this.currentUserName;
      filtered = filtered.filter(mission =>
        mission.chief === userName ||
        mission.crew_members?.includes(userName)
      );
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(mission =>
        mission.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (this.statusFilter) {
      filtered = filtered.filter(mission => mission.status === this.statusFilter)
    }

    this.filteredMissions = filtered
  }

  setViewMode(mode: 'all' | 'my') {
    this.viewMode = mode
    this.expandedMissionId = null
    this.filterMissions()
  }

  onSearchChange() {
    this.filterMissions()
  }

  async onSubmit() {
    this.filterMissions()
  }

  joinMission(mission: Mission) {
    if (mission.status !== 'Open') return;
    if (mission.allow_join === false) {
      alert('ภารกิจนี้ไม่เปิดให้เข้าร่วม');
      return;
    }
    if (!mission.crew_members) {
      mission.crew_members = [];
    }
    const maxCrew = mission.max_crew || this.defaultMaxCrewPerMission;
    if (mission.crew_members.length >= maxCrew) {
      alert(`ภารกิจนี้มีลูกเรือครบแล้ว (${mission.crew_members.length} / ${maxCrew})`);
      return;
    }
    if (mission.crew_members.includes(this.currentUserName)) {
      alert('คุณได้เข้าร่วมภารกิจนี้แล้ว');
      return;
    }
    mission.crew_members.push(this.currentUserName);
    mission.crew_count = mission.crew_members.length;
    mission.status = 'InProgress';
    mission.updated_at = new Date();

    this.kyosorService.addHours('internal', 0, {
      id: mission.id,
      name: mission.name,
      date: mission.mission_date || new Date(),
      status: 'InProgress',
      isFinished: false
    });

    this.filterMissions();
  }

  cancelMission(mission: Mission) {
    if (mission.status === 'Open') return;
    
    if (confirm(`คุณต้องการยกเลิกภารกิจ ${mission.name} ใช่หรือไม่?`)) {
      if (mission.crew_members && mission.crew_members.length > 0) {
        mission.crew_members = mission.crew_members.filter(name => name !== this.currentUserName);
      }
      mission.crew_count = Math.max(0, mission.crew_members ? mission.crew_members.length : mission.crew_count - 1);
      if (mission.crew_count === 0) {
        mission.status = 'Open';
      }
      mission.updated_at = new Date();
      this.filterMissions();
      console.log('Mission cancelled:', mission.name);
    }
  }

  finishMission(mission: Mission) {
    if (mission.chief !== this.currentUserName) {
      alert('มีเพียงผู้สร้างภารกิจเท่านั้นที่สามารถกด Finish ได้');
      return;
    }
    mission.status = 'Completed';
    mission.allow_join = false;
    mission.updated_at = new Date();

    this.kyosorService.addHours('internal', 3, {
      id: mission.id,
      name: mission.name,
      date: mission.mission_date || new Date(),
      status: 'Completed',
      isFinished: true
    });

    this.filterMissions();
    console.log('Mission finished:', mission.name);
  }

  viewDetail(mission: Mission) {
    if (this.expandedMissionId === mission.id) {
      this.expandedMissionId = null;
    } else {
      this.expandedMissionId = mission.id;
    }
    console.log('Toggled detail for mission:', mission.name, 'Expanded:', this.expandedMissionId);
  }
}
