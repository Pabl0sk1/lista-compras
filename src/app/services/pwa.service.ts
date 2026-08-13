import { Injectable } from '@angular/core';

/**
 * Instalación de la app (PWA).
 *
 * El navegador solo deja instalar desde un gesto del usuario y avisa antes con
 * el evento beforeinstallprompt. Hay que capturarlo y guardarlo: si se deja
 * pasar, luego no hay forma de lanzar la instalación por código.
 */
@Injectable({
  providedIn: 'root'
})
export class PwaService {

  private evento: any = null;

  /** ¿Puede el navegador lanzar el diálogo de instalación ahora mismo? */
  disponible = false;

  escuchar() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Sin preventDefault, Chrome muestra su propio aviso y perdemos el control
      e.preventDefault();
      this.evento = e;
      this.disponible = true;
    });

    window.addEventListener('appinstalled', () => {
      this.evento = null;
      this.disponible = false;
    });
  }

  /** Ya está instalada y abierta como app, no como pestaña */
  get instalada(): boolean {
    return matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
  }

  /** iOS no soporta beforeinstallprompt: allí hay que explicar los pasos */
  get esIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  async instalar(): Promise<'aceptada' | 'rechazada' | 'no-disponible'> {
    if (!this.evento) return 'no-disponible';

    this.evento.prompt();
    const { outcome } = await this.evento.userChoice;

    // El evento es de un solo uso
    this.evento = null;
    this.disponible = false;

    return outcome === 'accepted' ? 'aceptada' : 'rechazada';
  }
}
