import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  standalone: false
})
export class ChangePasswordComponent {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  form = new FormGroup({
    actual: new FormControl('', [Validators.required]),
    nueva: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      // Al menos una letra y un número, igual que en el registro
      Validators.pattern(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/)
    ]),
    confirmar: new FormControl('', [Validators.required])
  }, { validators: ChangePasswordComponent.validarCoincidencia });

  /** La confirmación debe coincidir, y la nueva ser distinta de la actual */
  static validarCoincidencia(grupo: AbstractControl) {
    const actual = grupo.get('actual');
    const nueva = grupo.get('nueva');
    const confirmar = grupo.get('confirmar');
    if (!nueva || !confirmar || !actual) return null;

    if (confirmar.value && nueva.value !== confirmar.value) {
      confirmar.setErrors({ ...confirmar.errors, noCoincide: true });
    } else if (confirmar.errors?.['noCoincide']) {
      const { noCoincide, ...resto } = confirmar.errors;
      confirmar.setErrors(Object.keys(resto).length ? resto : null);
    }

    return actual.value && nueva.value && actual.value === nueva.value
      ? { mismaContrasena: true }
      : null;
  }

  async submit() {
    if (this.form.invalid) return;

    await this.utilsSvc.presentLoading();

    try {
      await this.firebaseSvc.changePassword(this.form.value.actual, this.form.value.nueva);

      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Contraseña actualizada correctamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 2000,
        position: 'middle'
      });

    } catch (error) {
      // Un fallo de reautenticación significa contraseña actual incorrecta:
      // conviene decirlo claro y no con el mensaje genérico de login.
      const codigo = error?.code;
      const mensaje = ['auth/invalid-credential', 'auth/wrong-password'].includes(codigo)
        ? 'La contraseña actual no es correcta.'
        : this.firebaseSvc.translateErrorMessage(codigo);

      this.utilsSvc.presentToast({
        message: mensaje,
        color: 'danger',
        icon: 'alert-circle-outline',
        duration: 3000,
        position: 'middle'
      });

    } finally {
      this.utilsSvc.dismissLoading();
    }
  }
}
