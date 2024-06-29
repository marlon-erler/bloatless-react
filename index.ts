import { v4 } from "uuid";

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
        this.value = v4;
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

export function createProxyState<T>(
    statesToSubscibe: State<any>[],
    fn: () => T
) {
    const proxyState = new State<T>(fn());
    statesToSubscibe.forEach((state) =>
        state.subscribe(() => (proxyState.value = fn()))
    );
}

/*
	HTML
*/
/* Types */
export interface HTMLElementWithValue<T> extends HTMLElement {
    value: T;
}

/* Base */
export const create = document.createElement;

export function createRoot(tagName: keyof HTMLElementTagNameMap) {
    const root = create(tagName);
    document.body.append(root);
    return create(tagName);
}

/* Utility */
export function bindElementValue(
    element: HTMLInputElement|HTMLTextAreaElement,
    state: State<string>,
) {
    state.subscribe((newValue) => {
        element.value = state.value;
    });
    element.addEventListener("input", () => {
        state.value = element.value;
    });
}

/* Components */
export function Button(text: string, fn: () => void) {
    const button = create("button");
    button.innerText = text;
    button.addEventListener("click", fn);

    return button;
}

export function Input(type: string, value: State<string>) {
    const input = create("input");
    input.type = type;
    bindElementValue(input, value);

    return input;
}

export function Label(labelText: string, element: HTMLElement) {
    const label = create("label");
    label.innerText = labelText;
    label.append(element);

    return label;
}
