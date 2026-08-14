import { Component, inject, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { List, ListStatus } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateListComponent } from 'src/app/shared/components/add-update-list/add-update-list.component';
import { ShoppingModeComponent } from 'src/app/shared/components/shopping-mode/shopping-mode.component';
import { Timestamp } from '@angular/fire/firestore';
import { orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnDestroy {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  constructor() { }

  lists: List[] = [];
  private sub?: Subscription;
  loading: boolean = false;

  user = {} as User;


  ionViewWillEnter() {
    this.getUser();
    this.getLists();
  }

  // Al salir se corta la escucha: si no, cada entrada abriria una nueva
  ionViewWillLeave() {
    this.sub?.unsubscribe();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async getUser() {
    return this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;
  }

  /**
   * Una lista "toca hacerla" cuando su fecha ya pasó y sigue activa.
   * Las completas no avisan aunque su fecha sea vieja: ya no hay nada que hacer.
   */
  esVencida(list: List): boolean {
    if (list.status !== 'Activo') return false;
    const fecha = this.aFecha(list.dateHour);
    return !!fecha && fecha.getTime() <= Date.now();
  }

  get vencidas(): List[] {
    return this.lists.filter(l => this.esVencida(l));
  }

  /**
   * Ordena por urgencia real, no por fecha de creación: primero lo que ya
   * tocaba (lo más atrasado arriba), luego lo próximo, y al final lo completo.
   */
  private ordenarPorUrgencia(lists: List[]): List[] {
    const peso = (l: List) => this.esVencida(l) ? 0 : (l.status === 'Activo' ? 1 : 2);
    const tiempo = (l: List) => this.aFecha(l.dateHour)?.getTime() ?? 0;

    return [...lists].sort((a, b) => {
      const pa = peso(a), pb = peso(b);
      if (pa !== pb) return pa - pb;
      // Dentro del mismo grupo: lo más cercano en el tiempo primero
      return peso(a) === 2 ? tiempo(b) - tiempo(a) : tiempo(a) - tiempo(b);
    });
  }

  /** Saludo según la hora del día */
  saludo(): string {
    const hora = new Date().getHours();
    if (hora < 6) return 'Buenas noches';
    if (hora < 13) return 'Buenos días';
    if (hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  /** Solo el nombre de pila: "Buenas tardes, Pablo Miguel Ocampos" queda raro */
  primerNombre(): string {
    return (this.user?.name ?? '').trim().split(' ')[0];
  }

  /** Resumen de lo que le espera al usuario */
  resumen(): string {
    if (this.loading) return 'Cargando tus listas…';
    if (!this.lists.length) return 'Aún no tienes ninguna lista';

    // Lo que ya tocaba manda sobre el resto del resumen
    const vencidas = this.vencidas.length;
    if (vencidas) {
      return vencidas === 1
        ? 'Tienes 1 lista que ya toca hacer'
        : `Tienes ${vencidas} listas que ya tocan`;
    }

    const activas = this.lists.filter(l => l.status === 'Activo').length;
    if (!activas) {
      return this.lists.length === 1
        ? 'Tu lista está completa'
        : 'Tienes todas las listas completas';
    }
    return activas === 1 ? 'Tienes 1 lista activa' : `Tienes ${activas} listas activas`;
  }

  /** Items marcados de una lista */
  getCompletados(list: List): number {
    return list.items?.filter(item => item.completed).length ?? 0;
  }

  /** Porcentaje completado, para la barra de progreso de la tarjeta */
  getProgreso(list: List): number {
    return this.utilsSvc.getPercentaje(list.items ?? []);
  }

  doRefresh(event: { target: { complete: () => void; }; }) {
    // Los datos ya llegan solos; el gesto se mantiene porque la gente lo espera
    setTimeout(() => event.target.complete(), 600);
  }

  formatDate(dateHour: any): string {
    const fecha = this.aFecha(dateHour);
    if (!fecha) return '';

    // Fechas cercanas en palabras; el resto, corto y sin año si es el actual
    const dia = new Date(fecha); dia.setHours(0, 0, 0, 0);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((dia.getTime() - hoy.getTime()) / 86400000);

    const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (dias === 0) return `Hoy, ${hora}`;
    if (dias === 1) return `Mañana, ${hora}`;
    if (dias === -1) return `Ayer, ${hora}`;

    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      ...(fecha.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' })
    });
  }

  /** Firestore devuelve la fecha como Timestamp, como {seconds} o como string */
  private aFecha(dateHour: any): Date | null {
    if (!dateHour) return null;
    if (dateHour instanceof Timestamp) return dateHour.toDate();
    if (typeof dateHour === 'object' && dateHour.seconds) return new Date(dateHour.seconds * 1000);
    if (typeof dateHour === 'string') {
      const d = new Date(dateHour);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  // ---- Búsqueda y filtro ----
  busqueda = '';
  filtro: 'todas' | 'activas' | 'completas' = 'todas';

  /** Listas vivas: ni en la papelera ni plantillas */
  get listasActivas(): List[] {
    return this.lists.filter(l => !l.deletedAt && !l.template);
  }

  get plantillas(): List[] {
    return this.lists.filter(l => l.template && !l.deletedAt);
  }

  /** Lo que se pinta: el listado ya ordenado, pasado por filtro y búsqueda */
  get listasVisibles(): List[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.listasActivas.filter(l => {
      if (this.filtro === 'activas' && l.status !== 'Activo') return false;
      if (this.filtro === 'completas' && l.status !== 'Completo') return false;
      if (!texto) return true;

      // Busca también dentro de los items: uno recuerda "el pan", no el título
      return l.title?.toLowerCase().includes(texto)
        || (l.items ?? []).some(i => i.name?.toLowerCase().includes(texto));
    });
  }

  // ---- Compartir con otra persona ----
  esCompartida(list: List): boolean {
    return !!list.sharedWith?.length;
  }

  soyDuenyo(list: List): boolean {
    return this.firebaseSvc.soyDuenyo(list);
  }

  /**
   * Comparte por correo. Se guarda el correo, no un uid, porque el cliente no
   * puede resolver uno desde el otro: las reglas comparan con el correo del
   * token de quien entra.
   */
  async compartirConAlguien(list: List) {
    await this.utilsSvc.presentAlert({
      header: 'Compartir lista',
      message: 'Escribe el correo de la persona. Verá y podrá editar esta lista con su cuenta de ShopEasy.',
      cssClass: 'custom-alert',
      mode: 'ios',
      inputs: [{ name: 'email', type: 'email', placeholder: 'correo@ejemplo.com' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Compartir',
          cssClass: 'logout-button',
          handler: (res) => {
            const correo = (res.email ?? '').trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
              this.avisar('Ese correo no parece válido.', 'danger');
              return false;
            }
            if (correo === this.user?.email?.toLowerCase()) {
              this.avisar('Esa lista ya es tuya.', 'warning');
              return false;
            }
            this.guardarReparto(list, [...(list.sharedWith ?? []), correo]);
            return true;
          }
        }
      ]
    });
  }

  /** Ver con quién está compartida y quitar a alguien */
  async gestionarAcceso(list: List) {
    const correos = list.sharedWith ?? [];

    await this.utilsSvc.presentActionSheet({
      header: 'Compartida con',
      cssClass: 'custom-sheet',
      mode: 'ios',
      buttons: [
        ...correos.map(c => ({
          text: `Quitar a ${c}`,
          icon: 'person-remove-outline',
          role: 'destructive',
          handler: () => this.guardarReparto(list, correos.filter(x => x !== c))
        })),
        { text: 'Compartir con alguien más', icon: 'person-add-outline', handler: () => this.compartirConAlguien(list) },
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
  }

  private async guardarReparto(list: List, correos: string[]) {
    try {
      await this.utilsSvc.presentLoading();

      // El dueño queda anotado para que el invitado sepa en qué cuenta escribir
      await this.firebaseSvc.updateSubCollection(this.firebaseSvc.rutaDeLista(list), {
        sharedWith: [...new Set(correos)],
        owner: list.owner ?? this.firebaseSvc.getUid()
      });

      this.avisar(correos.length ? 'Acceso actualizado.' : 'Ya no está compartida.', 'success');
    } catch (error) {
      this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
    } finally {
      this.utilsSvc.dismissLoading();
    }
  }

  /** Un invitado no puede borrar la lista de otro, pero sí quitarse a sí mismo */
  salirDeLaLista(list: List) {
    this.utilsSvc.presentAlert({
      header: 'Salir de la lista',
      message: `Dejarás de ver "${list.title}". Su dueño puede volver a invitarte.`,
      cssClass: 'custom-alert peligro',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Salir',
          cssClass: 'logout-button',
          handler: async () => {
            const mio = this.user?.email?.toLowerCase();
            await this.firebaseSvc.updateSubCollection(this.firebaseSvc.rutaDeLista(list), {
              sharedWith: (list.sharedWith ?? []).filter(c => c !== mio)
            });
            this.avisar('Has salido de la lista.', 'success');
          }
        }
      ]
    });
  }

  // ---- Opciones de una lista ----
  async opcionesLista(list: List) {
    const propia = this.soyDuenyo(list);

    // A un invitado no se le ofrecen acciones que las reglas van a rechazar
    const botones: any[] = [
      { text: 'Modo compra', icon: 'basket-outline', handler: () => this.modoCompra(list) },
      { text: 'Repetir lista', icon: 'copy-outline', handler: () => this.duplicarLista(list) },
      // "Enviar" y no "Compartir": manda el texto por WhatsApp y se acabó, no
      // da acceso a nada. Llamar a las dos cosas "compartir" confundía.
      { text: 'Enviar por mensaje', icon: 'share-outline', handler: () => this.compartirLista(list) }
    ];

    if (propia) {
      botones.push(
        { text: 'Guardar como plantilla', icon: 'bookmark-outline', handler: () => this.guardarComoPlantilla(list) },
        this.esCompartida(list)
          ? { text: 'Gestionar acceso', icon: 'people-outline', handler: () => this.gestionarAcceso(list) }
          : { text: 'Compartir con alguien', icon: 'person-add-outline', handler: () => this.compartirConAlguien(list) },
        { text: 'Eliminar', icon: 'trash-outline', role: 'destructive', handler: () => this.confirmDeleteList(list) }
      );
    } else {
      botones.push({ text: 'Salir de la lista', icon: 'exit-outline', role: 'destructive', handler: () => this.salirDeLaLista(list) });
    }

    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    await this.utilsSvc.presentActionSheet({
      header: list.title,
      cssClass: 'custom-sheet',
      mode: 'ios',
      buttons: botones
    });
  }

  /**
   * Duplica la lista con los items sin marcar y fecha nueva. La compra de casa
   * se repite cada semana: rehacerla a mano cada vez es el trabajo tonto que
   * más se nota.
   */
  async duplicarLista(list: List, numerar = true) {
    try {
      await this.utilsSvc.presentLoading();

      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setHours(manana.getHours() + 1, 0, 0, 0);

      await this.firebaseSvc.addToSubcollection(`users/${this.firebaseSvc.getUid()}/lists`, {
        title: numerar ? this.tituloDeCopia(list.title) : list.title,
        status: ListStatus.Active,
        dateHour: this.aTextoLocal(manana),
        items: (list.items ?? []).map(i => ({
          name: i.name,
          completed: false,
          ...(i.quantity && i.quantity > 1 ? { quantity: i.quantity } : {}),
          ...(i.price ? { price: i.price } : {}),
          ...(i.category ? { category: i.category } : {})
        })),
        ...(list.note ? { note: list.note } : {})
      });

      this.getLists();
      this.avisar('Lista repetida, lista para usar.', 'success');
    } catch (error) {
      this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
    } finally {
      this.utilsSvc.dismissLoading();
    }
  }

  /** "Compra" -> "Compra (2)" -> "Compra (3)": evita un montón de títulos iguales */
  private tituloDeCopia(titulo: string): string {
    // Se parte del título sin sufijo para que copiar una copia no encadene
    // "Compra (2) (2)"
    const base = (titulo ?? 'Lista').replace(/\s*\(\d+\)$/, '');
    let n = 2;
    while (this.lists.some(l => l.title === `${base} (${n})`)) n++;
    return `${base} (${n})`.slice(0, 100);
  }

  /**
   * Comparte la lista como texto. Con Web Share sale el menú del sistema
   * (WhatsApp, notas...); si no existe, se copia al portapapeles.
   */
  async compartirLista(list: List) {
    const lineas = (list.items ?? []).map(i => {
      const cantidad = i.quantity && i.quantity > 1 ? ` x${i.quantity}` : '';
      return `${i.completed ? '☑' : '☐'} ${i.name}${cantidad}`;
    });
    const texto = `🛒 ${list.title}\n\n${lineas.join('\n') || '(sin items)'}\n\n— ShopEasy`;

    try {
      if (navigator.share) {
        await navigator.share({ title: list.title, text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      this.avisar('Lista copiada al portapapeles.', 'success');
    } catch (error: any) {
      // Cancelar el diálogo de compartir no es un fallo que haya que anunciar
      if (error?.name !== 'AbortError') this.avisar('No se pudo compartir la lista.', 'warning');
    }
  }

  private aTextoLocal(d: Date): string {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }

  private avisar(message: string, color: string) {
    this.utilsSvc.presentToast({
      message,
      color,
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline',
      duration: 2000,
      position: 'middle'
    });
  }

  async confirmDeleteList(list: List) {
    this.utilsSvc.presentAlert({
      header: 'Eliminar Lista',
      message: '¿Deseas eliminar la lista?',
      cssClass: 'custom-alert peligro',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'cancel-button'
        }, {
          text: 'Confirmar',
          cssClass: 'logout-button',
          handler: () => {
            this.deleteList(list);
          }
        }
      ]
    });
  }

  getLists() {
    this.loading = true;
    let path = `users/${this.firebaseSvc.getUid()}/lists`;

    let query = [
      orderBy('dateHour', 'desc')
    ];

    // Suscripción viva: antes se cortaba tras la primera lectura, así que un
    // cambio hecho en otro dispositivo (o en otra pestaña) no llegaba hasta
    // recargar. Se cierra al salir de la página, en ionViewWillLeave.
    //
    // Son dos orígenes: lo mío y lo que otros me han compartido, que vive en
    // sus cuentas y llega por consulta de grupo.
    this.sub?.unsubscribe();
    this.sub = combineLatest([
      this.firebaseSvc.getSubcollection(path, query),
      this.firebaseSvc.getListasCompartidasConmigo()
    ]).subscribe({
      next: ([propias, compartidas]: [List[], List[]]) => {
        // Por id, no vaya a ser que una lista llegue por los dos caminos
        const porId = new Map<string, List>();
        for (const l of [...propias, ...compartidas]) porId.set(l.id, l);

        this.lists = this.ordenarPorUrgencia([...porId.values()]);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al obtener listas:', err);
      }
    });
  }

  /**
   * Guarda la lista como plantilla: una copia marcada que no aparece en el
   * listado y sirve de punto de partida. Se diferencia de "repetir" en que la
   * plantilla se queda ahí para siempre en vez de ensuciar la pantalla.
   */
  async guardarComoPlantilla(list: List) {
    try {
      await this.utilsSvc.presentLoading();
      await this.firebaseSvc.addToSubcollection(`users/${this.firebaseSvc.getUid()}/lists`, {
        title: list.title,
        status: ListStatus.Active,
        dateHour: list.dateHour,
        template: true,
        items: (list.items ?? []).map(i => ({
          name: i.name,
          completed: false,
          ...(i.quantity && i.quantity > 1 ? { quantity: i.quantity } : {}),
          ...(i.price ? { price: i.price } : {}),
          ...(i.category ? { category: i.category } : {})
        })),
        ...(list.note ? { note: list.note } : {})
      });
      this.avisar('Guardada como plantilla.', 'success');
    } catch (error) {
      this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
    } finally {
      this.utilsSvc.dismissLoading();
    }
  }

  /** El botón + pregunta de dónde partir cuando hay plantillas guardadas */
  async nuevaLista() {
    if (!this.plantillas.length) return this.addOrUpdateList();

    await this.utilsSvc.presentActionSheet({
      header: 'Nueva lista',
      cssClass: 'custom-sheet',
      mode: 'ios',
      buttons: [
        { text: 'Lista en blanco', icon: 'document-outline', handler: () => this.addOrUpdateList() },
        ...this.plantillas.map(p => ({
          text: p.title,
          icon: 'bookmark-outline',
          handler: () => this.duplicarLista(p, false)
        })),
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
  }

  async addOrUpdateList(list?: List) {
    // La lista llega ya en tiempo real, así que no hace falta recargar al cerrar
    await this.utilsSvc.presentModal({
      component: AddUpdateListComponent,
      componentProps: { list, sugerencias: this.itemsFrecuentes() },
      cssClass: 'add-update-modal'
    });
  }

  /** Pantalla a pantalla completa pensada para usar dentro del supermercado */
  async modoCompra(list: List) {
    await this.utilsSvc.presentModal({
      component: ShoppingModeComponent,
      componentProps: { list },
      cssClass: 'modo-compra-modal'
    });
  }

  /**
   * Lo que más compra el usuario, sacado de sus propias listas. No hace falta
   * guardar nada aparte: las listas ya están cargadas y así la sugerencia
   * siempre refleja la realidad.
   */
  itemsFrecuentes(): string[] {
    const cuenta = new Map<string, { nombre: string, veces: number }>();

    for (const lista of this.lists) {
      for (const item of lista.items ?? []) {
        const clave = item.name?.trim().toLowerCase();
        if (!clave) continue;
        const previo = cuenta.get(clave);
        if (previo) previo.veces++;
        else cuenta.set(clave, { nombre: item.name.trim(), veces: 1 });
      }
    }

    return [...cuenta.values()]
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 12)
      .map(x => x.nombre);
  }

  /**
   * Borrado suave: la lista va a la papelera. Destruirla de verdad solo pasa
   * desde la papelera o cuando caduca, asi que un toque mal dado nunca pierde
   * datos de forma definitiva.
   */
  deleteList(list: List) {
    let path = this.firebaseSvc.rutaDeLista(list);
    this.utilsSvc.presentLoading();

    this.firebaseSvc.updateSubCollection(path, { ...this.sinId(list), deletedAt: new Date().toISOString() }).then(() => {
      this.lists = this.lists.filter(li => li.id !== list.id);
      this.utilsSvc.dismissLoading();

      // Borrar era irreversible: una confirmación mal tocada se llevaba la
      // lista para siempre. Se ofrece deshacer durante unos segundos.
      this.utilsSvc.presentToast({
        message: `"${list.title}" eliminada.`,
        color: 'medium',
        duration: 6000,
        position: 'bottom',
        buttons: [{
          text: 'Deshacer',
          handler: () => { this.restaurarLista(list); }
        }]
      });

    }, error => {

      const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
      this.utilsSvc.presentToast({
        message: mensaje,
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000,
        position: 'middle'
      })
    });
  }

  /** La lista sigue existiendo: basta con quitarle la marca de la papelera */
  private async restaurarLista(list: List) {
    try {
      await this.firebaseSvc.restaurarDeLaPapelera(this.firebaseSvc.rutaDeLista(list));
      this.avisar('Lista restaurada.', 'success');
    } catch (error) {
      this.avisar('No se pudo restaurar la lista.', 'danger');
    }
  }

  /**
   * El documento que se escribe no puede llevar el id (las reglas solo admiten
   * los campos del modelo) ni la marca de papelera al restaurar.
   */
  private sinId(list: List) {
    const { id, deletedAt, ...datos } = list;
    return datos;
  }
}
