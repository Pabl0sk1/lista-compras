export interface Item {
    name: string,
    completed: boolean,
    /** Cuántas unidades. Opcional: los items antiguos no la tienen y 1 se omite. */
    quantity?: number
}

export enum ListStatus {
    Active = "Activo",
    Completed = "Completo"
}

export interface List {
    id: string,
    title: string,
    status: ListStatus,
    dateHour: string,
    items: Item[]
}