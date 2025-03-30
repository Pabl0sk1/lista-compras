import { Timestamp } from "firebase/firestore";

export interface Item {
    name: string,
    completed: boolean
}

export enum ListStatus {
    Active = "Activo",
    Completed = "Completo"
}

export interface List {
    id: string,
    title: string,
    status: ListStatus,
    dateHour: Timestamp,
    items: Item[]
}