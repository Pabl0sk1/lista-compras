import { Component, inject, OnInit } from '@angular/core';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {

  firebaseSvc = inject(FirebaseService);

  ngOnInit() {
  }

  //Cerrar Sesión
  signOut() {
    this.firebaseSvc.signOut();
  }
}
