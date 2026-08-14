import { Injectable } from '@angular/core';

/**
 * Dictado por voz con la Web Speech API.
 *
 * En el supermercado se va con una mano ocupada: poder decir "leche" en vez de
 * teclearlo es la diferencia entre usar la lista o no usarla.
 */
@Injectable({
  providedIn: 'root'
})
export class DictadoService {

  private reconocimiento: any = null;

  /** Chrome y los navegadores basados en él; en el resto no existe */
  get disponible(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  escuchando = false;

  /**
   * Escucha una frase y devuelve lo dicho. Se resuelve con cadena vacía si no
   * se entendió nada, para que quien llama no tenga que distinguir casos.
   */
  escuchar(alTexto: (texto: string) => void, alTerminar?: () => void) {
    const Reconocimiento = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Reconocimiento) return;

    this.detener();

    const rec = new Reconocimiento();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (evento: any) => {
      const texto = evento.results?.[0]?.[0]?.transcript?.trim();
      if (texto) alTexto(texto);
    };

    const fin = () => {
      this.escuchando = false;
      this.reconocimiento = null;
      alTerminar?.();
    };
    rec.onerror = fin;
    rec.onend = fin;

    this.reconocimiento = rec;
    this.escuchando = true;
    rec.start();
  }

  detener() {
    try {
      this.reconocimiento?.stop();
    } catch {
      // Ya estaba parado
    }
    this.reconocimiento = null;
    this.escuchando = false;
  }
}
