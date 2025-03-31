import { List } from "./list.model";

export interface User {
    uid: string,
    email: string,
    password: string,
    name: string,
    lists: List[]
}