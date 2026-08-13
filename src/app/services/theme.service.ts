import { Injectable } from '@angular/core';

export type Tema = 'system' | 'light' | 'dark';

const CLAVE = 'tema';

/**
 * Gestiona el tema de la app. El CSS reacciona al atributo data-tema de <html>:
 *   - sin atributo  -> manda la preferencia del sistema
 *   - data-tema="light" / "dark" -> manda la elección del usuario
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  /** Lee la preferencia guardada; 'system' si no hay ninguna o está corrupta */
  get tema(): Tema {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado === 'light' || guardado === 'dark' ? guardado : 'system';
    } catch {
      return 'system';
    }
  }

  /** ¿Se está viendo en oscuro ahora mismo? */
  get esOscuro(): boolean {
    const t = this.tema;
    if (t !== 'system') return t === 'dark';
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  setTema(tema: Tema) {
    try {
      if (tema === 'system') localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, tema);
    } catch {
      // Modo privado o almacenamiento lleno: se aplica igual, solo no persiste
    }
    this.aplicar();
  }

  /** Vuelca la preferencia al DOM. Se llama al arrancar y en cada cambio. */
  aplicar() {
    const tema = this.tema;
    const raiz = document.documentElement;

    if (tema === 'system') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', tema);

    this.pintarBarraNavegador();
  }

  /**
   * Las <meta name="theme-color"> con media solo siguen al sistema, así que no
   * reaccionan a una elección manual. Se reemplazan por una sola etiqueta que
   * sí controlamos.
   */
  private pintarBarraNavegador() {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => {
      if (i > 0) m.remove();
    });

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.removeAttribute('media');
    meta.content = this.esOscuro ? '#131C2E' : '#15803D';
  }

  /**
   * Con el tema en 'system', si el usuario cambia el modo del sistema con la
   * app abierta hay que repintar la barra del navegador.
   */
  escucharSistema() {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.tema === 'system') this.pintarBarraNavegador();
    });
  }
}
