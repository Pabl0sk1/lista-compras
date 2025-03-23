import { CanActivateFn } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { UtilsService } from '../services/utils.service';
import { inject } from '@angular/core';

export const noAuthGuard: CanActivateFn = (route, state) => {

  const firebaseSvc = inject(FirebaseService);
  const utilsSvc = inject(UtilsService);

  return new Promise<boolean>((resolve) => {

    firebaseSvc.getAuth().onAuthStateChanged((auth) => {

      if(!auth) resolve(true);
      else{
        utilsSvc.routerLink('/main/home');
        resolve(false);
      }

    })
  });
};
