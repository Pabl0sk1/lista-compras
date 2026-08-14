import { List } from "./list.model";

export interface User {
    uid: string,
    email: string,
    password: string,
    name: string,
    /** Avatar como data URL. El proyecto no usa Storage: la imagen se
     *  redimensiona a 256 px en el cliente y viaja dentro del documento. */
    photo?: string,
    /** Verificación en dos pasos. El secreto solo vive en Firestore: la copia
     *  local del perfil se guarda sin él. */
    twoFactor?: DosFactores,
    lists: List[]
}

export interface DosFactores {
    enabled: boolean,
    secret?: string,
    recovery?: string
}