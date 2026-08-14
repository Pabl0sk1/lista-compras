// Prueba de las reglas de Firestore (listas compartidas) contra el emulador.
//
//   npm run test:reglas
//
// Se usa el emulador porque acepta JWT sin firmar: aquí sí se puede tener un
// invitado con el correo verificado, cosa imposible de montar contra producción
// sin crear cuentas de verdad. Cada cambio en firestore.rules debería pasar por
// aquí antes de desplegarse; estas reglas son lo único que separa las listas de
// una cuenta de las de otra.
const HOST = '127.0.0.1:8080';
const P = 'lista-compras-fa747';
const raiz = `http://${HOST}/v1/projects/${P}/databases/(default)/documents`;

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid, email, verificado = true) => b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
  iss: `https://securetoken.google.com/${P}`, aud: P, auth_time: 1000, user_id: uid, sub: uid,
  iat: 1000, exp: 9999999999, email, email_verified: verificado,
  firebase: { identities: { email: [email] }, sign_in_provider: 'password' }
}) + '.';

const cab = t => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

const DUENYO = 'uid-duenyo', CORREO_D = 'duenyo@ejemplo.com';
const INVITADO = 'uid-invitado', CORREO_I = 'invitado@ejemplo.com';
const TERCERO = 'uid-tercero', CORREO_T = 'tercero@ejemplo.com';
const tD = token(DUENYO, CORREO_D), tI = token(INVITADO, CORREO_I), tT = token(TERCERO, CORREO_T);
const tSinVerificar = token(INVITADO, CORREO_I, false);

const listaDoc = (extra = {}) => ({
  fields: {
    title: { stringValue: 'Compra del sábado' },
    status: { stringValue: 'Activo' },
    dateHour: { stringValue: '2030-01-01T10:00' },
    items: { arrayValue: { values: [{ mapValue: { fields: { name: { stringValue: 'Pan' }, completed: { booleanValue: false } } } }] } },
    ...extra
  }
});
const compartida = (correos, duenyo = DUENYO) => listaDoc({
  owner: { stringValue: duenyo },
  sharedWith: { arrayValue: { values: correos.map(c => ({ stringValue: c })) } }
});

let ok = 0, mal = 0;
const comprobar = async (nombre, esperado, ejecutar) => {
  const r = await ejecutar();
  const permitido = r.status < 300;
  const bien = permitido === esperado;
  if (bien) ok++; else mal++;
  console.log(`  ${bien ? 'OK  ' : 'FALLA'} ${nombre}  (${esperado ? 'debe permitir' : 'debe denegar'} -> ${r.status})`);
  if (!bien) console.log('        ', (await r.text()).slice(0, 600));
};

// Se siembra sin reglas (el emulador permite escribir sin auth por la ruta admin)
const sembrar = async (id, cuerpo) => {
  const url = `http://${HOST}/v1/projects/${P}/databases/(default)/documents/users/${DUENYO}/lists?documentId=${id}`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify(cuerpo) });
  if (r.status >= 300) console.log('   (siembra falló)', r.status, (await r.text()).slice(0, 200));
};

const url = id => `${raiz}/users/${DUENYO}/lists/${id}`;
const patch = (id, campos, t) => fetch(url(id), { method: 'PATCH', headers: cab(t), body: JSON.stringify({ fields: campos }) });

console.log('\nLECTURA');
await sembrar('l1', compartida([CORREO_I]));
await comprobar('el dueño lee la suya', true, () => fetch(url('l1'), { headers: cab(tD) }));
await comprobar('el invitado lee la compartida', true, () => fetch(url('l1'), { headers: cab(tI) }));
await comprobar('un tercero NO la lee', false, () => fetch(url('l1'), { headers: cab(tT) }));
await comprobar('el invitado sin correo verificado NO la lee', false, () => fetch(url('l1'), { headers: cab(tSinVerificar) }));

await sembrar('l2', listaDoc());
await comprobar('el invitado NO lee otra lista del dueño', false, () => fetch(url('l2'), { headers: cab(tT) }));
await comprobar('el invitado NO lee una lista sin compartir', false, () => fetch(url('l2'), { headers: cab(tI) }));

