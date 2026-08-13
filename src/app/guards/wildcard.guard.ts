import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const wildcardGuard: CanActivateFn = (): Promise<UrlTree> => {

  const firebaseSvc = inject(FirebaseService);
  const router = inject(Router);

  return new Promise<UrlTree>((resolve) => {

    const unsubscribe = firebaseSvc.getAuth().onAuthStateChanged((user) => {
      unsubscribe();

      if (user && user.emailVerified) resolve(router.parseUrl('/main/home'));
      else resolve(router.parseUrl('/auth'));
    });
  });
};
