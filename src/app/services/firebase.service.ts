import { inject, Injectable } from '@angular/core';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from '@angular/fire/auth';
import { User } from '../models/user.model';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getFirestore, collection, collectionData, query } from '@angular/fire/firestore';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  utilsSvc = inject(UtilsService);

  constructor() { }

  //Proteger rutas
  getAuth() {
    return getAuth();
  }

  // uid de confianza: viene de la sesión de Firebase, no de localStorage
  // (localStorage lo puede editar cualquiera desde el navegador).
  getUid(): string | null {
    return getAuth().currentUser?.uid ?? null;
  }

  //Acceder
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //Crear
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //Cerrar Sesión (sin navegar): útil desde los guards
  async clearSession() {
    await getAuth().signOut();
    localStorage.removeItem('user');
    // El segundo factor se vuelve a pedir en el próximo inicio de sesión
    localStorage.removeItem('2fa');
  }

  //Cerrar Sesión
  async signOut() {
    await this.clearSession();
    return this.utilsSvc.routerLink('/auth');
  }

  //Actualizar
  updateUser(displayName: string) {
    const currentUser = getAuth().currentUser;
    if (!currentUser) return Promise.reject(new Error('No hay una sesión activa.'));
    return updateProfile(currentUser, { displayName });
  }

  //Enviar email para restablecer contraseña
  sendRecoveryEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);
  }

  /**
   * Cambia la contraseña de la cuenta.
   *
   * Firebase exige una sesión reciente para esto, y una sesión vieja fallaría
   * con auth/requires-recent-login. Se reautentica primero con la contraseña
   * actual, lo que ademas verifica que quien pide el cambio la conoce: sin eso,
   * cualquiera con el dispositivo desbloqueado podria cambiarla.
   */
  async changePassword(actual: string, nueva: string) {
    const user = getAuth().currentUser;
    if (!user?.email) throw { code: 'auth/no-current-user' };

    const credencial = EmailAuthProvider.credential(user.email, actual);
    await reauthenticateWithCredential(user, credencial);
    await updatePassword(user, nueva);
  }

  //Obtener documento
  async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();
  }

  // Devuelve el perfil local y, si falta (localStorage borrado), lo recupera
  // de Firestore. Evita que la UI se rompa con una sesión válida sin perfil.
  async ensureLocalUser(): Promise<User | null> {
    const local = this.utilsSvc.getFromLocalStorage('user');
    if (local?.uid) return local;

    const uid = this.getUid();
    if (!uid) return null;

    const profile = await this.getDocument(`users/${uid}`) as User;
    if (profile) this.guardarPerfilLocal(profile);
    return profile ?? null;
  }

  /**
   * Copia local del perfil SIN el secreto de dos factores ni el código de
   * recuperación: localStorage lo lee cualquier script de la página, y ahí
   * esos valores permitirían generar códigos válidos.
   */
  guardarPerfilLocal(profile: User) {
    const { twoFactor, ...resto } = profile;
    this.utilsSvc.saveInLocalStorage('user', {
      ...resto,
      ...(twoFactor?.enabled ? { twoFactor: { enabled: true } } : {})
    });
  }

  /** Lee la configuración completa de dos factores (con secreto) de Firestore */
  async getDosFactores(uid?: string): Promise<{ enabled: boolean, secret?: string, recovery?: string } | null> {
    const id = uid ?? this.getUid();
    if (!id) return null;
    const perfil = await this.getDocument(`users/${id}`) as User;
    return perfil?.twoFactor ?? null;
  }

  /** Activa o desactiva la verificación en dos pasos conservando el resto del perfil */
  async guardarDosFactores(dosFactores: { enabled: boolean, secret?: string, recovery?: string } | null) {
    const uid = this.getUid();
    if (!uid) throw { code: 'auth/no-current-user' };

    const perfil = await this.getDocument(`users/${uid}`) as User;
    const actualizado: any = {
      uid,
      email: perfil?.email ?? getAuth().currentUser?.email,
      name: perfil?.name
    };
    if (perfil?.photo) actualizado.photo = perfil.photo;
    if (dosFactores?.enabled) actualizado.twoFactor = dosFactores;

    await this.setDocument(`users/${uid}`, actualizado);
    this.guardarPerfilLocal(actualizado);
    return actualizado as User;
  }

  /** Marca que esta sesión ya superó el segundo factor */
  marcarDosFactoresSuperado() {
    localStorage.setItem('2fa', this.getUid() ?? '');
  }

  dosFactoresSuperado(): boolean {
    return !!this.getUid() && localStorage.getItem('2fa') === this.getUid();
  }

  //Setear documento
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }

  //FireStore
  getSubcollection(path: string, collectionQuery: any[] = []) {
    const ref = collection(getFirestore(), path);
    return collectionData(query(ref, ...collectionQuery), { idField: 'id' });
  }

  addToSubcollection(path: string, data: any) {
    return addDoc(collection(getFirestore(), path), data);
  }

  updateSubCollection(path: string, data: any) {
    return updateDoc(doc(getFirestore(), path), data);
  }

  deleteSubCollection(path: string) {
    return deleteDoc(doc(getFirestore(), path));
  }

  //Mensajes a español
  translateErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/invalid-credential': 'El correo o la contraseña son incorrectos.',
      'auth/user-not-found': 'No se encontró una cuenta con este correo.',
      'auth/wrong-password': 'La contraseña es incorrecta.',
      'auth/invalid-email': 'El correo proporcionado no es válido.',
      'auth/email-already-in-use': 'Este correo ya está registrado.',
      'auth/weak-password': 'La contraseña es demasiado débil.',
      'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo más tarde.',
      'auth/missing-password': 'Debes escribir tu contraseña.',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión e inténtalo de nuevo.',
      'auth/no-current-user': 'No hay una sesión activa.',
      'permission-denied': 'Acceso denegado.'
    };

    return errorMessages[errorCode] || 'Ocurrió un error inesperado.';
  }
}
