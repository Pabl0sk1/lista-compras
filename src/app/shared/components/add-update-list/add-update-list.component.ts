import { Component, inject, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Item, List, ListStatus } from 'src/app/models/list.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Timestamp } from 'firebase/firestore';

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
  tempItems: Item[] = [];

  form = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', [Validators.required]),
    status: new FormControl(ListStatus.Active, [Validators.required]),
    dateHour: new FormControl(this.formatDate(Timestamp.now()), [Validators.required]),
    items: new FormControl([])
  })

  constructor() { }

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');

    if (this.list) {
      this.form.setValue(this.list);
      this.form.updateValueAndValidity();
      this.tempItems = this.list.items.map(item => ({ ...item }));
    }
  }

  submit() {
    if (this.form.valid) {
      this.form.patchValue({ items: this.tempItems });
      this.updateStatus();
      if (this.list) this.updateList();
      else this.createList();
    }
  }

  toggleItemCompleted(index: number, event: any) {
    this.tempItems[index].completed = event.detail.checked;
  }

  updateStatus() {
    if (this.getPercentaje() == 100) {
      this.form.value.status = ListStatus.Completed;
    } else {
      this.form.value.status = ListStatus.Active;
    }
  }

  formatDate(dateHour: any): string {
    if (!dateHour) return '';

    // Si es un Timestamp de Firebase
    if (dateHour instanceof Timestamp) {
      let localDate = dateHour.toDate();
      localDate.setHours(localDate.getHours() - 3); // Restar 3 horas
      return this.formatToISO8601(localDate);
    }

    // Si es un objeto con `seconds` (Firestore lo devuelve así en algunas ocasiones)
    if (typeof dateHour === 'object' && dateHour.seconds) {
      let localDate = new Date(dateHour.seconds * 1000);
      localDate.setHours(localDate.getHours() - 3); // Restar 3 horas
      return this.formatToISO8601(localDate);
    }

    // Si es un string, intentar convertirlo a fecha
    if (typeof dateHour === 'string') {
      let parsedDate = new Date(dateHour);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setHours(parsedDate.getHours() - 3); // Restar 3 horas
        return this.formatToISO8601(parsedDate);
      }
    }

    return '';
  }

  formatToISO8601(date: Date): string {
    // Convertir la fecha a formato ISO 8601: YYYY-MM-DDTHH:mm:ss
    return date.toISOString().slice(0, 16); // Recorta la cadena para que sea del tipo YYYY-MM-DDTHH:mm
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
    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;
    const movedItem = this.tempItems.splice(fromIndex, 1)[0];
    this.tempItems.splice(toIndex, 0, movedItem);
    event.detail.complete();
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
            if (!res.name || !res.name.trim().length) {
              this.utilsSvc.presentToast({
                message: 'La descripción no puede estar vacía.',
                color: 'danger',
                icon: 'warning-outline',
                duration: 2000,
                position: 'middle'
              })
              this.createItem();
            } else {
              let item: Item = { name: res.name, completed: false };
              this.tempItems.unshift(item);
            }
          }
        }
      ]
    })
  }

  removeItem(index: number) {
    this.tempItems.splice(index, 1);
  }
}
