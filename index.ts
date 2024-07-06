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

    // stringify
    toString(): string {
        return JSON.stringify(this._value);
    }
}

export class ListState<T extends Identifiable> extends State<Set<T>> {
    private additionHandlers = new Set<AdditionSubscription<T>>();
    private removalHandlers = new Map<string, RemovalSubscription<T>>();

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
            const id = item.id;

            if (!this.removalHandlers.has(id)) return;
            this.removalHandlers.get(id)!(item);
            this.removalHandlers.delete(id);
        });
        this.callSubscriptions();
    }

    // handlers
    handleAddition(handler: AdditionSubscription<T>): void {
        this.additionHandlers.add(handler);
        [...this.value.values()].forEach(handler);
    }

    handleRemoval(item: T, handler: RemovalSubscription<T>): void {
        this.removalHandlers.set(item.id, handler);
    }

    // stringification
    toString(): string {
        const array = [...this.value];
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

export function restoreListState<T extends Identifiable>(
    localStorageKey: string
): ListState<T> {
    const storedString = localStorage.getItem(localStorageKey) ?? "";

    let initialItems: any[] = [];

    try {
        const array = JSON.parse(storedString);
        if (!Array.isArray(array)) throw "";
        initialItems = array;
    } catch {}

    const state = new ListState<T>(initialItems);
    persistState(localStorageKey, state);

    return state;
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
                    if (directiveValue == "children") {
                        try {
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
                        } catch {
                            throw `error: cannot process subscribe:children directive because ListItemConverter is not defined. Usage: "subscribe:children={[list, converter]}"; you can find a more detailed example in the documentation`;
                        }
                    } else {
                        const state = value as State<any>;
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
