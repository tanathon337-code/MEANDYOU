import { Component, inject, HostListener, ElementRef } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatToolbarModule } from '@angular/material/toolbar'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { PassportService } from '../_services/passport-service'
import { KyosorService } from '../_services/kyosor-service'
import { BackgroundService } from '../_services/background-service'

@Component({
  selector: 'app-navbar',
  imports: [MatToolbarModule, MatButtonModule, CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  showMenu = false
  passportService = inject(PassportService)
  elementRef = inject(ElementRef)
  kyosorService = inject(KyosorService)
  showNotifications = false
  backgroundService = inject(BackgroundService)
  hasSeenNotifications = false

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu()
      this.showNotifications = false
    }
  }

  get isLoggedIn(): boolean {
    return !!this.passportService.data()?.access_token
  }

  get currentUser() {
    return this.passportService.data()
  }

  get notifications() {
    const stats = this.kyosorService.stats()
    const history = stats.history || []
    const now = new Date()

    return history
      .filter(item => !item.isFinished && item.date)
      .map(item => {
        const missionDate = new Date(item.date)
        const diffMs = missionDate.getTime() - now.getTime()
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        return {
          id: item.id,
          name: item.name,
          date: missionDate,
          daysLeft: daysLeft
        }
      })
      .filter(item => item.daysLeft >= 0 && item.daysLeft <= 3)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  get unreadNotifications(): number {
    return this.notifications.length
  }

  get hasUnreadBadge(): boolean {
    return !this.hasSeenNotifications && this.unreadNotifications > 0
  }

  get isDarkMode(): boolean {
    return this.backgroundService.theme() === 'dark'
  }

  toggleMenu() {
    this.showMenu = !this.showMenu
    if (this.showMenu) {
      this.showNotifications = false
    }
  }

  closeMenu() {
    this.showMenu = false
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications
    if (this.showNotifications) {
      this.showMenu = false
      this.hasSeenNotifications = true
    }
  }

  toggleTheme() {
    this.backgroundService.toggleTheme()
  }
}
