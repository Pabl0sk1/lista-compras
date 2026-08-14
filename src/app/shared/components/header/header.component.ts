import { Component, inject, Input } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent {

  utilsSvc = inject(UtilsService);

  @Input() title!: String;

  /** Muestra la marca en vez del título (cabeceras de dentro de la app) */
  @Input() brand = false;
  @Input() backButton!: String;
  @Input() isModal!: boolean;

  constructor() { }


  dismissModal() {
    this.utilsSvc.dismissModal();
  }
}
