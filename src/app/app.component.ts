import { Component, inject } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { PwaService } from './services/pwa.service';
import { NetworkService } from './services/network.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {

  networkSvc = inject(NetworkService);

  constructor() {
    // Con el tema en "Sistema", seguir los cambios del sistema en caliente
    inject(ThemeService).escucharSistema();

    // Hay que escuchar desde el arranque: el evento de instalación se dispara
    // una sola vez y muy pronto, mucho antes de que se abra el perfil.
    inject(PwaService).escuchar();

    this.networkSvc.escuchar();
  }
}
