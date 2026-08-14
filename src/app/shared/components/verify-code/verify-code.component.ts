import { Component, inject, Input } from '@angular/core';
import { TotpService } from 'src/app/services/totp.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrls: ['./verify-code.component.scss'],
  standalone: false
})
export class VerifyCodeComponent {

  utilsSvc = inject(UtilsService);
  totpSvc = inject(TotpService);

  @Input() secreto = '';
  @Input() recuperacion = '';
  @Input() titulo = 'Verificación en dos pasos';
  @Input() descripcion = 'Escribe el código de tu app de autenticación.';

  codigo = '';
  comprobando = false;
  intentos = 0;

  async comprobar(): Promise<void> {
    if (this.comprobando || !this.codigo) return;
    this.comprobando = true;

    try {
      const escrito = this.codigo.trim().toUpperCase();

      // El código de recuperación vale en lugar del de la app: es la salida
      // para quien perdió el móvil. Es de un solo uso.
      if (this.recuperacion && escrito === this.recuperacion.toUpperCase()) {
        await this.utilsSvc.dismissModal({ ok: true, conRecuperacion: true });
        return;
      }

      if (await this.totpSvc.esValido(this.secreto, this.codigo)) {
        await this.utilsSvc.dismissModal({ ok: true, conRecuperacion: false });
        return;
      }

      this.intentos++;
      this.codigo = '';
      this.utilsSvc.presentToast({
        message: this.intentos >= 3
          ? 'Sigue sin coincidir. Revisa la hora de tu móvil o usa el código de recuperación.'
          : 'Código incorrecto.',
        color: 'danger',
        icon: 'alert-circle-outline',
        duration: 2500,
        position: 'middle'
      });

    } finally {
      this.comprobando = false;
    }
  }

  cancelar() {
    this.utilsSvc.dismissModal({ ok: false });
  }
}