console.log('\nESCRITURA DEL INVITADO');
await comprobar('el invitado marca un item', true, () => patch('l1', compartida([CORREO_I]).fields, tI));
await comprobar('el invitado NO añade a otra persona', false, () => patch('l1', compartida([CORREO_I, CORREO_T]).fields, tI));
await comprobar('el invitado NO se roba la lista (cambia owner)', false, () => patch('l1', compartida([CORREO_I], INVITADO).fields, tI));
// El cliente escribe el documento entero: quitar sharedWith equivale a borrarlo.
// Se manda con updateMask para reproducirlo de verdad, porque un PATCH sin
// máscara solo toca los campos que van en el cuerpo y dejaría sharedWith intacto.
const borrarReparto = (id, t, campos = {}) => fetch(
  `${url(id)}?updateMask.fieldPaths=sharedWith&updateMask.fieldPaths=owner&updateMask.fieldPaths=title`,
  { method: 'PATCH', headers: cab(t), body: JSON.stringify({ fields: { title: { stringValue: 'Compra del sábado' }, owner: { stringValue: DUENYO }, ...campos } }) });

await sembrar('l3', compartida([CORREO_I, CORREO_T]));
await comprobar('el invitado NO echa al otro borrando sharedWith', false, () => borrarReparto('l3', tI));
await comprobar('el invitado sale y deja al otro dentro', true, () => patch('l3', compartida([CORREO_T]).fields, tI));

await sembrar('l7', compartida([CORREO_I]));
await comprobar('el invitado, único invitado, SÍ puede salirse', true, () => borrarReparto('l7', tI));

await sembrar('l4', compartida([CORREO_I]));
await comprobar('el invitado NO borra la lista', false, () => fetch(url('l4'), { method: 'DELETE', headers: cab(tI) }));
await comprobar('el dueño SÍ borra la lista', true, () => fetch(url('l4'), { method: 'DELETE', headers: cab(tD) }));

console.log('\nCOMPARTIR (dueño)');
await sembrar('l5', listaDoc());
await comprobar('el dueño comparte', true, () => patch('l5', compartida([CORREO_I]).fields, tD));
await comprobar('el dueño deja de compartir', true, () => patch('l5', listaDoc({ owner: { stringValue: DUENYO }, sharedWith: { arrayValue: { values: [] } } }).fields, tD));

console.log('\nLÍMITES');
await comprobar('no se comparte con más de 20', false, () =>
  patch('l5', compartida(Array.from({ length: 21 }, (_, i) => `x${i}@e.com`)).fields, tD));
await comprobar('sharedWith no puede ser un texto', false, () =>
  patch('l5', listaDoc({ sharedWith: { stringValue: CORREO_I } }).fields, tD));
await comprobar('no se cuelan campos raros', false, () =>
  patch('l5', listaDoc({ admin: { booleanValue: true } }).fields, tD));

console.log('\nCONSULTA DE GRUPO');
await sembrar('l6', compartida([CORREO_I]));
const grupo = async t => {
  const r = await fetch(`${raiz}:runQuery`, {
    method: 'POST', headers: cab(t), body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'lists', allDescendants: true }],
        where: { fieldFilter: { field: { fieldPath: 'sharedWith' }, op: 'ARRAY_CONTAINS', value: { stringValue: CORREO_I } } }
      }
    })
  });
  const j = await r.json();
  return { status: r.status, docs: (Array.isArray(j) ? j : []).filter(x => x.document).length, j };
};
const gi = await grupo(tI);
console.log(`  ${gi.status < 300 && gi.docs >= 1 ? 'OK  ' : 'FALLA'} el invitado encuentra lo compartido (status ${gi.status}, ${gi.docs} listas)`);
gi.status < 300 && gi.docs >= 1 ? ok++ : mal++;
const gt = await grupo(tT);
const negado = gt.status >= 300 || gt.docs === 0;
console.log(`  ${negado ? 'OK  ' : 'FALLA'} un tercero no saca nada con la misma consulta (${gt.docs} listas)`);
negado ? ok++ : mal++;

console.log(`\n${ok} correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
