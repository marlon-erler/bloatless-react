import { v4 } from "uuid";

/*
	DATA MODEL
*/
/* Types */
export interface Identifiable {
    id: string;
}

export interface Stringifiable {
    toString: () => string;
}

/* Utility */
export function UUID(): string {
    return v4();
}

/* State */
export type StateSubscription<T> = (newValue: T) => void;
export type AdditionSubscription<T> = (newItem: T) => void;
export type RemovalSubscription<T> = (removedItem: T) => void;

export class State<T> {
    private _value: T;
    private _bindings = new Set<StateSubscription<T>>();

    // init
    constructor(initialValue: T) {
        this._value = initialValue;
    }

    // value
    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        if (this._value == newValue) return;
        this._value = newValue;
        this.callSubscriptions();
    }

    // subscriptions
    callSubscriptions(): void {
        this._bindings.forEach((fn) => fn(this._value));
    }

    subscribe(fn: (newValue: T) => void): void {
        this._bindings.add(fn);
        fn(this._value);
    }

    subscribeSilent(fn: (newValue: T) => void): void {
        this._bindings.add(fn);
    }

    // stringify
    toString(): string {
        return JSON.stringify(this._value);
    }
}

export class ListState<T> extends State<Set<T>> {
    private additionHandlers = new Set<AdditionSubscription<T>>();
    private removalHandlers = new Map<T, Set<RemovalSubscription<T>>>();

    // init
    constructor(initialItems?: T[]) {
        super(new Set<T>(initialItems));
    }

    // list
    add(...items: T[]): void {
        items.forEach((item) => {
            this.value.add(item);
            this.additionHandlers.forEach((handler) => handler(item));
        });
        this.callSubscriptions();
    }

    remove(...items: T[]): void {
        items.forEach((item) => {
            this.value.delete(item);

            if (!this.removalHandlers.has(item)) return;
            this.removalHandlers.get(item)!.forEach((handler) => handler(item));
            this.removalHandlers.delete(item);
        });
        this.callSubscriptions();
    }

    clear() {
        this.remove(...this.value.values());
    }

    // handlers
    handleAddition(handler: AdditionSubscription<T>): void {
        this.additionHandlers.add(handler);
        [...this.value.values()].forEach(handler);
    }

    handleRemoval(item: T, handler: RemovalSubscription<T>): void {
        if (!this.removalHandlers.has(item))
            this.removalHandlers.set(item, new Set());
        this.removalHandlers.get(item)!.add(handler);
    }

    // stringification
    toString(): string {
        const array = [...this.value.values()];
        const json = JSON.stringify(array);
        return json;
    }
}

export class MapState<T> extends State<Map<string, T>> {
    private additionHandlers = new Set<AdditionSubscription<T>>();
    private removalHandlers = new Map<T, Set<RemovalSubscription<T>>>();

    // init
    constructor(initialItems?: [string, T][]) {
        super(new Map<string, T>(initialItems));
    }

    // list
    set(key: string, item: T): void {
        this.remove(key);
        this.value.set(key, item);
        this.additionHandlers.forEach((handler) => handler(item));
        this.callSubscriptions();
    }

    remove(key: string): void {
        const item = this.value.get(key);
        if (!item) return;

        this.value.delete(key);
        this.callSubscriptions();

        if (!this.removalHandlers.has(item)) return;
        this.removalHandlers.get(item)!.forEach((handler) => handler(item));
        this.removalHandlers.delete(item);
    }

    clear() {
        [...this.value.keys()].forEach((key) => this.remove(key));
    }

    // handlers
    handleAddition(handler: AdditionSubscription<T>): void {
        this.additionHandlers.add(handler);
        [...this.value.values()].forEach(handler);
    }

    handleRemoval(item: T, handler: RemovalSubscription<T>): void {
        if (!this.removalHandlers.has(item))
            this.removalHandlers.set(item, new Set());
        this.removalHandlers.get(item)!.add(handler);
    }

    // stringification
    toString(): string {
        const array = [...this.value.entries()];
        const json = JSON.stringify(array);
        return json;
    }
}

// UTILITY
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

