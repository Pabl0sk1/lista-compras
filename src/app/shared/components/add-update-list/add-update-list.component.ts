import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Item, List, ListStatus } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-list',
  templateUrl: './add-update-list.component.html',
  styleUrls: ['./add-update-list.component.scss'],
  standalone: false
})
export class AddUpdateListComponent implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  @Input() list: List;

  user = {} as User;

  form = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', [Validators.required]),
    status: new FormControl(ListStatus.Active, [Validators.required]),
    dateHour: new FormControl(null, [Validators.required]),
    items: new FormControl([], [Validators.required, Validators.minLength(1)])
  })

  constructor() { }

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');

    if (this.list) {
      this.form.setValue(this.list);
      this.form.updateValueAndValidity();
    }
  }

  submit() {
    if (this.form.valid) {
      this.updateStatus();
      if (this.list) this.updateList();
      else this.createList();
    }
  }

  updateStatus() {
    if (this.getPercentaje() == 100) {
      this.form.value.status = ListStatus.Completed;
    } else {
      this.form.value.status = ListStatus.Active;
    }
  }

  createList() {
    let path = `users/${this.user.uid}/lists`;
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.addToSubcollection(path, this.form.value).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Lista creada éxitosamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      })
      this.utilsSvc.dismissLoading()

    }, error => {

      const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
      this.utilsSvc.presentToast({
        message: mensaje,
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000,
        position: 'middle'
      })
    });
  }

  updateList() {
    let path = `users/${this.user.uid}/lists/${this.list.id}`;
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.updateSubCollection(path, this.form.value).then(() => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Lista actualizada éxitosamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      })
      this.utilsSvc.dismissLoading()

    }, error => {

      const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
      this.utilsSvc.presentToast({
        message: mensaje,
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000,
        position: 'middle'
      })
    });
  }

  getPercentaje() {
    return this.utilsSvc.getPercentaje(this.form.value as List);
  }

  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    this.form.value.items = event.detail.complete(this.form.value.items);
    this.form.updateValueAndValidity();
  }

  createItem() {
    this.utilsSvc.presentAlert({
      header: 'Nuevo Item',
      cssClass: 'custom-alert',
      mode: 'ios',
      inputs: [
        {
          name: 'name',
          type: 'textarea',
          placeholder: 'Escribe...',
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'cancel-button'
        }, {
          text: 'Agregar',
          cssClass: 'logout-button',
          handler: (res) => {
            let item: Item = { name: res.name, completed: false };
            this.form.value.items.push(item);
            this.form.controls.items.updateValueAndValidity();
          }
        }
      ]
    })
  }

  removeItem(index: number) {
    this.form.value.items.splice(index, 1);
    this.form.controls.items.updateValueAndValidity();
  }
}
