# VirtualContent

**VirtualContent** - is a browser tool designed for handling large text/html content.

## Usage
```javascript
VC.create(options).setText(str).renderTo($container);
```

## Options
- append (Bool)
- chunkPreProcessor (Function)
- length (Number)


## API
<table>
    <tr>
    	<th>Method</th><th>Arguments</th><th>Returns</th><th>Description</th>
    </tr>
    <tr>
    	<td>create <sup>(static)</sup></td><td>none</td><td>self</td><td>Destroy VC instance</td>
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