export function bulkSubscribe(
    statesToSubscibe: State<any>[],
    fn: () => void
): void {
    statesToSubscibe.forEach((state) => state.subscribeSilent(fn));
}

function persistState(localStorageKey: string, state: State<any>) {
    state.subscribe(() => {
        const stringifiedValue = state.toString();
        localStorage.setItem(localStorageKey, stringifiedValue);
    });
}

export function restoreState<T>(
    localStorageKey: string,
    initialStateValue: T
): State<T> {
    const storedString =
        localStorage.getItem(localStorageKey) ??
        JSON.stringify(initialStateValue);
    const convertedValue = JSON.parse(storedString);

    const state = new State(convertedValue);
    persistState(localStorageKey, state);

    return state;
}

export function restoreListState<T>(
    localStorageKey: string,
    initialItems: any[] = []
): ListState<T> {
    const storedString = localStorage.getItem(localStorageKey) ?? "";

    try {
        const array = JSON.parse(storedString);
        if (!Array.isArray(array)) throw "";
        initialItems = array;
    } catch {}

    const state = new ListState<T>(initialItems);
    persistState(localStorageKey, state);

    return state;
}

export function restoreMapState<T>(
    localStorageKey: string,
    initialItems: [string, any][] = []
): MapState<T> {
    const storedString = localStorage.getItem(localStorageKey) ?? "";

    try {
        const array = JSON.parse(storedString);
        if (!Array.isArray(array)) throw "";
        initialItems = array;
    } catch {}

    const state = new MapState<T>(initialItems);
    persistState(localStorageKey, state);

    return state;
}

export type StateItemConverter<T> = (item: T) => HTMLElement;

/*
    JSX
*/

export function createElement(
    tagName: keyof HTMLElementTagNameMap,
    attributes: { [key: string]: any } | null = {},
    ...children: (HTMLElement | string)[]
) {
    const element = document.createElement(tagName);

    if (attributes != null)
        Object.entries(attributes).forEach((entry) => {
            const [attributename, value] = entry;
            const [directiveKey, directiveValue] = attributename.split(":");

            switch (directiveKey) {
                case "on": {
                    switch (directiveValue) {
                        case "enter": {
                            element.addEventListener("keydown", (e) => {
                                if ((e as KeyboardEvent).key != "Enter") return;
                                value();
                            });
                            break;
                        }
                        default: {
                            element.addEventListener(directiveValue, value);
                        }
                    }
                    break;
                }
                case "subscribe": {
                    const state = value as State<any>;
                    state.subscribe(
                        (newValue) => (element[directiveValue] = newValue)
                    );

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
                    if (value.subscribe) {
                        const state = value as State<any>;
                        state.subscribe((newValue) =>
                            element.toggleAttribute(directiveValue, newValue)
                        );
                    } else {
                        element.toggleAttribute(directiveValue, value);
                    }
                    break;
                }
                case "set": {
                    const state = value as State<any>;
                    state.subscribe((newValue) =>
                        element.setAttribute(directiveValue, newValue)
                    );
                    break;
                }
                case "children": {
                    switch (directiveValue) {
                        case "set": {
                            const state = value as State<Node | Node[]>;
                            state.subscribe((newValue) => {
                                element.innerHTML = "";
                                element.append(...[newValue].flat());
                            });
                            break;
                        }
                        case "append":
                        case "prepend": {
                            try {
                                const [listState, toElement] = value as [
                                    listState: ListState<any>,
                                    StateItemConverter<any>
                                ];

                                listState.handleAddition((newItem) => {
                                    const child = toElement(newItem);
                                    listState.handleRemoval(newItem, () =>
                                        child.remove()
                                    );

                                    if (directiveValue == "append") {
                                        element.append(child);
                                    } else if (directiveValue == "prepend") {
                                        element.prepend(child);
                                    }
                                });
                            } catch (error) {
                                console.error(error);
                                throw `error: cannot process subscribe:children directive. \n Usage: "children:append={[list, converter]}"; you can find a more detailed example in the documentation.`;
                            }
                        }
                    }
                    break;
                }
                default:
                    element.setAttribute(attributename, value);
            }
        });

    children.filter((x) => x).forEach((child) => element.append(child));

    return element;
}
