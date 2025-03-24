import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnInit {

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  })

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
  }

  async submit(){
    if(this.form.valid){

      const loading = await this.utilsSvc.loading();
      await loading.present();

      this.firebaseSvc.sendRecoveryEmail(this.form.value.email).then(() =>{
        this.utilsSvc.presentToast({
          message: `Correo enviado con éxito.`,
          duration: 1500,
          color: 'success',
          position: 'middle',
          icon: 'mail-outline'
        });
        
        this.utilsSvc.routerLink('/auth');
        this.form.reset();

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
