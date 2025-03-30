import { Component, inject, OnInit } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateListComponent } from 'src/app/shared/components/add-update-list/add-update-list.component';

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
    this.getLists();
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getPercentaje(list: List) {
    return this.utilsSvc.getPercentaje(list);
  }

  async confirmDeleteList(list: List) {
    this.utilsSvc.presentAlert({
      header: 'Eliminar Lista',
      message: '¿Deseas eliminar la lista?',
      cssClass: 'custom-alert',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'cancel-button'
        }, {
          text: 'Eliminar',
          cssClass: 'logout-button',
          handler: () => {
            this.deleteList(list);
          }
        }
      ]
    });
  }

  getLists() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    this.loading = true;
    let path = `users/${this.user.uid}/lists`;
    let sub = this.firebaseSvc.getSubcollection(path).subscribe({
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
    this.user = this.utilsSvc.getFromLocalStorage('user');
    let path = `users/${this.user.uid}/lists/${list.id}`;
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
