import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { VerifyCodeComponent } from 'src/app/shared/components/verify-code/verify-code.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false
})
export class AuthPage {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  })

  constructor() { }


  ionViewWillEnter() {
    this.form.reset();
  }

  async submit() {
    if (this.form.valid) {

      const loading = await this.utilsSvc.loading();
      await loading.present();

      this.firebaseSvc.signIn(this.form.value as User).then((res) => {
        if (res.user.emailVerified) {
          this.getUserInfo(res.user.uid);
        } else {
          this.utilsSvc.presentToast({
            message: 'Debes verificar tu correo electrónico antes de iniciar sesión.',
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: 'alert-circle-outline'
          })
        }

      }).catch(error => {

        // Escribir mal el correo o la contraseña no es un fallo del programa:
        // el aviso ya lo explica y volcar el error entero solo ensucia la
        // consola. Lo inesperado sí se registra, que es cuando hace falta.
        const esperados = ['auth/invalid-credential', 'auth/wrong-password',
          'auth/user-not-found', 'auth/invalid-email', 'auth/missing-password'];
        if (!esperados.includes(error?.code)) console.error(error);

        const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
        this.utilsSvc.presentToast({
          message: mensaje,
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline'
        })

      }).finally(() => {
        loading.dismiss();
      });
    }
  }

  /**
   * Pide el código de la app de autenticación. Si no lo supera se cierra la
   * sesión: dejar la sesión de Firebase abierta tras fallar el segundo factor
   * dejaría entrar recargando la página.
   */
  private async pedirSegundoFactor(user: User): Promise<boolean> {
    const res = await this.utilsSvc.presentModal({
      component: VerifyCodeComponent,
      componentProps: {
        secreto: user.twoFactor?.secret,
        recuperacion: user.twoFactor?.recovery
      },
      backdropDismiss: false,
      cssClass: 'add-update-modal'
    });

    if (!res?.ok) {
      await this.firebaseSvc.clearSession();
      return false;
    }

    // El código de recuperación es de un solo uso: al gastarlo se desactiva
    // la verificación para que el usuario no se quede fuera.
    if (res.conRecuperacion) {
      await this.firebaseSvc.guardarDosFactores(null);
      this.utilsSvc.presentToast({
        message: 'Has usado tu código de recuperación. La verificación en dos pasos se ha desactivado.',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000,
        position: 'middle'
      });
    }

    return true;
  }

  async getUserInfo(uid: string) {
    if (this.form.valid) {

      const loading = await this.utilsSvc.loading();
      await loading.present();

      let path = `users/${uid}`;

      this.firebaseSvc.getDocument(path).then(async (user: User) => {

        // Segundo factor, si el usuario lo tiene activado
        if (user?.twoFactor?.enabled) {
          loading.dismiss();
          const superado = await this.pedirSegundoFactor(user);
          if (!superado) return;
          await loading.present();
        }

        this.firebaseSvc.guardarPerfilLocal(user);
        this.firebaseSvc.marcarDosFactoresSuperado();
        this.utilsSvc.routerLink('/main/home');
        this.form.reset();

        this.utilsSvc.presentToast({
          message: `Te damos la bienvenida ${user.name}.`,
          duration: 1500,
          color: 'success',
          position: 'middle',
          icon: 'person-circle-outline'
        })

      }).catch(error => {

        console.log(error);
        const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
        this.utilsSvc.presentToast({
          message: mensaje,
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline'
        })

      }).finally(() => {
        loading.dismiss();
      });
    }
  }
}
