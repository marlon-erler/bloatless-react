# bloatless-react

Bloatless-React is a very minimal and flexible alternative to React.

# Features

-   Supports reactivity through States
-   Supports JSX for components
-   Written in TypeScript
-   Really minimal (under 200 lines)
-   No bloated server or compiler required - just bundle the JavaScript into a static .html file

# Documentation

## Setup

You can use any bundler you want, but esbuild is the fastest and smallest out there:

-   `npm install esbuild bloatless-react`

Set up your project in whatever way you want. Your JavaScript will need to be bundled and imported by your .html files.

## States

In Bloatless-React, States are the foundation of how reactivity is implemented. Similar to many frameworks, a State can hold a value and triggers the UI to update when it changes. However, **subscriptions have to be made manually** due to the minimal nature of this project.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Create States
const name = new React.State("John Doe"); // will be State<string>
const age = new React.State(69); //will be State<number>

// Get value
console.log(name.value);

// Set value
name.value = "Jeff";

// Subscribe
age.subscribe(newAge => console.log(`Age changed to ${newAge}`));
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

A ListState\<T\> is a State whose value is a Set\<T\>. A ListState allows specific subscriptions to detect when items get added and removed. This allows dynamic lists to run efficiently.

```TypeScript
// Import
import * as React from 'bloatless-react';

// Define Item type
class Item implements React.Identifiable {
  uuid = new React.UUID();
  constructor(public text: string) {}
}

// Create ListState
const listState = new React.ListState<Item>();

// Handle addition
listState.handleAddition((newItem) => console.log(newItem.text));

// Handle addition and removal
listState.handleAddition((newItem) => {
    console.log(`${newItem.text} was added`);
    listState.handleRemoval(newItem, () => `${newItem.text} was removed`);
});

// Add item
const newItem = new Item("hello, world!");
listState.add(newItem);

// Remove item
listState.remove(newItem);
```

## UI

Bloatless React provides a modified polyfill for the React API. This means that **you can use JSX** almost like you would in a React project. Additional functionailiy is implemented through directives, similar to Svelte:

### Events

The `on:<event>` attribute adds an EventListener

```TypeScript
<button on:click={someFunction}>Click me</button>
```

### Dynamic Properties and Content

The `subscribe:<property>` attribute subscribes to a State and changes the element's property. You can use attributes as well as innerText and innerHTML.

```TypeScript
const name = new React.State("John Doe");
<span subscribe:innerText={name}></span>
```

### Bindings

The `bind:<property>` attribute acts like a combination of `subscribe:<property>` and `on:input`. It binds the element's property to the state bi-directinally.

```TypeScript
const name = new React.State("John Doe");
<input bind:value={name}></input>
//span will change when the input changes
<span subscribe:innerText={name}></span>
```

### Dynamic Lists

The `subscribe:children` attribute subscribes to a ListState and adds/removes child elements accordingly.

```TypeScript
// Define Item
class Item implements React.Identifiable {
  uuid = new React.UUID();
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
