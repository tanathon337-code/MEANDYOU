import { Component, OnInit, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  pending_members?: string[];
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
  imports: [CommonModule, FormsModule, RouterLink],
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
  historyMissions: Mission[] = []
  filteredMissions: Mission[] = []
  isLoading = false
  errorMsg = ''
  searchTerm: string = ''
  statusFilter: string = ''
  expandedMissionId: number | null = null
  viewMode: 'all' | 'my' | 'history' = 'all'
  private readonly STORAGE_KEY = 'missions_data'
  private readonly HISTORY_KEY = 'missions_history'

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

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    input.value = digits;
    this.newMission.phone = digits;
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

  getMemberAvatar(displayName: string): string | undefined {
    const user = this.passportService.findUserByDisplayName(displayName);
    return user?.avatar_url;
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

  private getStorageKey(): string {
    return this.STORAGE_KEY
  }

  private getHistoryKey(): string {
    return this.HISTORY_KEY
  }

  private saveMissions() {
    const serialized = this.missions.map(m => ({
      ...m,
      mission_date: m.mission_date ? m.mission_date.toISOString() : null,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString()
    }))
    localStorage.setItem(this.getStorageKey(), JSON.stringify(serialized))
  }

  private saveHistory(missions: Mission[]) {
    const serialized = missions.map(m => ({
      ...m,
      mission_date: m.mission_date ? m.mission_date.toISOString() : null,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString()
    }))
    localStorage.setItem(this.getHistoryKey(), JSON.stringify(serialized))
  }

  private loadMissionsFromStorage(): Mission[] | null {
    const raw = localStorage.getItem(this.getStorageKey())
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as any[]
      return parsed.map(p => ({
        ...p,
        mission_date: p.mission_date ? new Date(p.mission_date) : undefined,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at)
      }))
    } catch {
      return null
    }
  }

  private loadHistoryFromStorage(): Mission[] | null {
    const raw = localStorage.getItem(this.getHistoryKey())
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as any[]
      return parsed.map(p => ({
        ...p,
        mission_date: p.mission_date ? new Date(p.mission_date) : undefined,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at)
      }))
    } catch {
      return null
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

    const missionDate = new Date(this.newMission.mission_date);
    const today = new Date();
    const isSameDay =
      missionDate.getFullYear() === today.getFullYear() &&
      missionDate.getMonth() === today.getMonth() &&
      missionDate.getDate() === today.getDate();

    if (isSameDay) {
      const confirmed = confirm('คุณกำลังสร้างภารกิจที่ต้องทำในวันนี้เลย ต้องการสร้างภารกิจนี้ใช่หรือไม่?');
      if (!confirmed) {
        return;
      }
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
      pending_members: [],
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
    this.kyosorService.addHours('internal', 0, {
      id: mission.id,
      name: mission.name,
      date: mission.mission_date || new Date(),
      status: 'InProgress',
      isFinished: false
    })
    this.saveMissions()
    this.filterMissions()
    this.toggleCreateForm()
    console.log('New mission added:', mission)
  }


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
      const stored = this.loadMissionsFromStorage();
      const allUsers = this.passportService.getAllUsers();
      const userNames = new Set(allUsers.map(u => u.display_name));
      const source = (stored && stored.length ? stored : []).filter(m =>
        m.chief && userNames.has(m.chief)
      );
      this.missions = source.map(m => {
        const crewMembers = m.crew_members || [];
        const maxCrew = m.max_crew || this.defaultMaxCrewPerMission;
        return {
          ...m,
          crew_members: crewMembers,
          pending_members: m.pending_members || [],
          crew_count: crewMembers.length,
          max_crew: maxCrew,
          status: m.status || 'Open',
          allow_join: m.allow_join ?? true,
        };
      });
      const historyStored = this.loadHistoryFromStorage();
      const historySource = (historyStored && historyStored.length ? historyStored : []).filter(m =>
        m.chief && userNames.has(m.chief)
      );
      this.historyMissions = historySource;
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
    } else if (path === 'history') {
      this.setViewMode('history');
    } else {
      this.setViewMode('all');
    }
  }

  filterMissions() {
    const source = this.viewMode === 'history' ? this.historyMissions : this.missions
    let filtered = [...source]

    if (this.viewMode === 'my' || this.viewMode === 'history') {
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

    // Filter by status (use the same key as display badge)
    if (this.statusFilter) {
      filtered = filtered.filter(mission => this.getMissionStatusKey(mission) === this.statusFilter)
    }

    this.filteredMissions = filtered
  }

  setViewMode(mode: 'all' | 'my' | 'history') {
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

  getMissionStatusKey(mission: Mission): string {
    if (mission.chief === this.currentUserName) {
      return mission.status
    }
    if (mission.crew_members?.includes(this.currentUserName)) {
      return 'Completed'
    }
    return mission.status
  }

  getMissionStatusLabel(mission: Mission): string {
    const key = this.getMissionStatusKey(mission)
    if (key === 'Open') {
      return 'Open'
    }
    if (key === 'InProgress') {
      return 'In Progress'
    }
    if (key === 'Completed') {
      return 'Completed'
    }
    return key
  }

  removeMember(mission: Mission, memberName: string) {
    if (mission.chief !== this.currentUserName) {
      return;
    }
    if (!mission.crew_members || !mission.crew_members.includes(memberName)) {
      return;
    }
    if (!confirm(`คุณต้องการไล่ ${memberName} ออกจากภารกิจนี้หรือไม่?`)) {
      return;
    }
    mission.crew_members = mission.crew_members.filter(name => name !== memberName);
    mission.crew_count = mission.crew_members.length;
    mission.updated_at = new Date();
    this.saveMissions();
    this.filterMissions();
  }

  joinMission(mission: Mission) {
    if (mission.status !== 'Open') return;
    if (mission.chief === this.currentUserName) {
      alert('คุณไม่สามารถเข้าร่วมภารกิจที่คุณสร้างเองได้');
      return;
    }
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
    mission.updated_at = new Date();

    this.kyosorService.addHours('internal', 0, {
      id: mission.id,
      name: mission.name,
      date: mission.mission_date || new Date(),
      status: 'InProgress',
      isFinished: false
    });

    this.saveMissions();
    this.filterMissions();
  }

  cancelMission(mission: Mission) {
    const isPending = mission.pending_members?.includes(this.currentUserName) ?? false;
    const isCrew = mission.crew_members?.includes(this.currentUserName) ?? false;
    if (!isPending && !isCrew) return;

    if (!confirm(`คุณต้องการยกเลิกการเข้าร่วมภารกิจ ${mission.name} ใช่หรือไม่?`)) {
      return;
    }

    if (isPending && mission.pending_members) {
      mission.pending_members = mission.pending_members.filter(name => name !== this.currentUserName);
    }

    if (isCrew && mission.crew_members) {
      mission.crew_members = mission.crew_members.filter(name => name !== this.currentUserName);
      mission.crew_count = mission.crew_members.length;
    }

    this.kyosorService.removeHours('internal', 0, mission.id);

    mission.updated_at = new Date();
    this.saveMissions();
    this.filterMissions();
    console.log('Mission cancelled:', mission.name);
  }

  cancelOwnedMission(mission: Mission) {
    if (mission.chief !== this.currentUserName) {
      return;
    }
    if (!confirm(`คุณต้องการยกเลิกภารกิจที่คุณสร้างเอง: ${mission.name} ใช่หรือไม่?`)) {
      return;
    }
    this.kyosorService.removeHours('internal', 0, mission.id);
    this.missions = this.missions.filter(m => m.id !== mission.id);
    this.saveMissions();
    this.filterMissions();
    console.log('Owned mission cancelled and removed:', mission.name);
  }

  finishMission(mission: Mission) {
    if (mission.chief !== this.currentUserName) {
      alert('มีเพียงผู้สร้างภารกิจเท่านั้นที่สามารถกด Finish ได้');
      return;
    }
    mission.status = 'Completed';
    mission.allow_join = false;
    mission.updated_at = new Date();

    const historyEntry: Mission = {
      ...mission,
      status: 'Completed',
      allow_join: false,
      updated_at: new Date()
    }
    const existingHistory = this.loadHistoryFromStorage() || []
    const filteredHistory = existingHistory.filter(m => m.id !== historyEntry.id)
    const newHistory = [historyEntry, ...filteredHistory]
    this.historyMissions = newHistory
    this.saveHistory(newHistory)

    this.kyosorService.addHours('internal', 3, {
      id: mission.id,
      name: mission.name,
      date: mission.mission_date || new Date(),
      status: 'Completed',
      isFinished: true
    });

    this.missions = this.missions.filter(m => m.id !== mission.id);
    this.saveMissions();
    this.filterMissions();
    console.log('Mission finished and removed:', mission.name);
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
