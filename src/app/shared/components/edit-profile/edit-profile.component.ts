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

  async ngOnInit() {
    this.user = await this.firebaseSvc.ensureLocalUser() ?? {} as User;

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
      // uid de la sesión, no el del formulario (que viene de localStorage)
      this.updateProfile(this.firebaseSvc.getUid());

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

    // Payload explícito: uid y email se toman de la sesión, no del formulario
    const profile = {
      uid,
      email: this.firebaseSvc.getAuth().currentUser?.email ?? this.form.value.email,
      name: this.form.value.name
    };

    this.firebaseSvc.setDocument(path, profile).then(() => {
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
