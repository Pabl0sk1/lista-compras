import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, ActionSheetOptions, AlertController, AlertOptions, LoadingController, LoadingOptions, ModalController, ModalOptions, ToastController, ToastOptions } from '@ionic/angular';
import { Item, List } from '../models/list.model';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  loadingCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  router = inject(Router);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  actionSheetCtrl = inject(ActionSheetController);

  //Loading
  loading() {
    return this.loadingCtrl.create({
      spinner: 'crescent',
      cssClass: 'custom-load'
    });
  }

  async presentLoading(opts: LoadingOptions = {
    spinner: 'crescent',
    cssClass: 'custom-load'

  }) {
    const loading = await this.loadingCtrl.create(opts);
    await loading.present();
  }

  async dismissLoading() {
    return await this.loadingCtrl.dismiss();
  }

  //Toast
  async presentToast(opts?: ToastOptions) {
    const toast = await this.toastCtrl.create(opts);
    toast.present();
  }

  routerLink(url: string) {
    return this.router.navigateByUrl(url);
  }

  saveInLocalStorage(key: string, value: any) {
    return localStorage.setItem(key, JSON.stringify(value));
  }

  getFromLocalStorage(key: string) {
    // localStorage lo puede manipular el usuario: un JSON inválido no debe
    // tumbar la app entera con una excepción sin capturar.
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  //Alerta cerrar sesión
  async presentAlert(opts: AlertOptions) {
    const alert = await this.alertCtrl.create(opts);
    await alert.present();
  }

  async presentActionSheet(opts: ActionSheetOptions) {
    const sheet = await this.actionSheetCtrl.create(opts);
    await sheet.present();
    return sheet.onWillDismiss();
  }

  /**
   * Recorta la imagen a un cuadrado centrado, la reduce a `lado` px y la
   * devuelve como data URL JPEG.
   *
   * Se hace en el cliente a propósito: la foto se guarda dentro del documento
   * de Firestore, así que subir el original de varios MB no cabría (límite de
   * 1 MiB por documento) y además gastaría datos del usuario para nada.
   */
  async imagenADataUrl(file: File, lado = 256, calidad = 0.75): Promise<string> {
    const bitmap = await createImageBitmap(file);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = lado;
    const ctx = canvas.getContext('2d');

    // Recorte cuadrado centrado: así no se deforma la foto
    const menor = Math.min(bitmap.width, bitmap.height);
    const x = (bitmap.width - menor) / 2;
    const y = (bitmap.height - menor) / 2;
    ctx.drawImage(bitmap, x, y, menor, menor, 0, 0, lado, lado);
    bitmap.close?.();

    return canvas.toDataURL('image/jpeg', calidad);
  }

  //Agregar o actualizar lista
  async presentModal(opts: ModalOptions) {
    const modal = await this.modalCtrl.create(opts);
    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) return data;
  }

  dismissModal(data?: any) {
    return this.modalCtrl.dismiss(data);
  }

  //Calcular porcentaje
  getPercentaje(list: Item[]) {
    if (!list?.length) return 0; // evita el NaN de dividir entre 0
    const completedItems = list.filter(item => item.completed).length;
    // floor, no round: con round una lista al 99,5% se marcaría como "Completo"
    return Math.floor((completedItems / list.length) * 100);
  }
}
