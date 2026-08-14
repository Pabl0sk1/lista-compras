import { Component, inject, OnInit } from '@angular/core';
import qrcode from 'qrcode-generator';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { TotpService } from 'src/app/services/totp.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-two-factor',
  templateUrl: './two-factor.component.html',
  styleUrls: ['./two-factor.component.scss'],
  standalone: false
})
export class TwoFactorComponent implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  totpSvc = inject(TotpService);

  user = {} as User;

  secreto = '';
  recuperacion = '';
  qr = '';
  codigo = '';
  comprobando = false;

  /** escanear -> confirmar el código -> guardar el código de recuperación */
  paso: 1 | 2 = 1;

  async ngOnInit() {
    this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;

    this.secreto = this.totpSvc.generarSecreto();
    this.recuperacion = this.totpSvc.generarRecuperacion();

    const uri = this.totpSvc.uri(this.secreto, this.user.email ?? '');
    const codigoQr = qrcode(0, 'M');
    codigoQr.addData(uri);
    codigoQr.make();
    this.qr = codigoQr.createDataURL(6, 2);
  }

  get secretoLegible(): string {
    return this.totpSvc.legible(this.secreto);
  }

  /**
   * Se exige un código correcto ANTES de activar. Si se activara sin
   * comprobarlo, un QR mal escaneado dejaría al usuario fuera de su cuenta.
   */
  async confirmar() {
    if (this.comprobando) return;
    this.comprobando = true;

    try {
      if (!await this.totpSvc.esValido(this.secreto, this.codigo)) {
        this.avisar('Ese código no es correcto. Revisa que sea el actual.', 'danger');
        return;
      }

      await this.utilsSvc.presentLoading();
      await this.firebaseSvc.guardarDosFactores({
        enabled: true,
        secret: this.secreto,
        recovery: this.recuperacion
      });

      this.paso = 2;

    } catch (error) {
      this.avisar(this.firebaseSvc.translateErrorMessage(error?.code), 'danger');
    } finally {
      this.comprobando = false;
      this.utilsSvc.dismissLoading();
    }
  }

  async copiarRecuperacion() {
    try {
      await navigator.clipboard.writeText(this.recuperacion);
      this.avisar('Código copiado.', 'success');
    } catch {
      this.avisar('No se pudo copiar. Apúntalo a mano.', 'warning');
    }
  }

  cerrar() {
    this.utilsSvc.dismissModal({ activado: this.paso === 2 });
  }

  private avisar(message: string, color: string) {
    this.utilsSvc.presentToast({
      message, color,
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline',
      duration: 2500,
      position: 'middle'
    });
  }
}
