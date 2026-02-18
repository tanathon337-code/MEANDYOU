import { Component, signal, OnInit, inject, PLATFORM_ID, AfterViewInit, effect } from '@angular/core'
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router'
import { Navbar } from "./navbar/navbar"
import { HttpClientModule } from '@angular/common/http'
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BackgroundService } from './_services/background-service';
import { LoadingService } from './_services/loading-service';
import { gsap } from 'gsap';

declare var THREE: any;

@Component({
  selector: 'app-root',
  imports: [HttpClientModule, RouterOutlet, Navbar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('client');
  platformId = inject(PLATFORM_ID);
  private backgroundService = inject(BackgroundService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  
  isLoading = this.loadingService.isLoading;

  constructor() {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initCustomCursor();
      this.setupNavigationDelay();
    }
  }

  private setupNavigationDelay() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.loading();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingService.idle();
      }
    });

    // Initial load delay
    this.loadingService.loading();
    this.loadingService.idle();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const container = document.getElementById('global-liquid-gradient-container');
      if (container) {
        this.backgroundService.init(container, THREE);
      }
    }
  }

  private initCustomCursor() {
    const cursor = document.getElementById('customCursor');
    if (!cursor) return;

    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'scale(0.8)';
    });

    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'scale(1)';
    });
  }
}

