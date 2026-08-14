export interface Item {
    name: string,
    completed: boolean,
    /** Cuántas unidades. Opcional: los items antiguos no la tienen y 1 se omite. */
    quantity?: number,
    /** Precio por unidad. El total de la lista se calcula con cantidad × precio. */
    price?: number,
    /** Pasillo o sección del súper, para agrupar mientras se compra */
    category?: string
}

export enum ListStatus {
    Active = "Activo",
    Completed = "Completo"
}

/** Secciones típicas de un supermercado, en el orden en que se suelen recorrer */
export const CATEGORIAS = [
    'Frutas y verduras',
    'Carnicería',
    'Lácteos',
    'Panadería',
    'Despensa',
    'Congelados',
    'Bebidas',
    'Limpieza',
    'Higiene',
    'Otros'
] as const;

export interface List {
    id: string,
    title: string,
    status: ListStatus,
    dateHour: string,
    items: Item[],
    /** Nota libre: dónde comprar, para quién es, qué no olvidar */
    note?: string,
    /** Momento en que se mandó a la papelera. Sin este campo, la lista está viva. */
    deletedAt?: string,
    /** Plantilla: no aparece en el listado, sirve para crear listas nuevas */
    template?: boolean,
    /**
     * Correos con los que está compartida.
     *
     * Se guardan correos y no uid a propósito: Firebase no deja resolver un uid
     * desde el cliente (permitiría averiguar qué correos están registrados),
     * mientras que las reglas sí pueden comparar con el correo del token.
     */
    sharedWith?: string[],
    /** uid del dueño. Necesario para que un invitado sepa dónde escribir. */
    owner?: string
}
