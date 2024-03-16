# MeasureWebpage

> [!NOTE] > `MeasureWebpage` (based on [Puppeteer](https://github.com/puppeteer/puppeteer)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

cookies are not supported
device emulation only sets screen size and user agent (?) but does not throttle network speed or CPU

`dataReloadRatio`: based on incomplete knowledge. explain approach for calculation and its weaknesses (the ones I know of, dynamic content, timing, service workerts)
if `options.dataReloadRatio` is already provided in input, it won't calculate it

# Parameters

## model config

- `mobileDevice:`: A mobile device to emulate. Must be one of puppeteer's known devices: https://pptr.dev/api/puppeteer.knowndevices (Default: TODO).
- `scrollToBottom`: If true, emulates a user scrolling to the bottom of the page (which loads all content that isn't loaded on initial load). If false, the page is not scrolled. Default is false.
- `switchOffJavaScript`: If true, JavaScript is disabled. If false, JavaScript is enabled. Default is false.
- `timeout`: Maximum wait time in milliseconds. Pass 0 to disable the timeout. https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout
- `headers`:
  - `accept`: string https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
  - `accept-encoding`: array of allowed encodings (a single encoding can also be passed as a string) https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
  -

## observations

... tbd

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


