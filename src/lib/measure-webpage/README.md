# Lighthouse

> [!NOTE] > `Puppeteer` ([Puppeteer](https://github.com/puppeteer/puppeteer)) is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

# Parameters

## model config

- ``:

## observations

- `url`: the url of the web page for which the page weight and loaded resources are determined.

Valid formats must include protocol.

Examples:
- `climateaction.tech` Not Accepted
- `https://climateaction.tech` Accepted
- `climateaction.tech/events` Have to check


## Returns

- `page-weight`:
- `page-resources`:

## IMPL

The following is an example of how `Puppeteer` can be invoked using a manifest.

```yaml
name: puppeteer-demo
description: example manifest invoking puppeteer method
tags:
initialize:
  models:
    - name: puppeteer
      method: PuppeteerModel
      path: '@alexzurbonsen/if-webpage-models-cjs'
tree:
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


