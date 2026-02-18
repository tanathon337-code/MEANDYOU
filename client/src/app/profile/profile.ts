import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { PassportService, MockUser } from '../_services/passport-service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { BackgroundService } from '../_services/background-service';
import { KyosorService, MissionHistory } from '../_services/kyosor-service';
import { PasswordValidator, PasswordMatchValidator } from '../_helpers/password-validator';

interface Mission {
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

declare var THREE: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  passportService = inject(PassportService);
  platformId = inject(PLATFORM_ID);
  private backgroundService = inject(BackgroundService);
  kyosorService = inject(KyosorService);
  route = inject(ActivatedRoute);
  private router = inject(Router);

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

  showHistory = false;
  showCalendar = false;
  isEditing = false;
  currentMonth = new Date();
  calendarDays: { date: Date | null; day: number | null; missions: MissionHistory[] }[] = [];
  isOwnProfile = true;
  viewUserName: string | null = null;
  viewUser: MockUser | null = null;
  friends: MockUser[] = [];
  friendMissions: { [displayName: string]: Mission[] } = {};
  availableFriends: MockUser[] = [];
  selectedFriendName = '';
  isFriendsPage = false;
  friendSearchTerm = '';
  incomingRequests: MockUser[] = [];
  outgoingRequests: MockUser[] = [];
  isChangingPassword = false;
  changePasswordForm: FormGroup;
  serverError = '';
  private passwordMinLength = 8;
  private passwordMaxLength = 10;
  
  editForm = {
    display_name: ''
  };

  educationLevels = [
    'ม.ปลาย ปี 1',
    'ม.ปลาย ปี 2',
    'ม.ปลาย ปี 3',
    'นักศึกษาปี 1',
    'นักศึกษาปี 2',
    'นักศึกษาปี 3',
    'นักศึกษาปี 4'
  ];

  constructor() {
    this.changePasswordForm = new FormGroup({
      email: new FormControl('', [Validators.required]),
      newPassword: new FormControl('', [
        Validators.required,
        PasswordValidator(this.passwordMinLength, this.passwordMaxLength)
      ]),
      cf_password: new FormControl('', [Validators.required])
    });
    this.changePasswordForm.addValidators(PasswordMatchValidator('newPassword', 'cf_password'));
  }

  ngOnInit() {
    const routePath = this.route.snapshot.routeConfig?.path;
    this.isFriendsPage = routePath === 'friends';
    const paramName = this.route.snapshot.paramMap.get('display_name');
    const current = this.currentUser;

    if (paramName && current && paramName !== current.display_name) {
      this.isOwnProfile = false;
      this.viewUserName = paramName;
      const user = this.passportService.findUserByDisplayName(paramName);
      this.viewUser = user || null;
    } else {
      this.isOwnProfile = true;
      this.viewUserName = current?.display_name || null;
      this.viewUser = null;
    }

    this.initEditForm();
    this.buildCalendar();
    this.loadFriends();
    this.loadAvailableFriends();
    this.loadFriendRequests();
  }

  ngOnDestroy() {
  }

  startChangePassword() {
    this.isChangingPassword = true;
    this.serverError = '';
    this.changePasswordForm.reset();
  }

  cancelChangePassword() {
    this.isChangingPassword = false;
    this.serverError = '';
  }

  submitChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const email = this.changePasswordForm.value.email as string;
    const newPassword = this.changePasswordForm.value.newPassword as string;
    const error = this.passportService.changePassword(email, newPassword);

    if (error) {
      this.serverError = error;
      return;
    }

