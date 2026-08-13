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

  async getUser() {
    return this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;
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
    let path = `users/${this.firebaseSvc.getUid()}/lists`;

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
    let path = `users/${this.firebaseSvc.getUid()}/lists/${listId}`;
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

  deleteAccount = async () => {
    const currentUser = this.firebaseSvc.getAuth().currentUser;

    if (!currentUser) {
      await this.firebaseSvc.signOut();
      return;
    }

    try {
      await this.utilsSvc.presentLoading();

      // Orden importante: primero los datos (mientras hay sesión y permisos),
      // después la cuenta. Borrar la cuenta antes dejaría las listas huérfanas
      // en Firestore para siempre, porque las subcolecciones no se borran solas.
      await Promise.all(this.lists.map((li) => this.deleteList(li.id)));
      await this.firebaseSvc.deleteSubCollection(`users/${currentUser.uid}`);
      await deleteUser(currentUser);

      localStorage.removeItem('user');
      this.utilsSvc.routerLink('/auth');
      this.utilsSvc.presentToast({
        message: 'Cuenta eliminada correctamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      });

    } catch (error) {
      // Firebase exige una sesión reciente para borrar una cuenta
      const mensaje = error?.code === 'auth/requires-recent-login'
        ? 'Por seguridad, vuelve a iniciar sesión antes de eliminar tu cuenta.'
        : this.firebaseSvc.translateErrorMessage(error?.code);

      this.utilsSvc.presentToast({
        message: mensaje,
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000,
        position: 'middle'
      });

      if (error?.code === 'auth/requires-recent-login') await this.firebaseSvc.signOut();

    } finally {
      this.utilsSvc.dismissLoading();
    }
  }
}
