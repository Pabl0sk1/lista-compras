import { Component, inject, Input } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

/** Días que se conserva una lista borrada antes de desaparecer de verdad */
const DIAS = 30;

@Component({
  selector: 'app-papelera',
  templateUrl: './papelera.component.html',
  styleUrls: ['./papelera.component.scss'],
  standalone: false
})
export class PapeleraComponent {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  @Input() listas: List[] = [];

  DIAS = DIAS;

  diasRestantes(list: List): number {
    const borrada = new Date(list.deletedAt ?? '').getTime();
    if (isNaN(borrada)) return DIAS;
    const pasados = Math.floor((Date.now() - borrada) / 86400000);
    return Math.max(0, DIAS - pasados);
  }

  async restaurar(list: List) {
    try {
      await this.utilsSvc.presentLoading();
      await this.firebaseSvc.restaurarDeLaPapelera(`users/${this.firebaseSvc.getUid()}/lists/${list.id}`);
      this.listas = this.listas.filter(l => l.id !== list.id);
      this.avisar(`"${list.title}" restaurada.`, 'success');
    } catch {
      this.avisar('No se pudo restaurar.', 'danger');
    } finally {
      this.utilsSvc.dismissLoading();
    }
  }

  borrarDefinitivo(list: List) {
    this.utilsSvc.presentAlert({
      header: 'Borrar para siempre',
      message: `"${list.title}" no se podrá recuperar.`,
      cssClass: 'custom-alert peligro',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Borrar',
          cssClass: 'logout-button',
          handler: async () => {
            await this.destruir(list);
            this.avisar('Borrada definitivamente.', 'success');
          }
        }
      ]
    });
  }

  vaciar() {
    if (!this.listas.length) return;

    this.utilsSvc.presentAlert({
      header: 'Vaciar papelera',
      message: `Se borrarán ${this.listas.length} listas para siempre.`,
      cssClass: 'custom-alert peligro',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'cancel-button' },
        {
          text: 'Vaciar',
          cssClass: 'logout-button',
          handler: async () => {
            await this.utilsSvc.presentLoading();
            await Promise.all([...this.listas].map(l => this.destruir(l)));
            this.utilsSvc.dismissLoading();
            this.avisar('Papelera vacía.', 'success');
          }
        }
      ]
    });
  }

  private async destruir(list: List) {
    await this.firebaseSvc.deleteSubCollection(`users/${this.firebaseSvc.getUid()}/lists/${list.id}`);
    this.listas = this.listas.filter(l => l.id !== list.id);
  }

  cerrar() {
    this.utilsSvc.dismissModal();
  }

  private avisar(message: string, color: string) {
    this.utilsSvc.presentToast({
      message, color,
      icon: color === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline',
      duration: 2000, position: 'middle'
    });
  }
}
