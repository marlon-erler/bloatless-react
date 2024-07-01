import { v4 } from "uuid";

/*
	DATA MODEL
*/
/* Types */
export interface Identifiable {
    uuid: UUID;
}

/* Utility */
export class UUID {
    readonly value: string;

    constructor() {
        this.value = v4();
    }

    toString(): string {
        return this.value;
    }
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

export type ListItemConverter<T extends Identifiable> = (
    item: T,
    listState: ListState<T>
) => HTMLElement;

/*
    JSX
*/

export function createElement(
    tagName: keyof HTMLElementTagNameMap,
    attributes: { [key: string]: any } | null = {},
    ...children: (HTMLElement | string)[]
) {
    const element = document.createElement(tagName);
    console.log(children);

    if (attributes != null)
        Object.entries(attributes).forEach((entry) => {
            const [attributename, value] = entry;
            const [directiveKey, directiveValue] = attributename.split(":");

            switch (directiveKey) {
                case "on": {
                    element.addEventListener(directiveValue, value);
                    break;
                }
                case "subscribe": {
                    if (directiveValue == "children") {
                        const [listState, toElement] = value as [
                            listState: ListState<any>,
                            (
                                item: any,
                                listState: ListState<any>
                            ) => HTMLElement
                        ];
                        listState.handleAddition((newItem) => {
                            const child = toElement(newItem, listState);
                            listState.handleRemoval(newItem, () =>
                                child.remove()
                            );
                            element.append(child);
                        });
                    } else {
                        const state = value as State<any>;
                        state.subscribe(console.log)
                        state.subscribe(
                            (newValue) => (element[directiveValue] = newValue)
                        );
                    }
                    break;
                }
                case "bind": {
                    const state = value as State<any>;
                    state.subscribe(
                        (newValue) => (element[directiveValue] = newValue)
                    );
                    element.addEventListener(
                        "input",
                        () => (state.value = (element as any)[directiveValue])
                    );
                    break;
                }
                case "toggle": {
                    const state = value as State<any>;
                    state.subscribe((newValue) =>
                        element.toggleAttribute(directiveValue, newValue)
                    );
                    break;
                }
                default:
                    element.setAttribute(attributename, value);
            }
        });

    children.filter((x) => x).forEach((child) => element.append(child));

    return element;
}
