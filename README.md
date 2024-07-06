# bloatless-react

Bloatless-React is a very minimal and flexible alternative to React.

# Features

-   Supports reactivity through States
-   Supports JSX for components
-   Written in TypeScript
-   Really minimal (under 200 lines)
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

// Subscribe
age.subscribe(newAge => console.log(`Age changed to ${newAge}`));

// Set value
name.value = "Jeff";
```

## Proxy States

A Proxy State is a State based on multiple other States. This reduces code and can increase performance.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Create States
const name = new React.State("John Doe"); // will be State<string>
const age = new React.State(69); //will be State<number>

// Proxy State
const summary = React.createProxyState([name, age], () => `${name.value} is ${age.value} years old.`)
summary.subscribe(console.log);
```

## ListStates

A `ListState<T>` is a State whose value is a `Set<T>`. A ListState allows specific subscriptions to detect when items get added and removed. This allows dynamic lists to run efficiently.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Define Item type
class Item implements React.Identifiable {
  id = React.UUID();
  constructor(public text: string) {}
}

// Create ListState
const listState = new React.ListState<Item>();

// Handle addition and removal
listState.handleAddition((newItem) => {
  console.log(`${newItem.text} was added`);
  listState.handleRemoval(newItem, () => console.log(`${newItem.text} was removed`));
});

// Add item
const newItem = new Item("hello, world!");
listState.add(newItem);

// Remove item
listState.remove(newItem);
```

## Persistence

States can persist through reloads via LocalStorage. To implement this, modify your code like this:
```diff
-const myState = new React.State("hello");
+const myState = React.restoreState("my-state", "hello");

-const myListState = new React.ListState<Item>();
+const myListState = React.restoreListState<Item>("my-list-state");
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

The `subscribe:<property>` directive subscribes to a State and changes the element's property. The property will be changed through the DOM API, so you can use innerText and innerHTML. You can not use this to set attributes.

```TypeScript
const name = new React.State("John Doe");
<span subscribe:innerText={name}></span>
```

## Toggling Attributes

The `toggle:<attribute>` directive toggles attributes on the HTML element without assigning a value. This is useful for the `disabled` attribute.

```TypeScript
const isDisabled = new React.State(false);
<button toggle:disabled={isDisabled}>Some button</button>
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

The `subscribe:children` directive subscribes to a ListState and adds/removes child elements accordingly.

```TypeScript
import * as React from 'bloatless-react';

// Define Item
class Item implements React.Identifiable {
  id = React.UUID();
  constructor(public text: string) {}
}

// This ListItemConverter creates an HTML element based on an Item
const convertItem: React.ListItemConverter<Item> = (item, listState) => {
  function remove() {
    listState.remove(item);
  }
  return (
    <span>
      {item.text}
      <button on:click={remove}>Remove</button>
    </span>
  );
};

// Create ListState
const listState = new React.ListState<Item>();

// Prepare adding items
const newItemName = new React.State("");

function addItem() {
  const newItem = new Item(newItemName.value);
  listState.add(newItem);
}

// Build UI
document.body.append(
  <div>
    <input bind:value={newItemName}></input>
    <button on:click={addItem}>Add</button>
    <div subscribe:children={[listState, convertItem]}></div>
  </div>
);
```

# Changelog
## 1.1.0
- Improve code
- Add missing `break` statements for directives
- Add `toggle` directive
- Improve documentation

## 1.1.1
- Improve documentation

## 1.1.2
- Remove `console.log()` calls
- Improve documentation

## 1.1.3
- Add `on:enter` directive

## 1.2.0
**BREAKING CHANGES**
- Replace UUID class with function;
  - `new UUID()` => `UUID() returns string`
- Replace definition of `Identifiable`
  - now has `id: string` instead of `uuid: UUID()`

Other changes:
- Add State persistence
- Add error description when utilizing `subscribe:children` incorrectly
- Fix bug where ListState subscriptions were not called
- Improve documentation