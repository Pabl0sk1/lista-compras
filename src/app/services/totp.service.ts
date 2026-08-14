import { Injectable } from '@angular/core';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // base32, RFC 4648
const PERIODO = 30; // segundos por código, el estándar que esperan las apps

/**
 * Códigos TOTP (RFC 6238), los de Google Authenticator, Authy o similares.
 *
 * Se implementa a mano con Web Crypto en vez de traer una librería: son treinta
 * líneas, no añade dependencias que auditar y el algoritmo está congelado desde
 * 2011.
 */
@Injectable({
  providedIn: 'root'
})
export class TotpService {

  /** Secreto nuevo de 20 bytes, que es lo que recomienda el RFC */
  generarSecreto(): string {
    return this.aBase32(crypto.getRandomValues(new Uint8Array(20)));
  }

  /** Código de recuperación para no quedarse fuera si se pierde el móvil */
  generarRecuperacion(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const texto = this.aBase32(bytes).slice(0, 8);
    return `${texto.slice(0, 4)}-${texto.slice(4)}`;
  }

  /** URI que lee la app de autenticación al escanear el QR */
  uri(secreto: string, email: string): string {
    const cuenta = encodeURIComponent(`ShopEasy:${email}`);
    return `otpauth://totp/${cuenta}?secret=${secreto}&issuer=ShopEasy`
      + `&algorithm=SHA1&digits=6&period=${PERIODO}`;
  }

  /** El secreto en bloques de cuatro, para poder teclearlo si el QR falla */
  legible(secreto: string): string {
    return secreto.match(/.{1,4}/g)?.join(' ') ?? secreto;
  }

  /**
   * Acepta el código del paso actual y también el anterior y el siguiente:
   * los relojes de los móviles no van perfectamente sincronizados y, sin ese
   * margen, un usuario con el reloj unos segundos desviado nunca entraría.
   */
  async esValido(secreto: string, codigo: string): Promise<boolean> {
    const limpio = (codigo ?? '').replace(/\D/g, '');
    if (limpio.length !== 6) return false;

    const paso = Math.floor(Date.now() / 1000 / PERIODO);
    for (const desvio of [-1, 0, 1]) {
      if (await this.generarCodigo(secreto, paso + desvio) === limpio) return true;
    }
    return false;
  }

  private async generarCodigo(secreto: string, contador: number): Promise<string> {
    // Se pasa un ArrayBuffer propio: el tipado de Uint8Array no encaja con
    // BufferSource desde TypeScript 5.9
    const bytes = this.deBase32(secreto);
    const clave = await crypto.subtle.importKey(
      'raw', bytes.slice().buffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );

    // El contador va como entero de 8 bytes, big-endian
    const buffer = new ArrayBuffer(8);
    const vista = new DataView(buffer);
    vista.setUint32(0, Math.floor(contador / 2 ** 32));
    vista.setUint32(4, contador >>> 0);

    const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, buffer));

    // Truncado dinámico: el último nibble dice desde dónde leer los 4 bytes
    const inicio = firma[firma.length - 1] & 0x0f;
    const binario = ((firma[inicio] & 0x7f) << 24)
      | (firma[inicio + 1] << 16)
      | (firma[inicio + 2] << 8)
      | firma[inicio + 3];

    return String(binario % 1_000_000).padStart(6, '0');
  }

  private aBase32(bytes: Uint8Array): string {
    let bits = 0, acumulado = 0, salida = '';
    for (const byte of bytes) {
      acumulado = (acumulado << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        salida += ALFABETO[(acumulado >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) salida += ALFABETO[(acumulado << (5 - bits)) & 31];
    return salida;
  }

  private deBase32(secreto: string): Uint8Array {
    const limpio = secreto.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = 0, acumulado = 0;
    const bytes: number[] = [];

    for (const caracter of limpio) {
      acumulado = (acumulado << 5) | ALFABETO.indexOf(caracter);
      bits += 5;
      if (bits >= 8) {
        bytes.push((acumulado >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }
}
