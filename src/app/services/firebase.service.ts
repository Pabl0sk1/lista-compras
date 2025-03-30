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

  //Acceder
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //Crear
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //Cerrar Sesión
  signOut() {
    getAuth().signOut();
    localStorage.removeItem('user');
    this.utilsSvc.routerLink('/auth');
  }

  //Actualizar
  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName });
  }

  //Enviar email para restablecer contraseña
  sendRecoveryEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);
  }

  //Obtener documento
  async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();
  }

  //Setear documento
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }

  //FireStore
  getSubcollection(path: string, collectionQuery?: any) {
    const ref = collection(getFirestore(), path);
    return collectionData(query(ref, collectionQuery), { idField: 'id' });
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
