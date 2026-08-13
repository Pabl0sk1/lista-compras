import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EditProfileComponent } from 'src/app/shared/components/edit-profile/edit-profile.component';
import { ChangePasswordComponent } from 'src/app/shared/components/change-password/change-password.component';
import { Tema, ThemeService } from 'src/app/services/theme.service';
import { orderBy } from '@angular/fire/firestore';
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
  themeSvc = inject(ThemeService);

  @ViewChild('selectorFoto') selectorFoto!: ElementRef<HTMLInputElement>;

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.getUser();
    this.getLists();
  }

  async getUser() {
    return this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;
  }

  /** Inicial para el avatar, cuando aún no hay nombre cae al correo */
  inicial(): string {
    return (this.user?.name || this.user?.email || '?').trim().charAt(0).toUpperCase();
  }

  // ---- Tema ----
  get tema(): Tema {
    return this.themeSvc.tema;
  }

  cambiarTema(event: CustomEvent) {
    this.themeSvc.setTema(event.detail.value as Tema);
  }

  // ---- Foto de perfil ----
  async opcionesFoto() {
    const botones: any[] = [
      {
        text: this.user.photo ? 'Cambiar foto' : 'Elegir foto',
        icon: 'image-outline',
        handler: () => this.selectorFoto.nativeElement.click()
      }
    ];

    if (this.user.photo) {
      botones.push({
        text: 'Eliminar foto',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => this.eliminarFoto()
      });
    }

    botones.push({ text: 'Cancelar', icon: 'close-outline', role: 'cancel' });

    await this.utilsSvc.presentActionSheet({
      header: 'Foto de perfil',
      cssClass: 'custom-sheet',
      mode: 'ios',
      buttons: botones
    });
  }

  async fotoElegida(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Se limpia siempre: si no, elegir el mismo archivo dos veces no dispara change
    input.value = '';
    if (!file) return;

    // Descarte temprano: decodificar un archivo enorme puede tumbar la pestaña
    if (file.size > 12 * 1024 * 1024) {
      return this.avisar('La imagen es demasiado grande (máximo 12 MB).', 'warning');
    }

    try {
      await this.utilsSvc.presentLoading();
      const dataUrl = await this.utilsSvc.imagenADataUrl(file);
      await this.guardarPerfil({ ...this.user, photo: dataUrl });
      this.avisar('Foto actualizada.', 'success');
    } catch (error) {
      this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
    } finally {
      this.utilsSvc.dismissLoading();
    }
  }

  eliminarFoto() {
    this.utilsSvc.presentAlert({
      header: 'Eliminar foto',
      message: '¿Quieres quitar tu foto de perfil?',
      cssClass: 'custom-alert peligro',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Eliminar',
          cssClass: 'logout-button',
          handler: async () => {
            try {
              await this.utilsSvc.presentLoading();
              const { photo, ...sinFoto } = this.user;
              await this.guardarPerfil(sinFoto as User);
              this.avisar('Foto eliminada.', 'success');
            } catch (error) {
              this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
            } finally {
              this.utilsSvc.dismissLoading();
            }
          }
        }
      ]
    });
  }

  /** Guarda el perfil completo y refresca la copia local */
  private async guardarPerfil(user: User) {
    const uid = this.firebaseSvc.getUid();
    const perfil: any = { uid, email: user.email, name: user.name };
    if (user.photo) perfil.photo = user.photo;

    await this.firebaseSvc.setDocument(`users/${uid}`, perfil);
    this.user = perfil;
    this.utilsSvc.saveInLocalStorage('user', perfil);
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

  //Editar Perfil
  async editProfile() {
    let res = await this.utilsSvc.presentModal({
      component: EditProfileComponent,
      cssClass: 'add-update-modal'
    })
    if (res) this.getUser();
  }

  //Cambiar contraseña
  changePassword() {
    return this.utilsSvc.presentModal({
      component: ChangePasswordComponent,
      cssClass: 'add-update-modal'
    });
  }

  async confirmDeleteLists() {
    this.utilsSvc.presentAlert({
      header: 'Eliminar Todas las Listas',
      message: '¿Deseas eliminar todas tus listas?',
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
