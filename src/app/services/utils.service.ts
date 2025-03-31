import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, AlertOptions, LoadingController, LoadingOptions, ModalController, ModalOptions, ToastController, ToastOptions } from '@ionic/angular';
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
    return JSON.parse(localStorage.getItem(key));
  }

  //Alerta cerrar sesión
  async presentAlert(opts: AlertOptions) {
    const alert = await this.alertCtrl.create(opts);
    await alert.present();
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
    let completedItems = list.filter(item => item.completed).length;
    let totalItems = list.length;
    let per = (100 / totalItems) * completedItems;
    return parseInt(per.toString());
  }
}
