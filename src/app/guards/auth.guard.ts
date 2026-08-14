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
      if (!auth || !auth.emailVerified) {
        await firebaseSvc.clearSession();
        resolve(router.parseUrl('/auth'));
        return;
      }

      // Segundo factor. Si ya se superó en esta sesión, adelante.
      if (firebaseSvc.dosFactoresSuperado()) {
        resolve(true);
        return;
      }

      // Si no, hay que preguntarle a Firestore, no a localStorage: el usuario
      // puede vaciarlo o editarlo desde el navegador, y entonces bastaría con
      // eso para saltarse el código.
      try {
        const dosFactores = await firebaseSvc.getDosFactores();
        if (dosFactores?.enabled) {
          await firebaseSvc.clearSession();
          resolve(router.parseUrl('/auth'));
          return;
        }
      } catch {
        // Sin conexión y sin caché no se puede comprobar: se deja pasar en vez
        // de dejar al usuario fuera de sus propias listas.
      }

      resolve(true);
    });
  });
};
