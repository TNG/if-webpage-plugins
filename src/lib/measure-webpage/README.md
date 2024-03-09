# Lighthouse

> [!NOTE] > `Puppeteer` ([Puppeteer](https://github.com/puppeteer/puppeteer)) is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

# Parameters

## model config

- `timeout`: Maximum wait time in milliseconds. Pass 0 to disable the timeout. https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout
- `mobileDevice:`: A mobile device to emulate. Must be one of puppeteer's known devices: https://pptr.dev/api/puppeteer.knowndevices
- `scrollToBottom`: If true, emulates a user scrolling to the bottom of the page (which loads all content that isn't loaded on initial load). If false, the page is not scrolled. Default is false.
- `headers`:
  - `accept`: string https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
  - `accept-encoding`: array of allowed encodings (a single encoding can also be passed as a string) https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
  -

## observations

- `url`: the url of the web page for which the page weight and loaded resources are determined.

Valid formats must include protocol.
TODO: check...
Examples:
- `climateaction.tech` Not Accepted
- `https://climateaction.tech` Accepted
- `climateaction.tech/events` Have to check


## Returns

TODO: outdated
- `page-weight`:
- `page-resources`:

## Manifest

The following is an example of how `MeasureWebpage` can be invoked using a manifest.

```yaml
name: measure-webpage-demo
description: example manifest invoking MeasureWebpage method
tags:
initialize:
  models:
    - name: measure-webpage
      method: MeasureWebpage
      path: '@alexzurbonsen/if-webpage-models-cjs'
tree:
  children:
    child:
      pipeline:
        - measure-webpage
      config:
      inputs:
        - timestamp: 2024-02-25T00:00 # time when measurement occurred
          duration: 1
          url: https://github.com/puppeteer/puppeteer
```


