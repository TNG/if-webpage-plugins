# Lighthouse

> [!NOTE] > `Green-Hosting` ([Green Web Foundation](https://www.thegreenwebfoundation.org/tools/green-web-dataset/)) is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

# Parameters

## model config

- ``:

## observations

- `domain`: the domain of the web page that is checked for green hosting.

Valid formats must not include protocol, port, or path information.

Examples:
- `climateaction.tech` Accepted
- `https://climateaction.tech` Not Accepted
- `climateaction.tech/events` Not Accepted


## Returns

- `green-hosting`: boolean indicating whether a web page is hosted green or not according to the Green Web Foundation's database (API endpoint: https://api.thegreenwebfoundation.org/greencheck/{url})

## IMPL

The following is an example of how `GreenHostingModel` can be invoked using an `impl`.

```yaml
name: green-hosting-demo
description: example impl invoking green-hosting model
tags:
initialize:
  models:
    - name: green-hosting
      model: GreenHostingModel
      path: '@alexzurbonsen/if-webpage-models-cjs'
graph:
  children:
    child:
      pipeline:
        - green-hosting
      config:
      inputs:
        - timestamp: 2024-02-25T00:00 # time when measurement occurred
          duration: 1
          url: thegreenwebfoundation.org
```


