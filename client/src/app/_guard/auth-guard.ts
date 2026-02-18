import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PassportService } from '../_services/passport-service';

export const authGuard: CanActivateFn = (route, state) => {
  const passportService = inject(PassportService)
  const router = inject(Router)

  if (passportService.data()?.access_token) return true

  router.navigate(['/login'])
  return false
}
