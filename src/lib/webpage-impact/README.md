# Webpage Impact

> [!NOTE] > `WebpageImpact` (based on [Puppeteer](https://github.com/puppeteer/puppeteer)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `WebpageImpact` plugin measures the weight of a webpage in bytes and the weights of the different loaded resources categorized by type. It can also approximate, with certain restrictions, the percentage of data that needs to be reloaded if the page is revisited. The plugin is build with [Puppeteer](https://github.com/puppeteer/puppeteer). Its outputs can be fed to the [co2js plugin](https://github.com/Green-Software-Foundation/if-unofficial-plugins/tree/main/src/lib/co2js) to estimate carbon impacts.

**Note**: The plugin and the example manifest below were tested with v0.7.1 of the Impact Framework (IF). Since IF's interface is still subject to change, it cannot be guaranteed that plugin and manifest will work with future versions of IF.

## Parameters

`WebpageImpact` is intended to be used in the `observe` phase of the manifest computation. Thus, the `url` for measurement is passed as a config option.

### Config

- `url`: the URL of the webpage to measure (has to include the protocol type, like https://)

The follwing config parameters are optional:

- `computeReloadRatio`: If true, a heuristic value for the `dataReloadRatio` is computed, which can be used as input for the co2js plugin. Any value for the `dataReloadRatio` that is provided as input will be overwritten. The data reload ratio expresses how much data has to be reloaded if the web page is visited a second time.
- `mobileDevice:`: You can pick a mobile device to emulate. Must be one of puppeteer's known devices: https://pptr.dev/api/puppeteer.knowndevices
- `emulateNetworkConditions`: You can pick one of puppeteer's predefined network conditions: https://pptr.dev/api/puppeteer.predefinednetworkconditions
- `scrollToBottom`: If true, emulates a user scrolling to the bottom of the page (which loads all content that isn't loaded on initial load). If false, the page is not scrolled. Default: false.
- `timeout`: Maximum wait time in milliseconds for page load. Default: 30000 ms. https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout
- `headers`:
  - `accept`: string https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
  - `accept-encoding`: array of allowed encodings (a single encoding can also be passed as a string) https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
- `username`: The plugin supports simple logins with username and password. Provide the username if the page you want to measure requires such a login. The password needs to be stored in a shell environment variable called `WI_PASSWORD`. Please note, that the login may fail nevertheless because the plugin expects a certain interface that may not be provided by your page.

### Returns

- `network/data/bytes`: page weight in bytes
- `network/data/resources/bytes`: resource weights by category in bytes
- `dataReloadRatio`: If `computeReloadRatio` is true: estimate of the amount of data that is reloaded on return visits (Can be fed into the co2js plugin.)
- `timestamp`: set to the time of the plugin execution
- `duration`: set to 0 (because the request time does not seem of particular interest here to the author)

### Error Handling

- `WebpageImpact`validates its inputs with the zod library and will throw errors if the requirements on inputs are not met.

## Further Info

The plugin uses [Puppeteer](https://github.com/puppeteer/puppeteer) to measure the weight of a webpage and its resource categories in bytes, where weight refers to the transfer size of the resources.

The page weight (the number of bytes transferred to load the page) can be feed into the co2js plugin to estimate the carbon emissions associated with the page load.

Several config options are provided to modify the loading of the page, e.g. emulating a mobile device and network conditions. By scrolling to the bottom of the page one can also take into account lazy loaded resources. Custom accept and accept-encoding request headers can also be provided.

Please note: The reported page weight may be smaller than what you expect. For example, a web page might load additional resources after the cookie banner has been closed by the user. The plugin does not interact with the page, except for the option to scroll to the bottom of the page.

The plugin can also approximate the `dataReloadRatio` that is needed for carbon emissions estimation with the Sustainable Webdesign Model (provided by the co2js plugin). To approximate the `dataReloadRatio` the page weight is calculated for a first visit and a return visit. All the weight of all resources that were served from cache on reload are substracted from the page weight to get the `dataReloadRatio`.
This assumption can be off. For example if there is a lot of dynamic content on the page, that is requested only under certain conditions or at specific times. Possibly, content personalization can also distort the measurement if initial load and reload do not get comparable content. Also, prefetched requests might be served from cache and are counted as reloaded in this case, even though no data was reused.

Further remarks:

- Cookies are not supported.
- Device emulation only sets screen size and user agent. It does not throttle network speed or CPU to match device capabilities.

## Manifest

The following is an example of how `WebpageImpact` can be invoked using a manifest.

```yaml
name: webpage-impact-demo
description: example manifest invoking the WebpageImpact plugin
tags:
initialize:
  output:
    - yaml
  plugins:
    'webpage-impact':
      method: WebpageImpact
      path: '@tngtech/if-webpage-plugins'
      config:
        url: 'https://tngtech.com'
        computeReloadRatio: true
tree:
  children:
    child:
      pipeline:
        observe:
          - webpage-impact
      inputs:
```
