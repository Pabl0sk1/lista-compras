// Quien abrió la app en esta dirección tiene registrado el service worker de
// Angular, que sirve la copia guardada aunque el servidor ya redirija. Este lo
// sustituye, se da de baja a sí mismo, borra lo guardado y recarga: sin esto la
// dirección vieja seguiría enseñando la app durante días.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const nombres = await caches.keys();
    await Promise.all(nombres.map(n => caches.delete(n)));
    const ventanas = await self.clients.matchAll({ type: 'window' });
    for (const v of ventanas) v.navigate(v.url);
  })());
});
