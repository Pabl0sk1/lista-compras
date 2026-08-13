import { Injectable, signal } from '@angular/core';

/**
 * Estado de conexión, para poder avisar al usuario de que está trabajando sin
 * red. Los cambios se guardan igual gracias a la caché de Firestore, pero hay
 * que decirlo: si no, uno no sabe si lo que escribió se ha guardado.
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  readonly enLinea = signal(navigator.onLine);

  escuchar() {
    window.addEventListener('online', () => this.enLinea.set(true));
    window.addEventListener('offline', () => this.enLinea.set(false));
  }
}
