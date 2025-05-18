import { Component, inject, OnInit } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EditProfileComponent } from 'src/app/shared/components/edit-profile/edit-profile.component';
import { orderBy } from 'firebase/firestore';
import { deleteUser } from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {

  user = {} as User;
  lists: List[] = [];

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.getUser();
    this.getLists();
  }

  getUser() {
    return this.user = this.utilsSvc.getFromLocalStorage('user');
  }

  //Editar Perfil
  async editProfile() {
    let res = await this.utilsSvc.presentModal({
      component: EditProfileComponent,
      cssClass: 'add-update-modal'
    })
    if (res) this.getUser();
  }

  async confirmDeleteLists() {
    this.utilsSvc.presentAlert({
      header: 'Eliminar Todas las Listas',
      message: '¿Deseas eliminar todas tus listas?',
      cssClass: 'custom-alert',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'cancel-button'
        }, {
          text: 'Confirmar',
          cssClass: 'logout-button',
          handler: async () => {
            try {
              await this.utilsSvc.presentLoading();
              const deletePromises = this.lists.map((li) => this.deleteList(li.id));
              await Promise.all(deletePromises);

              this.lists = []; // Vaciar la lista en la UI
              this.utilsSvc.presentToast({
                message: 'Listas eliminadas éxitosamente.',
                color: 'success',
                icon: 'checkmark-circle-outline',
                duration: 1500,
                position: 'middle'
              });

            } catch (error) {

              const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
              this.utilsSvc.presentToast({
                message: mensaje,
                color: 'warning',
                icon: 'alert-circle-outline',
                duration: 5000,
                position: 'middle'
              })
            } finally {
              this.utilsSvc.dismissLoading();
            }
          }
        }
      ]
    });
  }

  getLists() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    let path = `users/${this.user.uid}/lists`;

    let query = [
      orderBy('dateHour', 'desc')
    ];

    let sub = this.firebaseSvc.getSubcollection(path, query).subscribe({
      next: (res: List[]) => {
        this.lists = res;
        sub.unsubscribe();
      },
      error: (err) => {
        console.error('Error al obtener listas:', err);
      }
    });
  }

  deleteList(listId: string) {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    let path = `users/${this.user.uid}/lists/${listId}`;
    return this.firebaseSvc.deleteSubCollection(path);
  }

  //Cerrar sesión
  signOut() {
    this.utilsSvc.presentAlert({
      header: 'Cerrar Sesión',
      message: '¿Deseas cerrar sesión?',
      cssClass: 'custom-alert',
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
            this.firebaseSvc.signOut();
          }
        }
      ]
    });
  }

  //EliminarCuenta
  confirmDeleteAccount() {
    this.utilsSvc.presentAlert({
      header: 'Eliminar Cuenta',
      message: '¿Deseas eliminar su cuenta?',
      cssClass: 'custom-alert',
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
            this.deleteAccount();
          }
        }
      ]
    });
  }

  deleteAccount = () => {
    const user = this.firebaseSvc.getAuth().currentUser;
    if (user) {
      deleteUser(user).then(() => {
        this.utilsSvc.routerLink('/auth');
        this.utilsSvc.presentToast({
          message: 'Cuenta eliminada correctamente.',
          color: 'success',
          icon: 'checkmark-circle-outline',
          duration: 1500,
          position: 'middle'
        });
      }).catch((error) => {
        console.log('Error al eliminar cuenta:', error.message);
      });
    } else {
      console.log('No hay usuario autenticado para eliminar.');
    }
  }
}
