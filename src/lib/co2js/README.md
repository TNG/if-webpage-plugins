# CO2.JS

> [!NOTE] > `CO2.JS` ([thegreenwebfoundation/co2.js](https://github.com/thegreenwebfoundation/co2.js)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

**Note**: The plugin and the example manifest below were tested with v0.7.1 of the Impact Framework (IF). Since IF's interface is still subject to change, it cannot be guaranteed that plugin and manifest will work with future versions of IF.

# Parameters

## Config

- `type`: supported plugins by the library, `swd` or `1byte`
- `version`: **SWD Plugin Only** `3` or `4`

## Inputs

- `network/data/bytes`: the number of bytes transferred or `network/data` if the number is in GB
- `green-web-host`: true if the website is hosted on a green web host, false otherwise
- `duration`: the amount of time the observation covers, in seconds
- `timestamp`: a timestamp for the observation
- `options`: **SWD Plugin Only** an object containing any Sustainable Web Design specific variables to the changed. All keys are optional.
  - `dataReloadRatio` - a value between 0 and 1 representing the percentage of data that is downloaded by return visitors
  - `firstVisitPercentage` - a value between 0 and 1 representing the percentage of new visitors.
  - `returnVisitPercentage` - a value between 0 and 1 representing the percentage of returning visitors.
  - `gridIntensity` - an object that can contain the following optional keys:
    - `device` - a number representing the carbon intensity for the given segment (in grams per kilowatt-hour). Or, an object, which contains a key of country and a value that is an Alpha-3 ISO country code.
    - `dataCenter` - a number representing the carbon intensity for the given segment (in grams per kilowatt-hour). Or, an object, which contains a key of country and a value that is an Alpha-3 ISO country code.
    - `networks` - A number representing the carbon intensity for the given segment (in grams per kilowatt-hour). Or, an object, which contains a key of country and a value that is an Alpha-3 ISO country code.

The value for `device`, `dataCenter`, or `networks` can be a number representing the carbon intensity for the given segment (in grams per kilowatt-hour). Or, an object, which contains a key of country and a value that is an Alpha-3 ISO country code.

## Returns

- `estimated-carbon`: carbon emissions from the operation of the website, in grams of CO2e

# IF Implementation

IF utilizes the CO2JS Framework to calculate the carbon emissions of a website. The CO2JS Framework is a collection of plugins that calculate the carbon emissions of a website based on different parameters. IF installs the CO2js npm package from `@tgwf/co2js` and invokes its functions from a plugin.

## Usage

In IF the plugin is called from an `manifest`. An `manifest` is a `.yaml` file that defines a computation of impacts. This is interpreted by the command line tool, `if-run`.

The plugin config should define a `type` supported by the CO2.JS library (either `swd` or `1byte`). These are different ways to calculate the operational carbon associated with a web application; `swd` is shorthand for 'sustainable web design' plugin and `1byte` refers to the OneByte mdoel. You can read about the details of these plugins and how they differ at the [Green Web Foundation website](https://developers.thegreenwebfoundation.org/co2js/explainer/methodologies-for-calculating-website-carbon/).

Each input is expected to contain `network/data/bytes` or `network/data`, `duration` and `timestamp` fields.

## Manifest

The following is an example of how CO2.JS can be invoked using an `manifest`.

```yaml
name: co2js-demo
description: example manifest invoking CO2.JS plugin
tags:
initialize:
  plugins:
    co2js:
      method: Co2js
      path: '@tngtech/if-webpage-plugins'
      config:
        type: swd
        version: 4
  outputs:
    - yaml
tree:
  children:
    child:
      pipeline:
        compute:
          - co2js
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          network/data/bytes: 1000000
          green-web-host: true
          options:
            dataReloadRatio: 0.6
            firstVisitPercentage: 0.9
            returnVisitPercentage: 0.1
            gridIntensity:
              device: 560.98
              dataCenter:
                country: 'TWN'
```

You can run this by passing it to `if-run`. To compute the manifest file, first install the impact framework and the co2js plugin.

```sh
npm i -g @grnsft/if
npm i -g @tngtech/if-webpage-plugins
```

Then, use the following command run from the project root to compute the manifest:

```sh
if-run --manifest ./examples/manifests/test/co2js.yml --output ./examples/outputs/co2js.yml
```

This yields a result that looks like the following (saved to `/outputs/co2js.yml`):

```yaml
name: co2js-demo
description: example manifest invoking CO2.JS plugin
tags: null
initialize:
  plugins:
    co2js:
      path: '@tngtech/if-webpage-plugins'
      method: Co2js
      config:
        type: swd
        version: 4
  outputs:
    - yaml
tree:
  children:
    child:
      pipeline:
        compute:
          - co2js
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          network/data/bytes: 1000000
          green-web-host: true
          options:
            dataReloadRatio: 0.6
            firstVisitPercentage: 0.9
            returnVisitPercentage: 0.1
            gridIntensity:
              device: 560.98
              dataCenter:
                country: TWN
      outputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          network/data/bytes: 1000000
          green-web-host: true
          options:
            dataReloadRatio: 0.6
            firstVisitPercentage: 0.9
            returnVisitPercentage: 0.1
            gridIntensity:
              device: 560.98
              dataCenter:
                country: TWN
          carbon-operational: 0.119
```

## TypeScript

You can see example Typescript invocations for each plugin below.

### SWD

```typescript
import {Co2js} from '@tngtech/if-webpage-plugins';

const config = {type: 'swd', version: 4};
const co2js = Co2js(config, {}, {});
const results = await co2js.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    'network/data/bytes': 1000000, // bytes transferred
    'green-web-host': true, // true if the website is hosted on a green web host, false otherwise
    options: {
      // Optional
      dataReloadRatio: 0.6,
      firstVisitPercentage: 0.9,
      returnVisitPercentage: 0.1,
      gridIntensity: {
        device: 560.98,
        dataCenter: 50,
        networks: 437.66,
      },
    },
  },
]);
```

### 1byte

```typescript
import {Co2js} from '@tngtech/if-webpage-plugins';

const config = {type: '1byte'};
const co2js = Co2js(config, {}, {});
const results = await co2js.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    'network/data/bytes': 1000000, // bytes transferred
    'green-web-host': true, // true if the website is hosted on a green web host, false otherwise
  },
]);
```
