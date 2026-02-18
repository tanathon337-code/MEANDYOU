import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PassportService } from '../_services/passport-service';

export const logoutGuard: CanActivateFn = (route, state) => {
  const passportService = inject(PassportService)
  const router = inject(Router)

  passportService.logout()
  router.navigate(['/'])
  return false
}
