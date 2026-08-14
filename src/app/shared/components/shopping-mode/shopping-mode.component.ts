import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Item, List, ListStatus } from 'src/app/models/list.model';
import { DictadoService } from 'src/app/services/dictado.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { MonedaService } from 'src/app/services/moneda.service';

@Component({
  selector: 'app-shopping-mode',
  templateUrl: './shopping-mode.component.html',
  styleUrls: ['./shopping-mode.component.scss'],
  standalone: false
})
export class ShoppingModeComponent implements OnInit, OnDestroy {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  dictadoSvc = inject(DictadoService);
  monedaSvc = inject(MonedaService);

  @Input() list!: List;

  items: Item[] = [];
  soloPendientes = true;
  nuevo = '';

  private guardadoPendiente: any = null;
  private wakeLock: any = null;

  async ngOnInit() {
    this.items = (this.list.items ?? []).map(i => ({ ...i }));
    await this.mantenerPantallaEncendida();
  }

  ngOnDestroy() {
    this.dictadoSvc.detener();
    this.soltarPantalla();
    // Si quedaba algo por guardar, se guarda ya
    if (this.guardadoPendiente) {
      clearTimeout(this.guardadoPendiente);
      this.guardar();
    }
  }

  // ---- Vista ----
  get visibles(): Item[] {
    // Lo pendiente primero: es lo que queda por hacer
    const orden = [...this.items].sort((a, b) => Number(a.completed) - Number(b.completed));
    return this.soloPendientes ? orden.filter(i => !i.completed) : orden;
  }

/**
   * Agrupa por sección del súper: recorrer el pasillo de lácteos entero antes
   * de cruzar la tienda otra vez ahorra vueltas de verdad.
   */
  get grupos(): { seccion: string, items: Item[] }[] {
    const mapa = new Map<string, Item[]>();
    for (const item of this.visibles) {
      const seccion = item.category || 'Sin sección';
      mapa.set(seccion, [...(mapa.get(seccion) ?? []), item]);
    }
    // Con una sola sección no merece la pena enseñar cabeceras
    if (mapa.size <= 1) return [{ seccion: '', items: this.visibles }];
    return [...mapa.entries()].map(([seccion, items]) => ({ seccion, items }));
  }

  get totalPendiente(): string {
    return this.monedaSvc.formatear(this.monedaSvc.totalPendiente(this.items));
  }

  get hayPrecios(): boolean {
    return this.monedaSvc.hayPrecios(this.items);
  }

  get pendientes(): number {
    return this.items.filter(i => !i.completed).length;
  }

  get progreso(): number {
    return this.utilsSvc.getPercentaje(this.items);
  }

  // ---- Acciones ----
  alternar(item: Item) {
    item.completed = !item.completed;
    this.programarGuardado();
  }

  agregar(texto?: string) {
    const entrada = (texto ?? this.nuevo).trim();
    if (!entrada) return;

    // Pegar varias líneas crea varios items de una vez
    const nombres = entrada.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    for (const nombre of nombres) {
      this.items.unshift({ name: nombre.slice(0, 120), completed: false });
    }

    this.nuevo = '';
    this.programarGuardado();
  }

  dictar() {
    if (!this.dictadoSvc.disponible) {
      return this.avisar('Tu navegador no permite dictar por voz.', 'warning');
    }
    if (this.dictadoSvc.escuchando) return this.dictadoSvc.detener();

    this.dictadoSvc.escuchar(texto => this.agregar(texto));
  }

  async terminar() {
    if (this.guardadoPendiente) clearTimeout(this.guardadoPendiente);
    await this.guardar();
    this.utilsSvc.dismissModal({ actualizado: true });
  }

  // ---- Guardado ----
  /**
   * Se guarda solo, poco después de cada toque. Marcando items a mano en el
   * supermercado nadie quiere pulsar "guardar", y si se cierra la app por
   * accidente no se pierde lo tachado. La caché de Firestore se encarga si no
   * hay cobertura.
   */
  private programarGuardado() {
    if (this.guardadoPendiente) clearTimeout(this.guardadoPendiente);
    this.guardadoPendiente = setTimeout(() => this.guardar(), 800);
  }

  private async guardar() {
    this.guardadoPendiente = null;
    const uid = this.firebaseSvc.getUid();
    if (!uid || !this.list?.id) return;

    const completos = this.items.length > 0 && this.items.every(i => i.completed);

    try {
      // Se escribe el documento entero, así que hay que arrastrar todo lo que
      // esta pantalla no toca (precio, sección, nota). Omitirlo lo borraría en
      // silencio con solo abrir el modo compra y cerrarlo.
      await this.firebaseSvc.updateSubCollection(this.firebaseSvc.rutaDeLista(this.list), {
        title: this.list.title,
        status: completos ? ListStatus.Completed : ListStatus.Active,
        dateHour: this.list.dateHour,
        items: this.items.map(i => ({
          name: i.name,
          completed: i.completed,
          ...(i.quantity && i.quantity > 1 ? { quantity: i.quantity } : {}),
          ...(i.price ? { price: i.price } : {}),
          ...(i.category ? { category: i.category } : {})
        })),
        ...(this.list.note ? { note: this.list.note } : {})
      });
    } catch (error) {
      this.avisar('No se pudo guardar. Se reintentará al volver la conexión.', 'warning');
    }
  }

  // ---- Pantalla ----
  /** Sin esto la pantalla se apaga cada poco mientras compras */
  private async mantenerPantallaEncendida() {
    try {
      this.wakeLock = await (navigator as any).wakeLock?.request('screen');
    } catch {
      // El navegador no lo permite o la pestaña no está visible: no es crítico
    }
  }

  private soltarPantalla() {
    try {
      this.wakeLock?.release();
    } catch { }
    this.wakeLock = null;
  }

  private avisar(message: string, color: string) {
    this.utilsSvc.presentToast({
      message, color, icon: 'alert-circle-outline', duration: 2500, position: 'bottom'
    });
  }
}
