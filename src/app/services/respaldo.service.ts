import { inject, Injectable } from '@angular/core';
import { List, ListStatus } from '../models/list.model';
import { FirebaseService } from './firebase.service';

const FORMATO = 'shopeasy-listas-v1';

/**
 * Copia de seguridad de las listas en un archivo JSON.
 *
 * Los datos son del usuario: tiene que poder llevárselos y recuperarlos sin
 * depender de que la cuenta siga existiendo.
 */
@Injectable({
  providedIn: 'root'
})
export class RespaldoService {

  firebaseSvc = inject(FirebaseService);

  exportar(lists: List[]) {
    const contenido = {
      formato: FORMATO,
      exportado: new Date().toISOString(),
      listas: lists.map(l => ({
        title: l.title,
        status: l.status,
        dateHour: l.dateHour,
        note: l.note ?? '',
        items: (l.items ?? []).map(i => ({
          name: i.name,
          completed: !!i.completed,
          ...(i.quantity ? { quantity: i.quantity } : {}),
          ...(i.price ? { price: i.price } : {}),
          ...(i.category ? { category: i.category } : {})
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `shopeasy-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();

    // Sin esto el blob se queda en memoria hasta recargar
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return contenido.listas.length;
  }

  /**
   * Lee un archivo y crea las listas que contenga. No borra nada: importar se
   * suma a lo que ya hay, que es lo menos destructivo si alguien se equivoca
   * de archivo.
   */
  async importar(file: File): Promise<number> {
    const texto = await file.text();

    let datos: any;
    try {
      datos = JSON.parse(texto);
    } catch {
      throw new Error('El archivo no es un JSON válido.');
    }

    if (datos?.formato !== FORMATO || !Array.isArray(datos.listas)) {
      throw new Error('Ese archivo no es una copia de ShopEasy.');
    }

    const uid = this.firebaseSvc.getUid();
    if (!uid) throw new Error('No hay una sesión activa.');

    let creadas = 0;
    for (const lista of datos.listas.slice(0, 200)) {
      const limpia = this.sanear(lista);
      if (!limpia) continue;
      await this.firebaseSvc.addToSubcollection(`users/${uid}/lists`, limpia);
      creadas++;
    }

    if (!creadas) throw new Error('El archivo no contenía listas válidas.');
    return creadas;
  }

  /**
   * El archivo lo puede haber tocado cualquiera, así que se reconstruye campo
   * a campo con los mismos límites que exigen las reglas de Firestore: si no,
   * la escritura sería rechazada y el error no diría nada útil.
   */
  private sanear(lista: any) {
    const title = String(lista?.title ?? '').trim().slice(0, 100);
    if (!title) return null;

    const items = (Array.isArray(lista.items) ? lista.items : [])
      .slice(0, 200)
      .map((i: any) => {
        const name = String(i?.name ?? '').trim().slice(0, 120);
        if (!name) return null;
        const cantidad = Math.max(1, Math.min(999, parseInt(i?.quantity, 10) || 1));
        const precio = Math.max(0, parseFloat(i?.price) || 0);
        return {
          name,
          completed: !!i?.completed,
          ...(cantidad > 1 ? { quantity: cantidad } : {}),
          ...(precio > 0 ? { price: precio } : {}),
          ...(i?.category ? { category: String(i.category).slice(0, 40) } : {})
        };
      })
      .filter(Boolean);

    const nota = String(lista?.note ?? '').trim().slice(0, 500);

    return {
      title,
      status: lista?.status === ListStatus.Completed ? ListStatus.Completed : ListStatus.Active,
      dateHour: String(lista?.dateHour ?? '').slice(0, 40) || this.ahora(),
      items,
      ...(nota ? { note: nota } : {})
    };
  }

  private ahora(): string {
    const d = new Date();
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }
}
