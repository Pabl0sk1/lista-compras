import { inject, Injectable } from '@angular/core';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getFirestore, collection, collectionData, query } from '@angular/fire/firestore';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  firestore = inject(AngularFirestore);
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
    if (profile) this.utilsSvc.saveInLocalStorage('user', profile);
    return profile ?? null;
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
      'permission-denied': 'Acceso denegado.'
    };

    return errorMessages[errorCode] || 'Ocurrió un error inesperado.';
  }
}
