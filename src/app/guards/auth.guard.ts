import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

export const authGuard: CanActivateFn = (): Promise<boolean | UrlTree> => {

  const firebaseSvc = inject(FirebaseService);
  const router = inject(Router);

  return new Promise<boolean | UrlTree>((resolve) => {

    // onAuthStateChanged devuelve la función para cancelar la suscripción:
    // sin ella se acumula un listener por cada navegación.
    const unsubscribe = firebaseSvc.getAuth().onAuthStateChanged(async (auth) => {
      unsubscribe();

      // Solo pasan usuarios autenticados y con el correo verificado.
      if (auth && auth.emailVerified) {
        resolve(true);
        return;
      }

      await firebaseSvc.clearSession();
      resolve(router.parseUrl('/auth'));
    });
  });
};