    this.serverError = '';
    alert('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    this.passportService.logout();
    this.router.navigate(['/login']);
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

  get displayProfile() {
    if (this.viewUser) {
      return this.viewUser;
    }
    const current = this.currentUser;
    if (!current) return undefined;
    return {
      display_name: current.display_name,
      avatar_url: current.avatar_url,
      institution: current.institution,
      education_level: current.education_level,
      email: current.email
    };
  }

  loadFriends() {
    if (!this.viewUserName) {
      this.friends = [];
      this.friendMissions = {};
      return;
    }
    this.friends = this.passportService.getFriends(this.viewUserName);
    if (this.isFriendsPage) {
      this.loadFriendMissions();
    }
  }

  loadAvailableFriends() {
    const current = this.currentUser;
    if (!current) {
      this.availableFriends = [];
      return;
    }

    const allUsers = this.passportService.getAllUsers();
    const currentName = current.display_name;
    const currentFriends = this.passportService.getFriends(currentName).map(u => u.display_name);
    const incoming = this.passportService.getIncomingFriendRequests(currentName).map(u => u.display_name);
    const outgoing = this.passportService.getOutgoingFriendRequests(currentName).map(u => u.display_name);

    this.availableFriends = allUsers.filter(
      u =>
        u.display_name !== currentName &&
        !currentFriends.includes(u.display_name) &&
        !incoming.includes(u.display_name) &&
        !outgoing.includes(u.display_name)
    );

    if (this.availableFriends.length > 0) {
      if (!this.selectedFriendName || !this.availableFriends.some(u => u.display_name === this.selectedFriendName)) {
        this.selectedFriendName = this.availableFriends[0].display_name;
      }
    } else {
      this.selectedFriendName = '';
    }
  }

  get filteredFriends(): MockUser[] {
    const term = this.friendSearchTerm.trim().toLowerCase();
    if (!term) return this.friends;
    return this.friends.filter(f =>
      f.display_name.toLowerCase().includes(term)
    );
  }

  private parseStoredMissions(raw: string | null): Mission[] {
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as any[];
      return parsed.map(p => ({
        ...p,
        mission_date: p.mission_date ? new Date(p.mission_date) : undefined,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at)
      }));
    } catch {
      return [];
    }
  }

  private serializeMissionsForStorage(missions: Mission[]): any[] {
    return missions.map(m => ({
      ...m,
      mission_date: m.mission_date ? m.mission_date.toISOString() : null,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString()
    }));
  }

  private loadFriendMissions() {
    if (!isPlatformBrowser(this.platformId)) {
      this.friendMissions = {};
      return;
    }
    const active = this.parseStoredMissions(localStorage.getItem('missions_data'));
    const history = this.parseStoredMissions(localStorage.getItem('missions_history'));
    const all = [...active, ...history];
    const friendNames = this.friends.map(f => f.display_name);
    const map: { [name: string]: Mission[] } = {};
    for (const name of friendNames) {
      map[name] = [];
    }
    for (const mission of all) {
      for (const name of friendNames) {
        if (mission.chief === name || mission.crew_members?.includes(name)) {
          map[name].push(mission);
        }
      }
    }
    for (const name of friendNames) {
      const list = map[name];
      list.sort((a, b) => {
        const da = a.mission_date ? a.mission_date.getTime() : 0;
        const db = b.mission_date ? b.mission_date.getTime() : 0;
        return db - da;
      });
    }
    this.friendMissions = map;
  }

  getFriendMissions(friend: MockUser): Mission[] {
    return this.friendMissions[friend.display_name] || [];
  }

  canJoinFriendMission(mission: Mission): boolean {
    const current = this.currentUser;
    if (!current) return false;
    if (mission.status !== 'Open') return false;
    if (mission.chief === current.display_name) return false;
    if (mission.allow_join === false) return false;
    const crewMembers = mission.crew_members || [];
    const maxCrew = mission.max_crew || 5;
    if (crewMembers.length >= maxCrew) return false;
    if (crewMembers.includes(current.display_name)) return false;
    return true;
  }

  joinFriendMission(mission: Mission) {
    const current = this.currentUser;
    if (!current) return;
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = localStorage.getItem('missions_data');
    const missions = this.parseStoredMissions(raw);
    const index = missions.findIndex(m => m.id === mission.id);
    if (index === -1) {
      alert('ไม่พบภารกิจนี้แล้ว');
      this.loadFriendMissions();
      return;
    }
    const target = missions[index];
    const currentName = current.display_name;
    if (target.status !== 'Open') {
      alert('ภารกิจนี้ไม่เปิดให้เข้าร่วมแล้ว');
      this.loadFriendMissions();
      return;
    }
    if (target.chief === currentName) {
      alert('คุณไม่สามารถเข้าร่วมภารกิจที่คุณสร้างเองได้');
      return;
    }
    if (target.allow_join === false) {
      alert('ภารกิจนี้ไม่เปิดให้เข้าร่วม');
      return;
    }
    const crewMembers = target.crew_members || [];
    const maxCrew = target.max_crew || 5;
    if (crewMembers.length >= maxCrew) {
      alert(`ภารกิจนี้มีลูกเรือครบแล้ว (${crewMembers.length} / ${maxCrew})`);
      return;
    }
    if (crewMembers.includes(currentName)) {
      alert('คุณได้เข้าร่วมภารกิจนี้แล้ว');
      return;
    }
    crewMembers.push(currentName);
    target.crew_members = crewMembers;
    target.crew_count = crewMembers.length;
    target.updated_at = new Date();
    missions[index] = target;
    const serialized = this.serializeMissionsForStorage(missions);
    localStorage.setItem('missions_data', JSON.stringify(serialized));
    this.kyosorService.addHours('internal', 0, {
      id: target.id,
      name: target.name,
      date: target.mission_date || new Date(),
      status: 'InProgress',
      isFinished: false
    });
    this.loadFriendMissions();
    alert('ส่งคำขอเข้าร่วมภารกิจนี้แล้ว');
  }

  get filteredAvailableFriends(): MockUser[] {
    const term = this.friendSearchTerm.trim().toLowerCase();
    if (!term) return this.availableFriends;
    return this.availableFriends.filter(u =>
      u.display_name.toLowerCase().includes(term)
    );
  }

  addFriendFromSelector() {
    const current = this.currentUser;
    if (!current || !this.selectedFriendName) return;
    this.passportService.addFriend(current.display_name, this.selectedFriendName);
    this.loadFriends();
    this.loadAvailableFriends();
  }

  loadFriendRequests() {
    const current = this.currentUser;
    if (!current) {
      this.incomingRequests = [];
      this.outgoingRequests = [];
      return;
    }
    const name = current.display_name;
    this.incomingRequests = this.passportService.getIncomingFriendRequests(name);
    this.outgoingRequests = this.passportService.getOutgoingFriendRequests(name);
  }

  sendFriendRequestTo(displayName: string) {
    const current = this.currentUser;
    if (!current) return;
    this.passportService.sendFriendRequest(current.display_name, displayName);
    this.loadFriendRequests();
    this.loadAvailableFriends();
  }

  acceptFriendRequest(fromDisplayName: string) {
    const current = this.currentUser;
    if (!current) return;
    this.passportService.acceptFriendRequest(current.display_name, fromDisplayName);
    this.loadFriends();
    this.loadFriendRequests();
    this.loadAvailableFriends();
  }

  removeFriend(displayName: string) {
    const current = this.currentUser;
    if (!current) return;
    this.passportService.removeFriend(current.display_name, displayName);
    this.loadFriends();
    this.loadAvailableFriends();
    this.loadFriendRequests();
  }

  addProfileOwnerAsFriend() {
    const current = this.currentUser;
    if (!current || !this.viewUserName) return;
    this.passportService.addFriend(current.display_name, this.viewUserName);
    this.loadFriends();
    this.loadAvailableFriends();
  }

  get canAddProfileFriend(): boolean {
    const current = this.currentUser;
    if (!current || this.isOwnProfile || !this.viewUserName) return false;
    if (current.display_name === this.viewUserName) return false;
    return !this.friends.some(f => f.display_name === this.viewUserName);
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

  initEditForm() {
    const user = this.currentUser;
    this.editForm = {
      display_name: user?.display_name || ''
    };
  }

  toggleEdit() {
    if (!this.isEditing) {
      this.initEditForm();
    }
    this.isEditing = !this.isEditing;
  }

  saveProfile() {
    const newName = (this.editForm.display_name || '').trim();
    if (!newName) {
      alert('กรุณากรอกชื่อ');
      return;
    }
    const error = this.passportService.updateDisplayName(newName);
    if (error) {
      alert(error);
      return;
    }
    this.isEditing = false;
  }

  get currentUser() {
    return this.passportService.data();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const url = e.target.result;
        this.passportService.updateAvatar(url);
      };
      reader.readAsDataURL(file);
    }
  }
}
