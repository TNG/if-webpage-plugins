# MeasureWebpage

> [!NOTE] > `MeasureWebpage` (based on [Puppeteer](https://github.com/puppeteer/puppeteer) and [Lighthouse](https://github.com/GoogleChrome/lighthouse)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `MeasureWebpage` plugin measures the weight of a webpage in bytes and the weight of the resources categorized by type. It can also approximate, within certain restrictions, the percentage of data that needs to be reloaded if the page is revisited. The plugin is build with Puppeteer. It can also generate a Lighthouse report.

# Parameters

## Global Config and Config

The following parameters are optional and can be set in the global config or in the config of the plugin node.

- `mobileDevice:`: You can pick a mobile device to emulate. Must be one of puppeteer's known devices: https://pptr.dev/api/puppeteer.knowndevices
- `emulateNetworkConditions`: You can pick one of puppeteer's predefined network conditions: https://pptr.dev/api/puppeteer.predefinednetworkconditions
- `scrollToBottom`: If true, emulates a user scrolling to the bottom of the page (which loads all content that isn't loaded on initial load). If false, the page is not scrolled. Default: false.
- `timeout`: Maximum wait time in milliseconds for page load. Pass 0 to disable the timeout. Default: 30000 ms. https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout
- `headers`:
  - `accept`: string https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
  - `accept-encoding`: array of allowed encodings (a single encoding can also be passed as a string) https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
- `lighthouse`: boolean, if true, a lighthouse report is generated

If parameters are provided twice, the node config is taking precedence.

## Inputs

- `url`: the URL of the webpage to measure (has to include the protocol type, like https://)
- `timestamp`: a timestamp for the observation

## Returns

- `network/data/bytes`: page weight in bytes
- `network/data/resources/bytes`: resources weights by category in bytes
- `dataReloadRatio`: the percentage of data that is downloaded by return visitors (can be fed into the CO2.JS plugin)
  if `options.dataReloadRatio` is already provided in input, the plugin won't calculate it
- `lighthouse-report`: file name of the full lighthouse report, stored in html format in the directory in which `if-run` is executed
  if `lighthouse` is set to true in the config

# Further Info

The plugin uses Puppeteer to measure the weight of a webpage and its resource categories in bytes, where weight refers to the transfer size of the resources.

The page weight (the number of bytes transferred to load the page) can be feed into the co2js plugin to estimate the carbon emissions associated with the page load.

Several config options are provided to modify the loading of the page, e.g. emulating a mobile device and network conditions. By scrolling to the bottom of the page one can also take into account lazy loaded resources. Custome accept and accept-encoding request headers can also be provided.

The plugin can also approximate the `dataReloadRatio` that is needed for carbon emissions estimation with the Sustainable Webdesign Model (provided by the co2js plugin). To approximate the `dataReloadRatio` the page weight is calculated for a first visit and a return visit. The difference `weight of initial load - weight of reload` plus the weight of the resources that were loaded from browser cache on reload, is assumed to be the weight of resources that did not need reloading.
This assumption can be off. For example if there is a lot of dynamic content on the page, that is requested only under certain conditions or at specific times. Also, cached resources provided by service workers are not taken into account. Possibly, content personalization can also distort the measurement if initial load and reload do not get comparable content.

Additionally, the plugin can also generate a lighthouse report to provide additional insights into the performance of the webpage.

Further remarks:
- Cookies are not supported.
- Device emulation only sets screen size and user agent. It does not throttle network speed or CPU to match device capabilities.

## Manifest

The following is an example of how `MeasureWebpage` can be invoked using a manifest.

```yaml
name: measure-webpage-demo
description: example manifest invoking the MeasureWebpage method
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


