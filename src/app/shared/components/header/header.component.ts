import { Component, inject, Input, OnInit } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {

  utilsSvc = inject(UtilsService);

  @Input() title!: String;

  /** Muestra la marca en vez del título (cabeceras de dentro de la app) */
  @Input() brand = false;
  @Input() backButton!: String;
  @Input() isModal!: boolean;

  constructor() { }

  ngOnInit() { }

  dismissModal() {
    this.utilsSvc.dismissModal();
  }
}
