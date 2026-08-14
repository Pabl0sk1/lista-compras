import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { CATEGORIAS, Item, List, ListStatus } from 'src/app/models/list.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-add-update-list',
  templateUrl: './add-update-list.component.html',
  styleUrls: ['./add-update-list.component.scss'],
  standalone: false
})
export class AddUpdateListComponent implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  monedaSvc = inject(MonedaService);

  CATEGORIAS = CATEGORIAS;

  @Input() list: List;
  /** Lo que el usuario suele comprar, calculado en la pantalla de inicio */
  @Input() sugerencias: string[] = [];

  tempItems: Item[] = [];
  nuevoItem = '';
  nota = '';

  /** Se ocultan las que ya están en la lista: sugerir un duplicado no aporta */
  get sugerenciasVisibles(): string[] {
    const puestos = new Set(this.tempItems.map(i => i.name.trim().toLowerCase()));
    return this.sugerencias.filter(s => !puestos.has(s.trim().toLowerCase())).slice(0, 8);
  }

  /**
   * Añadir sin abrir diálogo. Pegar varias líneas crea un item por línea, que
   * es como la gente trae la lista desde WhatsApp o desde una nota.
   */
  agregarRapido(texto?: string) {
    const entrada = (texto ?? this.nuevoItem).trim();
    if (!entrada) return;

    const nombres = entrada.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    for (const nombre of nombres) {
      this.tempItems.unshift({ name: nombre.slice(0, 120), completed: false });
    }

    this.nuevoItem = '';
  }

  form = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    status: new FormControl(ListStatus.Active, [Validators.required]),
    dateHour: new FormControl(this.proximaHora(), [Validators.required]),
    items: new FormControl([])
  })

  constructor() { }

  ngOnInit() {
    if (this.list) {
      const { note, ...campos } = this.list;
      this.form.setValue(campos as any);
      this.form.updateValueAndValidity();
      this.tempItems = this.list.items.map(item => ({ ...item }));
      this.nota = this.list.note ?? '';
    }
  }

  submit() {
    if (this.form.valid) {
      this.form.patchValue({ items: this.tempItems });
      this.updateStatus();
      if (this.list) this.updateList();
      else this.createList();
    }
  }

  toggleItemCompleted(index: number, event: any) {
    this.tempItems[index].completed = event.detail.checked;
  }

  updateStatus() {
    // setValue sobre el control, no mutar form.value (que es interno de Angular)
    this.form.controls.status.setValue(
      this.getPercentaje() == 100 ? ListStatus.Completed : ListStatus.Active
    );
  }

  // Payload explícito con solo los campos permitidos por las reglas de Firestore
  private buildPayload() {
    return {
      title: this.form.controls.title.value,
      status: this.form.controls.status.value,
      dateHour: this.form.controls.dateHour.value,
      items: this.tempItems.map(item => ({
        name: item.name,
        completed: item.completed,
        // Los opcionales solo se guardan si aportan algo: cantidad 1, precio 0
        // o sección vacía solo ensuciarían el documento
        ...(item.quantity && item.quantity > 1 ? { quantity: item.quantity } : {}),
        ...(item.price ? { price: item.price } : {}),
        ...(item.category ? { category: item.category } : {})
      })),
      ...(this.nota.trim() ? { note: this.nota.trim().slice(0, 500) } : {})
    };
  }

  formatDate(dateHour: any): string {
    if (!dateHour) return '';

    // Timestamp de Firebase
    if (dateHour instanceof Timestamp) return this.formatToISO8601(dateHour.toDate());

    // Objeto con `seconds` (Firestore lo devuelve así en algunas ocasiones)
    if (typeof dateHour === 'object' && dateHour.seconds) {
      return this.formatToISO8601(new Date(dateHour.seconds * 1000));
    }

    // Cadena ya guardada
    if (typeof dateHour === 'string') {
      const parsedDate = new Date(dateHour);
      if (!isNaN(parsedDate.getTime())) return this.formatToISO8601(parsedDate);
    }

    return '';
  }

  /**
   * Formatea en hora LOCAL para el input datetime-local.
   *
   * Antes esto usaba toISOString() (que convierte a UTC) y compensaba restando
   * 3 horas a mano. Cuadraba en Paraguay (UTC-3) y en ningún otro sitio, y se
   * descuadra con los cambios de horario. Con avisos por fecha, una hora
   * desplazada significa avisar cuando no toca.
   */
  formatToISO8601(date: Date): string {
    const dosCifras = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${dosCifras(date.getMonth() + 1)}-${dosCifras(date.getDate())}`
      + `T${dosCifras(date.getHours())}:${dosCifras(date.getMinutes())}`;
  }

  /** Próxima hora en punto: una lista nueva no debería nacer ya vencida */
  private proximaHora(): string {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return this.formatToISO8601(d);
  }

  createList() {
    let path = `users/${this.firebaseSvc.getUid()}/lists`;
    this.utilsSvc.presentLoading();

    this.firebaseSvc.addToSubcollection(path, this.buildPayload()).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Lista creada éxitosamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      })
      this.utilsSvc.dismissLoading()

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

  updateList() {
    let path = `users/${this.firebaseSvc.getUid()}/lists/${this.list.id}`;
    this.utilsSvc.presentLoading();

    this.firebaseSvc.updateSubCollection(path, this.buildPayload()).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Lista actualizada éxitosamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      })
      this.utilsSvc.dismissLoading()

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

  getPercentaje() {
    return this.utilsSvc.getPercentaje(this.tempItems);
  }

  /** Items marcados, para el "3 de 8" de la cabecera */
  getCompletados(): number {
    return this.tempItems.filter(item => item.completed).length;
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;
    const movedItem = this.tempItems.splice(fromIndex, 1)[0];
    this.tempItems.splice(toIndex, 0, movedItem);
    event.detail.complete();
  }

  createItem() {
    this.editorDeItem('Nuevo item', { name: '', completed: false }, (item) => {
      this.tempItems.unshift(item);
    });
  }

  /** Tocar el nombre de un item permite corregirlo: antes había que borrarlo y volver a escribirlo */
  editItem(index: number, event: Event) {
    event.stopPropagation();
    this.editorDeItem('Editar item', this.tempItems[index], (item) => {
      this.tempItems[index] = { ...this.tempItems[index], ...item };
    });
  }

  /** Diálogo compartido por crear y editar */
  private editorDeItem(header: string, base: Item, alGuardar: (item: Item) => void) {
    this.utilsSvc.presentAlert({
      header,
      cssClass: 'custom-alert alerta-item',
      mode: 'ios',
      inputs: [
        { name: 'name', type: 'textarea', placeholder: '¿Qué necesitas?', value: base.name },
        { name: 'quantity', type: 'number', placeholder: 'Cantidad', min: 1, value: base.quantity ?? 1 },
        {
          name: 'price', type: 'number', min: 0,
          placeholder: `Precio por unidad (${this.monedaSvc.simbolo || 'opcional'})`,
          value: base.price ?? null
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Guardar',
          cssClass: 'logout-button',
          handler: (res) => {
            const nombre = (res.name ?? '').trim();
            if (!nombre) {
              this.utilsSvc.presentToast({
                message: 'Escribe qué necesitas comprar.',
                color: 'danger',
                icon: 'warning-outline',
                duration: 2000,
                position: 'middle'
              });
              return false; // deja el diálogo abierto para corregir
            }

            const cantidad = Math.max(1, Math.min(999, parseInt(res.quantity, 10) || 1));
            const precio = Math.max(0, parseFloat(res.price) || 0);

            alGuardar({
              name: nombre,
              completed: base.completed,
              quantity: cantidad,
              ...(precio > 0 ? { price: precio } : {}),
              ...(base.category ? { category: base.category } : {})
            });
            return true;
          }
        }
      ]
    });
  }

  /** Sección del súper, para poder agrupar por pasillo al comprar */
  async elegirCategoria(index: number, event: Event) {
    event.stopPropagation();
    const item = this.tempItems[index];

    await this.utilsSvc.presentActionSheet({
      header: 'Sección',
      cssClass: 'custom-sheet',
      mode: 'ios',
      buttons: [
        ...CATEGORIAS.map(c => ({
          text: c,
          handler: () => { this.tempItems[index] = { ...item, category: c }; }
        })),
        {
          text: 'Sin sección',
          role: 'destructive',
          handler: () => {
            const { category, ...resto } = this.tempItems[index];
            this.tempItems[index] = resto;
          }
        },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
  }

  // ---- Totales ----
  get total(): number {
    return this.monedaSvc.total(this.tempItems);
  }

  get hayPrecios(): boolean {
    return this.monedaSvc.hayPrecios(this.tempItems);
  }

  formatearImporte(importe: number): string {
    return this.monedaSvc.formatear(importe);
  }

  removeItem(index: number) {
    this.tempItems.splice(index, 1);
  }

  /** Marca o desmarca todo de una vez: útil al reutilizar una lista */
  alternarTodos() {
    const faltan = this.tempItems.some(i => !i.completed);
    this.tempItems = this.tempItems.map(i => ({ ...i, completed: faltan }));
  }

  get todosMarcados(): boolean {
    return this.tempItems.length > 0 && this.tempItems.every(i => i.completed);
  }
}
