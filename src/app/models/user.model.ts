import { List } from "./list.model";

export interface User {
    uid: string,
    email: string,
    password: string,
    name: string,
    /** Avatar como data URL. El proyecto no usa Storage: la imagen se
     *  redimensiona a 256 px en el cliente y viaja dentro del documento. */
    photo?: string,
    lists: List[]
}