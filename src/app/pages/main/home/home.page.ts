import { Component, inject, OnInit } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateListComponent } from 'src/app/shared/components/add-update-list/add-update-list.component';
import { Timestamp } from '@angular/fire/firestore';
import { orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  constructor() { }

  lists: List[] = [];
  loading: boolean = false;

  user = {} as User;

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.getUser();
    this.getLists();
  }

  async getUser() {
    return this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;
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
    setTimeout(() => {
      this.getLists();
      event.target.complete();
    }, 1000);
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

    let sub = this.firebaseSvc.getSubcollection(path, query).subscribe({
      next: (res: List[]) => {
        this.lists = res;
        this.loading = false;
        sub.unsubscribe();
      },
      error: (err) => {
        console.error('Error al obtener listas:', err);
      }
    });
  }

  async addOrUpdateList(list?: List) {
    let res = await this.utilsSvc.presentModal({
      component: AddUpdateListComponent,
      componentProps: { list },
      cssClass: 'add-update-modal'
    })
    if (res) this.getLists();
  }

  deleteList(list: List) {
    let path = `users/${this.firebaseSvc.getUid()}/lists/${list.id}`;
    this.utilsSvc.presentLoading();

    this.firebaseSvc.deleteSubCollection(path).then(() => {
      this.lists = this.lists.filter(li => li.id !== list.id);

      this.utilsSvc.presentToast({
        message: 'Lista eliminada éxitosamente.',
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
}
