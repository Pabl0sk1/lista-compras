import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  standalone: false
})
export class LogoComponent {

  /** sm: horizontal, para cabeceras · md: por defecto · lg: pantallas de bienvenida */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Muestra el lema bajo el nombre */
  @Input() tagline = false;
}
