import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { LogoComponent } from './components/logo/logo.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AddUpdateListComponent } from './components/add-update-list/add-update-list.component';
import { CustomInputListComponent } from './components/custom-input-list/custom-input-list.component';
import { EditProfileComponent } from './components/edit-profile/edit-profile.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { TwoFactorComponent } from './components/two-factor/two-factor.component';
import { VerifyCodeComponent } from './components/verify-code/verify-code.component';
import { ShoppingModeComponent } from './components/shopping-mode/shopping-mode.component';
import { PapeleraComponent } from './components/papelera/papelera.component';
import { EstadisticasComponent } from './components/estadisticas/estadisticas.component';

@NgModule({
  declarations: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    AddUpdateListComponent,
    EditProfileComponent,
    CustomInputListComponent,
    ChangePasswordComponent,
    TwoFactorComponent,
    VerifyCodeComponent,
    ShoppingModeComponent,
    PapeleraComponent,
    EstadisticasComponent
  ],
  exports: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    AddUpdateListComponent,
    EditProfileComponent,
    CustomInputListComponent,
    ChangePasswordComponent,
    TwoFactorComponent,
    VerifyCodeComponent,
    ShoppingModeComponent,
    PapeleraComponent,
    EstadisticasComponent,
    ReactiveFormsModule
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class SharedModule { }
