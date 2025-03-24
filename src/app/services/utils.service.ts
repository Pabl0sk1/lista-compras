import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, AlertOptions, LoadingController, ToastController, ToastOptions } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  loadingCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  router = inject(Router);
  alertCtrl = inject(AlertController);

  //Loading
  loading() {
    return this.loadingCtrl.create({
      spinner: 'crescent',
      cssClass: 'custom-load'
    });
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

  //Alerta
  async presentAlert(opts: AlertOptions) {
    const alert = await this.alertCtrl.create(opts);
    await alert.present();
  }
}
