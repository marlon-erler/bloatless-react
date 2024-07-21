# bloatless-react

Bloatless-React is a very minimal and flexible alternative to React.

# Features

-   Supports reactivity through States
-   Supports JSX for components
-   Written in TypeScript
-   Really minimal (under 300 lines)
-   No bloated server or compiler required - just bundle the JavaScript into a static .html file

# Setup

You can use any bundler you want, but esbuild is the fastest and smallest out there:

```shell
npm install esbuild bloatless-react
mkdir src dist
touch src/index.tsx dist/index.html
```

The following build script will be enough:

```JSON
{
  "scripts": {
    "build": "esbuild src/index.tsx --bundle --outdir=dist"
  }
}
```

# States

In Bloatless-React, States are the foundation of how reactivity is implemented. Similar to many frameworks, a State can hold a value and triggers the UI to update when it changes. However, **subscriptions have to be made manually** due to the minimal nature of this project.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Create States
const name = new React.State("John Doe"); // will be State<string>
const age = new React.State(69); //will be State<number>

// Get value
console.log(name.value);
// John Doe

// Subscribe
age.subscribe(newAge => console.log(`Age changed to ${newAge}`));
// Age changed to 69

React.bulkSubscribe([name, age], () => console.log(`${name.value} is ${age.value} years old`))

// Set value
age.value = 70;
// Age changed to 70
// John Doe is 70 years old

name.value = "Josh"
// Josh is 70 years old
```

## Proxy States

A Proxy State is a State based on multiple other States. This reduces code and can increase performance.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Create States
const name = new React.State("John Doe");
const age = new React.State(69);

// Proxy State
const summary = React.createProxyState([name, age], () => `${name.value} is ${age.value} years old.`)
summary.subscribe(console.log);
//John Doe is 69 years old.
```

## ListStates

A `ListState<T>` is a State whose value is a `Set<T>`. A ListState allows specific subscriptions to detect when items get added and removed.

```TypeScript
import * as React from "bloatless-react";

const listState = new React.ListState([1, 2]);

console.log(listState.value);
// Set [ 1, 2 ]

listState.handleAddition((newItem: number) => {
  console.log("+", newItem);

  listState.handleRemoval(newItem, () => {
    console.log("-", newItem);
  });
});
// + 1
// + 2

listState.add(3);
// + 3

listState.remove(1);
// - 1

listState.clear();
// - 2
// - 3

```

## MapStates

A `MapState<T>` is a State whose value is a `Map<string, T>`. A ListState allows specific subscriptions to detect when items get added and removed.

```TypeScript
import * as React from "bloatless-react";

const mapState = new React.MapState<number>([
  ["a", 1],
  ["b", 2],
])

console.log(mapState.value);
// Map { a → 1, b → 2 }

mapState.handleAddition((newItem: number) => {
  console.log("+", newItem)

  mapState.handleRemoval(newItem, () => {
    console.log("-", newItem)
  })
});
// + 1
// + 2

mapState.set("c", 3);
// + 3

mapState.remove("a");
// - 1

mapState.clear();
// - 2
// - 3
```

## Persistence

States can persist through reloads via LocalStorage. To implement this, modify your code like this:

```diff
normal State
-const myState = new React.State("hello");
+const myState = React.restoreState("my-state", "hello");

MapState
-const myMapState = new React.MapState<T>();
+const myMapState = React.restoreMapState<T>("my-map-state");
OR
-const myMapState = new React.MapState<number>([["a", 1], ["b", 2]]);
+const myMapState = React.restoreMapState<number>("my-map-state", [["a", 1], ["b", 2]]);

ListState
-const myListState = new React.ListState<T>();
+const myListState = React.restoreListState<T>("my-list-state");
OR
-const myListState = new React.ListState<number>([1, 2]);
+const myListState = React.restoreListState<number>("my-list-state", [1, 2]);
```

# UI

For a minimalist stylesheet, I'd recommend checking out my project called [carbon-mini](https://github.com/marlon-erler/carbon-mini/).

Bloatless React provides a modified polyfill for the React API. This means that **you can use JSX** almost like you would in a React project. Additional functionailiy is implemented through directives, similar to Svelte:

## Handling Events

The `on:<event>` directive adds an EventListener. This directive also supports the `on:enter` event.

```TypeScript
<input on:enter={someFunction}></input>
<button on:click={someFunction}>Click me</button>
```

## Changing Properties

The `subscribe:<property>` directive subscribes to a State and changes a property of the element. Use this for properties available via the DOM model (ie. innerText, innerHTML).

