import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { initializeApp } from 'firebase/app';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Se inicializa ANTES del bootstrap y con el paquete `firebase/app` crudo, que
// es el mismo registro que consultan getAuth() y getFirestore() en
// FirebaseService. Los providers de @angular/fire son perezosos: solo corren si
// alguien inyecta FirebaseApp, cosa que este codigo no hace, asi que por si
// solos dejaban la app sin inicializar y los guards fallaban con
// "No Firebase App '[DEFAULT]' has been created".
initializeApp(environment.firebaseConfig);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
