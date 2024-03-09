# Timer

> [!NOTE] > `TimerStart` and `TimerStop` are community plugins, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

# Parameters

## observations

### `TimerStart`

- `resets`: An array of booleans indicating whether the timer should be reset. If true, the timer is reset. If false, the timer is not reset. The length of the array has to be identical to the number of invocations of `TimerStart`.

### `TimerStop`

Has no input parameters.

## Returns

### `TimerStart`

If reset is true:
- `timestamp`: Set to the time of invocation of `TimerStart`.
- `duration`: 0

If reset is false:
- `timer/start`: Set to the time of invocation of `TimerStart`.

### `TimerStop`
- `duration`: previous value + time between invocation of `TimerStart` and `TimerStop`
Deletes `timer/start` if present.

## Manifest

The following is an example of how `TimerStart` and `TimerStop` can be invoked using a manifest.

```yaml
name: timer-demo
description: example manifest invoking timer methods
tags:
initialize:
  models:
    "timer-start":
      method: TimerStart
      path: '@alexzurbonsen/if-webpage-models-cjs'
    "timer-stop":
      method: TimerStop
      path: '@alexzurbonsen/if-webpage-models-cjs'
    "measure-webpage":
      method: MeasureWebpage
      path: '@alexzurbonsen/if-webpage-models-cjs'
tree:
  children:
    child:
      pipeline:
        - timer-start
        - measure-webpage
        - timer-stop
      config:
      inputs:
        - timestamp: 2024-02-25T00:00 # time when measurement occurred
          duration: 1
          url: www.thegreenwebfoundation.org
          resets: [true]
```


