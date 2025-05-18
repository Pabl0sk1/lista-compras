import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { UtilsService } from '../services/utils.service';
import { FirebaseService } from '../services/firebase.service';

export const wildcardGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {

  const firebaseSvc = inject(FirebaseService);
  const utilsSvc = inject(UtilsService);

  return new Promise((resolve) => {
    firebaseSvc.getAuth().onAuthStateChanged((user) => {
      if (user && user.emailVerified) {
        resolve(utilsSvc.routerLink('/main/home'));
      } else {
        resolve(utilsSvc.routerLink('/auth'));
      }
    });
  });
};