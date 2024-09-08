# Green Hosting

> [!NOTE] > `Green-Hosting` ([Green Web Foundation](https://www.thegreenwebfoundation.org/tools/green-web-dataset/)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `GreenHosting` plugin checks whether the domain of the provided url is hosted with green energy as reported by the Green Web Foundation's [green web check database](https://www.thegreenwebfoundation.org/green-web-check/).

# Parameters

## observations

- `url`: the url of web page that is checked for green hosting.

## Returns

- `green-hosting`: boolean indicating whether a web page is hosted green or not according to the Green Web Foundation's [green web check database](https://www.thegreenwebfoundation.org/green-web-check/).

## Error Handling

- `GreenHosting` validates its inputs with zod. An error is raised if the required `url` parameter is missing.

## IMPL

The following is an example of how `GreenHosting` can be invoked using a manifest.

```yaml
name: green-hosting-demo
description: example manifest invoking green-hosting plugin
tags:
initialize:
  outputs:
    - yaml
  plugins:
    'green-hosting':
      method: GreenHosting
      path: '@wr24-greenit/if-webpage-plugins'
tree:
  children:
    child:
      pipeline:
        - green-hosting
      config:
      inputs:
        - timestamp: 2024-02-25T00:00 # time when measurement occurred
          duration: 1
          url: www.thegreenwebfoundation.org```
```
