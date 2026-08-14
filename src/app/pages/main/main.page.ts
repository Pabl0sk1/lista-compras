import { Component } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
  standalone: false
})
export class MainPage {

  pages = [
    { title: 'Inicio', url: 'home', icon: 'home-outline' },
    { title: 'Perfil', url: 'profile', icon: 'person-outline' }
  ]

  constructor() { }

}
