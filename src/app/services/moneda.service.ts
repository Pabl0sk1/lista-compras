import { Injectable } from '@angular/core';
import { Item } from '../models/list.model';

const CLAVE = 'moneda';

export const MONEDAS = [
  { simbolo: 'Gs.', nombre: 'Guaraníes', decimales: 0 },
  { simbolo: '$', nombre: 'Dólares', decimales: 2 },
  { simbolo: '€', nombre: 'Euros', decimales: 2 },
  { simbolo: '', nombre: 'Sin símbolo', decimales: 2 }
];

/**
 * Moneda para los precios. Se guarda en el dispositivo, no en Firestore: es una
 * preferencia de visualización, no un dato de la cuenta, y así no hace falta
 * tocar las reglas ni el documento del usuario.
 */
@Injectable({
  providedIn: 'root'
})
export class MonedaService {

  get simbolo(): string {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return MONEDAS.some(m => m.simbolo === guardado) ? guardado! : 'Gs.';
    } catch {
      return 'Gs.';
    }
  }

  set simbolo(valor: string) {
    try {
      localStorage.setItem(CLAVE, valor);
    } catch {
      // Sin almacenamiento: se usa el valor por defecto y ya
    }
  }

  private get decimales(): number {
    return MONEDAS.find(m => m.simbolo === this.simbolo)?.decimales ?? 2;
  }

  formatear(importe: number): string {
    const numero = importe.toLocaleString('es-ES', {
      minimumFractionDigits: this.decimales,
      maximumFractionDigits: this.decimales
    });
    return this.simbolo ? `${this.simbolo} ${numero}` : numero;
  }

  /** Total de una lista: cantidad × precio de cada item que tenga precio */
  total(items: Item[] = []): number {
    return items.reduce((suma, item) => suma + (item.price ?? 0) * (item.quantity ?? 1), 0);
  }

  /** Lo que queda por comprar, que es lo que interesa mientras compras */
  totalPendiente(items: Item[] = []): number {
    return this.total(items.filter(i => !i.completed));
  }

  hayPrecios(items: Item[] = []): boolean {
    return items.some(i => (i.price ?? 0) > 0);
  }
}
