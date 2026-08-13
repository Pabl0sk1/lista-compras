import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const noAuthGuard: CanActivateFn = (): Promise<boolean | UrlTree> => {

  const firebaseSvc = inject(FirebaseService);
  const router = inject(Router);

  return new Promise<boolean | UrlTree>((resolve) => {

    const unsubscribe = firebaseSvc.getAuth().onAuthStateChanged((auth) => {
      unsubscribe();

      // Un usuario sin verificar todavía debe poder llegar a /auth,
      // si no queda rebotando entre este guard y authGuard.
      if (auth && auth.emailVerified) resolve(router.parseUrl('/main/home'));
      else resolve(true);
    });
  });
};
