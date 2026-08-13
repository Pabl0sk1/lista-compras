import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { initializeApp } from '@angular/fire/app';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Se inicializa ANTES del bootstrap: los providers de @angular/fire son
// perezosos (solo corren si alguien inyecta FirebaseApp, cosa que este codigo
// no hace), asi que por si solos dejaban la app sin inicializar y los guards
// fallaban con "No Firebase App '[DEFAULT]' has been created".
//
// IMPORTANTE: importar desde '@angular/fire/app' y NO desde 'firebase/app'.
// @angular/fire declara firebase ^11, y package.json pide ^12, asi que npm
// instala DOS copias del SDK, cada una con su propio registro de apps.
// Registrarla en la copia equivocada hacia que Auth la encontrara y Firestore
// no. Por lo mismo, todo el codigo importa Firebase via @angular/fire.
initializeApp(environment.firebaseConfig);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
