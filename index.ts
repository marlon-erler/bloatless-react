/*
	DATA MODEL
*/
/* Types */
export interface Identifiable {
    uuid: UUID;
}

export interface Stringifiable {
    toString(): string;
}

export type Value<T> = T | State<T>;

/* Utility */
export class UUID implements Stringifiable {
    readonly value: string;

    constructor() {
        //TODO
        this.value = '';
    }

    toString() {
        return this.value;
    }
}

export function unwrapValue<T>(valueObject: Value<T>): T {
    if (valueObject instanceof State) return valueObject.value;
    return valueObject;
}

export function unwrapState<T>(valueObject: Value<T>): State<T> {
    if (valueObject instanceof State) return valueObject;
    return new State(valueObject);
}

/* State */
export type StateSubscription<T> = (newValue: T) => void;

export class State<T> {
    private _value: T;
    private _bindings = new Set<StateSubscription<T>>();

    constructor(initialValue: T) {
        this._value = initialValue;
    }

    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        if (this._value == newValue) return;
        this._value = newValue;
        this.callSubscriptions();
    }

    callSubscriptions(): void {
        this._bindings.forEach((fn) => fn(this._value));
    }

    subscribe(fn: StateSubscription<T>): void {
        this._bindings.add(fn);
    }
}

export class ListState<T extends Identifiable> extends State<Set<T>> {
    private additionHandlers = new Set<StateSubscription<T>>();
    private removalHandlers = new Map<UUID, StateSubscription<T>>();

    constructor() {
        super(new Set<T>());
    }

    add(...items: T[]) {
        items.forEach((item) => {
            this.value.add(item);
            this.additionHandlers.forEach((handler) => handler(item));
        });
    }

    delete(...items: T[]) {
        items.forEach((item) => {
            this.value.delete(item);
            const uuid = item.uuid;

            if (!this.removalHandlers.has(uuid)) return;
            this.removalHandlers.get(uuid)!(item);
            this.removalHandlers.delete(uuid);
        });
    }

    handleAddition(handler: StateSubscription<T>) {
        this.additionHandlers.add(handler);
    }

    handleRemoval(item: T, handler: StateSubscription<T>) {
        this.removalHandlers.set(item.uuid, handler);
    }
}

/*
	HTML
*/
/* Types */
export interface HTMLElementWithValue<T> extends HTMLElement {
    value: T;
}

/* Utility */
export function subscribeElementProperty<H extends HTMLElement>(
    element: H,
    property: keyof H,
    state: State<any>,
    eventName: keyof HTMLElementEventMap = 'input',
) {
    state.subscribe((newValue) => {
        element[property] = state.value;
    });
    element.addEventListener(eventName, () => {
        state.value = element[property];
    });
}