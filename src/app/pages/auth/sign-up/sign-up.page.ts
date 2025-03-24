import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: false
})
export class SignUpPage implements OnInit {

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)])
  }, { validators: this.confirmPasswordValidator });

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
  }

  confirmPasswordValidator(group: FormGroup){
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    // Si confirmPassword está vacío, solo muestra el error "required"
    if (!confirmPassword.value) {
      confirmPassword.setErrors({ required: true });
      return null;
    }

    // Si confirmPassword tiene algún valor pero no coincide con password
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  async submit(){
    if(this.form.valid){

      const loading = await this.utilsSvc.loading();
      await loading.present();

      this.firebaseSvc.signUp(this.form.value as User).then(async res =>{
        await this.firebaseSvc.updateUser(this.form.value.name);
        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);
        this.setUserInfo(uid);

      }).catch(error => {

        console.log(error);
        const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
        this.utilsSvc.presentToast({
          message: mensaje,
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline'
        })

      }).finally(() => {
        loading.dismiss();
      }); 
    }
  }

  async setUserInfo(uid: string){
    if(this.form.valid){

      const loading = await this.utilsSvc.loading();
      await loading.present();

      let path = `users/${uid}`;
      delete this.form.value.password;
      delete this.form.value.confirmPassword;

      this.firebaseSvc.setDocument(path, this.form.value).then(async res =>{
        this.utilsSvc.saveInLocalStorage('user', this.form.value);
        this.utilsSvc.routerLink('/main/home');
        this.form.reset();
        console.log(res);

      }).catch(error => {

        console.log(error);
        const mensaje = this.firebaseSvc.translateErrorMessage(error.code);
        this.utilsSvc.presentToast({
          message: mensaje,
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: 'alert-circle-outline'
        })

      }).finally(() => {
        loading.dismiss();
      }); 
    }
  }
}