```TypeScript
const name = new React.State("John Doe");
<span subscribe:innerText={name}></span>
```

## Setting Attributes

The `set:<attribute>` directive subscribes to a State and changes an attribute of the element.

```TypeScript
<span set:someAttribute={attributeValue}></span>
```

## Toggling Attributes

The `toggle:<attribute>` directive toggles attributes on the HTML element without assigning a value. This is useful for the `disabled` attribute. You can use states or normal variables.

```TypeScript
const isDisabled = new React.State(false);
<button toggle:disabled={isDisabled}>Some button</button>
<button toggle:disabled={false}>Some button</button>
```

## Binding Input Values

The `bind:<property>` directive acts like a combination of `subscribe:<property>` and `on:input`. It binds the element's property to the state bi-directinally.

```TypeScript
const name = new React.State("John Doe");
// Both inputs will be in sync
<input bind:value={name}></input>
<input bind:value={name}></input>
```

## Dynamically Creating and Removing Child Elements

The **children:set** subscribes to a `State<HTMLElement>` or `State<HTMLElement[]>` and replaces the element's contents with the State's value.

```TypeScript
let count = 0;
const childElement = new React.State(<div>0</div>);

function change() {
  count++;
  childElement.value = <div>{count}</div>;
}

document.body.append(
  <div>
    <button on:click={change}>+</button>
    <div children:set={childElement}></div>
  </div>
);
```

The **children:append** and **children:prepend** directives subscribe to a `ListState` or `MapState` and sync the element's contents accordingly.

The StateItemConverter turns an item of the State into an HTMLElement.

```TypeScript
import * as React from "bloatless-react";

// Model
class MyDataModel {
  items = new React.ListState<string>();
  newItemName = new React.State("");

  addItem = () => {
    console.log(this);
    this.items.add(this.newItemName.value);
  };
  removeItem = (item: string) => {
    this.items.remove(item);
  };
}

const model = new MyDataModel();

// Item -> Element
const convertItem: React.StateItemConverter<string> = (item: string) => {
  function remove() {
    model.removeItem(item);
  }
  return (
    <span>
      {item}
      <button on:click={remove}>Remove</button>
    </span>
  );
};

// Build UI
document.body.append(
  <div>
    <input bind:value={model.newItemName}></input>
      <button on:click={model.addItem}>Add</button>
      <div
        class="flex-column"
        children:append={[model.items, convertItem]}
      ></div>
  </div>
);
```

# Changelog

## 1.1.0

-   Improve code
-   Add missing `break` statements for directives
-   Add `toggle` directive
-   Improve documentation

## 1.1.1

-   Improve documentation

## 1.1.2

-   Remove `console.log()` calls
-   Improve documentation

## 1.1.3

-   Add `on:enter` directive

## 1.2.0

**BREAKING CHANGES**

-   Replace UUID class with function;
    -   `new UUID()` => `UUID() returns string`
-   Replace definition of `Identifiable`
    -   now has `id: string` instead of `uuid: UUID()`

Other changes:

-   Add State persistence
-   Add error description when utilizing `subscribe:children` incorrectly
-   Fix bug where ListState subscriptions were not called
-   Improve documentation

## 1.2.1

-   Add `set:<attribute>` directive

## 1.2.2

-   Remove list parameter from `ListItemConverter`
-   Add `clear()` method to `ListState`

## 1.2.3

-   Allow `toggle:<attribute>` to be used without a state

## 1.2.4

-   On `subscribe:children`, scroll new elements into view

## 1.2.5

-   Instead of using `scrollIntoView()`, `subscribe:children` now scrolls to the bottom

## 1.3.0

**BREAKING CHANGES**

-   Replace `set:children` with `children:append`

Other changes

-   Add `children:<action>` directive
-   Improve documentation

## 1.3.1

-   Allow arrays to be passed to `children:set`

## 1.3.2

-   Allow initial value on `restoreListState()`
-   Add `MapState` and `restoreMapState()`

## 1.3.3

- Rename `ListItemConverter` to `StateItemConverter`
- Improve documentation

## 1.3.4

- Remove old item from `MapState` when calling `MapState.set()` for an existing key

## 1.3.5

- Fix bug where `MapState.clear()` would not trigger removal handlers

## 1.3.6

- Add `State.subscribeSilent()`
- Add `bulkSubscribe()`

## 1.3.7

- `bulkSubscribe()` does not fire the callback when set up

## 1.3.8

- Allow multiple handlers for `MapState` and `ListState`

## 1.3.9

- Improve error handling
- Fix error where the `children:` directive would attempt to set attributes