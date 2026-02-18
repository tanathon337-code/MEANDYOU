import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSignal = signal<boolean>(false);
  isLoading = this.loadingSignal.asReadonly();

  loading() {
    this.loadingSignal.set(true);
  }

  idle() {
    setTimeout(() => {
      this.loadingSignal.set(false);
    }, 1000);
  }
}
