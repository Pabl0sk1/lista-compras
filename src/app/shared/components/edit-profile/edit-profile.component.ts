import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss'],
  standalone: false
})
export class EditProfileComponent implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  user = {} as User;

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl(''),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
  })

  constructor() { }

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');

    this.form.patchValue({
      uid: this.user.uid,
      name: this.user.name,
      email: this.user.email
    });
  }

  submit() {
    if (this.form.valid) {
      this.update();
    }
  }

  update() {
    this.utilsSvc.presentLoading();

    this.firebaseSvc.updateUser(this.form.value.name).then(() => {
      this.updateProfile(this.form.value.uid);

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

  updateProfile(uid: string) {
    let path = `users/${uid}`;

    this.firebaseSvc.setDocument(path, this.form.value).then(() => {
      this.user.name = this.form.value.name;
      this.utilsSvc.saveInLocalStorage('user', this.user);

      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Perfil actualizado éxitosamente.',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500,
        position: 'middle'
      })
      this.utilsSvc.dismissLoading();

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
}
