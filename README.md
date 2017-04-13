# VirtualContent

**VirtualContent** - is a browser tool designed for handling large text/html content.

## Installation
```javascript
npm i --save virtualcontent
```

## Usage
```javascript
import "VC" from "virtualcontent";

VC.create(options).setText(str).renderTo($container);
```

## Options
<table>
    <tr>
    	<th>Parameter</th><th>Accepts</th><th>Default value</th><th>Description</th>
    </tr>
    <tr>
    	<td>append</sup></td><td>Bool</td><td>false</td><td>Switch to Append mode (Replace mode is the default)</td>
    </tr>
    <tr>
    	<td>chunkPreProcessor</td><td>Function</td><td>null</td><td>Set function which receives chunk (String) as a first argument, and returns String.</td>
    </tr>
    <tr>
    	<td>delay</sup></td><td>Integer</td><td>100</td><td>Delay scroll processing.</td>
    </tr>
    <tr>
    	<td>length</td><td>Number</td><td>10240</td><td>Set maximum length for a chunk string</td>
    </tr>
    <tr>
    	<td>scrollableParent</td><td>Node/jQueryEl/selector</td><td>undefined</td><td>Set scrollable parent node.</td>
    </tr>
    <tr>
      <td>threshold</td><td>Number</td><td>2</td><td>It defines how much chunks are shown at once in Replace mode (default)</td>
    </tr>
</table>


## API
<table>
    <tr>
    	<th>Method</th><th>Arguments</th><th>Returns</th><th>Description</th>
    </tr>
    <tr>
    	<td>create <sup>(static)</sup></td><td>options</td><td>New instance</td><td>Create new VC instance</td>
    </tr>
    <tr>
    	<td>destroy</td><td>none</td><td>self</td><td>Destroy VC instance</td>
    </tr>
    <tr>
    	<td>renderTo</td><td>Node/jQueryEl</td><td>self</td><td>Render to node or $el</td>
    </tr>
    <tr>
    	<td>setHtml</td><td>String</td><td>self</td><td>Set HTML content</td>
    </tr>
    <tr>
    	<td>setText</td><td>String</td><td>self</td><td>Set text content</td>
    </tr>
</table>
