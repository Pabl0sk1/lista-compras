# Seguridad — ShopEasy

## ⚠️ Paso obligatorio: desplegar las reglas de Firestore

El archivo `firestore.rules` **no hace nada hasta que se despliega**. Hasta entonces
siguen activas las reglas que haya ahora mismo en el proyecto de Firebase (si el
proyecto se creó en "modo de prueba", cualquier persona con la config pública de la
app puede leer y escribir toda la base de datos).

```bash
npm install -g firebase-tools     # si no lo tienes
firebase login
firebase deploy --only firestore:rules
```

Para verificar que quedaron aplicadas: consola de Firebase → Firestore Database → Reglas.

## Qué protegen las reglas

- `users/{uid}` y `users/{uid}/lists/**` solo son accesibles por ese mismo usuario.
- Se exige el correo verificado para todo, salvo la creación del perfil en el registro
  (en ese momento el usuario todavía no verificó).
- El perfil solo admite `uid`, `email` y `name`; el `email` debe coincidir con el del
  token de sesión. Así una contraseña nunca puede acabar guardada en el perfil ni se
  puede suplantar el correo de otra cuenta.
- Las listas validan tipos, `status` ∈ {Activo, Completo}, título ≤ 100 caracteres y
  ≤ 200 items.
- Todo lo que no esté contemplado queda denegado (`match /{document=**}`).

## Sobre la apiKey en `src/environments/`

**No es un secreto y no hace falta ocultarla.** En Firebase Web la `apiKey` solo
identifica al proyecto; quien protege los datos son las reglas de Firestore y la
autenticación. Google lo documenta así expresamente. Esconderla en variables de
entorno no aporta seguridad porque igualmente viaja en el bundle del navegador.

Lo que sí conviene hacer en la consola de Google Cloud / Firebase:

## Pendientes en la consola (no se pueden hacer desde el código)

1. **Restringir la API key** — Google Cloud Console → APIs y servicios → Credenciales →
   la clave del navegador → *Restricciones de aplicación* → Sitios web, y añadir
   `lista-compras-fa747.web.app`, `lista-compras-fa747.firebaseapp.com` y `localhost`.
   Evita que se use la clave desde otros dominios.

2. **App Check** (recomendado) — Firebase Console → App Check → registrar la app web con
   reCAPTCHA v3 y aplicar *enforcement* a Firestore. Impide que alguien hable con tu
   base de datos desde fuera de la app (scripts, curl, etc.).

3. **Protección contra enumeración de correos** — Firebase Console → Authentication →
   Configuración → *Protección de enumeración de correo electrónico*: activar. Evita que
   se pueda averiguar qué correos están registrados probando en el login.

4. **Política de contraseñas** — Authentication → Configuración → Política de contraseñas:
   exigir mínimo 8 caracteres. La app ya lo valida en el cliente, pero conviene también
   en el servidor (el cliente siempre se puede saltar).

5. **Dominios autorizados** — Authentication → Configuración → Dominios autorizados:
   dejar solo los dominios reales de la app.

## Cabeceras HTTP

`firebase.json` define CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.

La CSP permite `connect-src` hacia `*.googleapis.com` (Firestore y Auth). Si más
adelante agregas otro servicio externo (analytics, imágenes remotas, una fuente de
Google), hay que añadir su dominio a la CSP o el navegador lo bloqueará.

## Dependencias

Revisar periódicamente:

```bash
npm audit
```

Actualmente: 0 vulnerabilidades.
