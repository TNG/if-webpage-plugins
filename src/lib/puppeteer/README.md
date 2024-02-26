# Lighthouse

> [!NOTE] > `Puppeteer` ([Puppeteer](https://github.com/puppeteer/puppeteer)) is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

# Parameters

## model config

- ``:

## observations

- `url`: the url of the web page for which the page weight and loaded resources are determined.

Valid formats must include protocol.

Examples:
- `climateaction.tech` Accepted
- `https://climateaction.tech` Not Accepted
- `climateaction.tech/events` Not Accepted


## Returns

- `page-weight`:
- `page-resources`:

## IMPL

The following is an example of how `PuppeteerModel` can be invoked using an `impl`.

```yaml
name: puppeteer-demo
description: example impl invoking puppeteer model
tags:
initialize:
  models:
    - name: puppeteer
      model: PuppeteerModel
      path: '@alexzurbonsen/if-webpage-models-cjs'
graph:
  children:
    child:
      pipeline:
        - puppeteer
      config:
      inputs:
        - timestamp: 2024-02-25T00:00 # time when measurement occurred
          duration: 1
          url: https://github.com/puppeteer/puppeteer
```


