# Impact Framework - Plugins for Estimating Carbon Emissions of Webpages

## Introduction

[![Demo Video Link](assets/demo_video_screenshot.png)](https://www.youtube.com/watch?v=oY9IxVzRbSw)

With the plugins contained in this repo you can estimate the carbon emissions of a webpage. The plugins are designed to be used with the [Impact Framework](https://github.com/Green-Software-Foundation/if). You can assemble a pipeline with them that follows the same methodology as [websitecarbon.com](https://websitecarbon.com) or [ecograder.com](https://ecograder.com). See below for an example.

As the two aforementioned carbon estimation websites, the pipeline is using the [sustainable web design model](https://sustainablewebdesign.org/calculating-digital-emissions/) (swd) for carbon estimation. It is provided by the co2js plugin [1]. The swd model has a broad scope and includes all essential segments of the network into its estimation

- consumer device use
- network use
- data centre use
- hardware production

It makes the complexity of estimating the emissions of all this segments accessible by focusing on the number of transferred bytes on webpage load only. This number of bytes is multiplied by energy consumption per transferred byte. A metric that is estimated such that it includes the energy usage of entire system / internet. The estimated engery use is then multiplied by carbon intensity factor to get the carbon emissions attributed to the webpage load.

Of course, this approach sacrifices some accuracy for simplicity. For example the distance that the bytes travel through the network has no effect on the estimate but on the real emissions. Also, the amount of work that the data center has to do to process the requests, is not taken into account, just the size of the response that is finally sent. If you want to read up on the details of the swd model and the choices behind it, you can do so [here](https://sustainablewebdesign.org/calculating-digital-emissions/).

Compared to the mentioned carbon estimation websites, this pipeline has the advantage that you can choose all parameters that go into the estimation explicitly and make them transparent in your manifest file. The MeasureWebpage plugin also makes an attempt to approximate the amount of data that is reloaded on revisit, thus taking into account the effectiveness of the caching layer explicitly - but there are some caveats. See the [plugin README](src/lib/measure-webpage/README.md) for more details.

[1] co2js plugin: For now this is a slightly modified version of the original plugin in [if-unofficial-plugins](https://github.com/Green-Software-Foundation/if-unofficial-plugins). But necessary changes are hopefully merged soon with this [PR](https://github.com/Green-Software-Foundation/if-unofficial-plugins/pull/50).

## Plugins

- Measure Webpage
- Green Hosting Check
- Timer

The Measure Webpage plugin can measure the page weight of a webpage. It can also estimate the `dataReloadRatio` needed for the [Sustainable Webdesign Model](https://sustainablewebdesign.org/calculating-digital-emissions/) provided by the co2js plugin.

The Green Hosting Check plugin can check if a website is hosted green by querying the [database of the Green Web Foundation](https://www.thegreenwebfoundation.org/tools/green-web-dataset/).

The Timer plugin is more generic. It can provide an accurate timestamp and duration for a measurement.

## Usage

For a usage example, see `example-manifests` directory. For further info on the plugins, see their README files.

## Example Usage (manifest file)

```yaml
name: measure-webpage-demo
description: example manifest for estimating carbon emissions of a webpage
tags:
initialize:
  outputs:
    - yaml
  plugins:
    "timer-start":
      method: TimerStart
      path: '@wr24-greenit/if-webpage-plugins'
    "timer-stop":
      method: TimerStop
      path: '@wr24-greenit/if-webpage-plugins'
    "green-hosting":
      method: GreenHosting
      path: '@wr24-greenit/if-webpage-plugins'
    "measure-webpage":
      method: MeasureWebpage
      path: '@wr24-greenit/if-webpage-plugins'
    "co2js":
      method: Co2js
      path: '@wr24-greenit/if-webpage-plugins'
      global-config:
        options:
          firstVisitPercentage: 0.9
          returnVisitPercentage: 0.1
tree:
  children:
    child:
      pipeline:
        - timer-start
        - measure-webpage
        - timer-stop
        - green-hosting
        - co2js
      config:
        co2js:
          type: swd
        measure-webpage:
          lighthouse: true
          scrollToBottom: true
      inputs:
        - timestamp: '2024-01-01T00:00:00Z' # will be replaced by the actual timestamp
          duration: 1 # will be replaced by the time it took to execute the measure-webpage plugin
          url: https://www.tngtech.com
          resets: [true] # tells the timer-stop method to replace timestamp and duration
```
