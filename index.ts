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

    toString(): string {
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
export type AdditionSubscription<T> = (newItem: T) => void;
export type RemovalSubscription<T> = (removedItem: T) => void;

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

    subscribe(fn: (newValue: T) => void): void {
        this._bindings.add(fn);
        fn(this._value);
    }
}

export class ListState<T extends Identifiable> extends State<Set<T>> {
    private additionHandlers = new Set<AdditionSubscription<T>>();
    private removalHandlers = new Map<UUID, RemovalSubscription<T>>();

    constructor() {
        super(new Set<T>());
    }

    add(...items: T[]): void {
        items.forEach((item) => {
            this.value.add(item);
            this.additionHandlers.forEach((handler) => handler(item));
        });
    }

    remove(...items: T[]): void {
        items.forEach((item) => {
            this.value.delete(item);
            const uuid = item.uuid;

            if (!this.removalHandlers.has(uuid)) return;
            this.removalHandlers.get(uuid)!(item);
            this.removalHandlers.delete(uuid);
        });
    }

    handleAddition(handler: AdditionSubscription<T>): void {
        this.additionHandlers.add(handler);
    }

    handleRemoval(item: T, handler: RemovalSubscription<T>): void {
        this.removalHandlers.set(item.uuid, handler);
    }
}

export function createProxyState<T>(
    statesToSubscibe: State<any>[],
    fn: () => T
): State<T> {
    const proxyState = new State<T>(fn());
    statesToSubscibe.forEach((state) =>
        state.subscribe(() => (proxyState.value = fn()))
    );
    return proxyState;
}

/*
    JSX
*/

export class React {
    static createElement(
        tagName: keyof HTMLElementTagNameMap,
        attributes: { [key: string]: any } | null = {},
        ...children: (HTMLElement | string)[]
    ) {
        const element = document.createElement(tagName);

        if (attributes != null)
            Object.entries(attributes).forEach((entry) => {
                const [key, value] = entry;
                const [keyDirective, keyValue] = key.split(":");
                console.log(keyDirective, keyValue, value);

                switch (keyDirective) {
                    case "on":
                        element.addEventListener(keyValue, value);
                        break;
                    case "subscribe":
                        (value as State<any>).subscribe(
                            (newValue) => (element[keyValue] = newValue)
                        );
                        break;
                    case "bind":
                        (value as State<any>).subscribe(
                            (newValue) => (element[keyValue] = newValue)
                        );
                        element.addEventListener(
                            "input",
                            () => (value.value = (element as any).value)
                        );
                    default:
                        element.setAttribute(key, value);
                }
            });

        children.forEach((child) => element.append(child));

        return element;
    }
}