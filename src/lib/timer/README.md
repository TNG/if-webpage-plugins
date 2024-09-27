# Timer

> [!NOTE] > `TimerStart` and `TimerStop` are community plugins, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `TimerStart` and `TimerStop` plugins are used to record the current timestamp and measure duration of plugin runs in a pipeline. `TimerStart` is used to start the timer, and `TimerStop` is used to stop the timer and calculate the duration. The `TimerStart` plugin has no input parameters. The `TimerStop` plugin has a single input parameter, `resets`, which is an array of booleans, one for every `TimerStart`, `TimerStop` pair (the first one for the first pair, the second one for the second and so on). If `true` the `timestamp` is replaced with the start time measured by the corresponding `TimerStart` step. Moreover, the `duration` is replaced by the difference between the times measured by `TimerStop` and `TimerStart`. If `false` the timestamp is not reset and the time difference between `TimerStart` and `TimerStop`calls is added to the `duration` value. `TimerStop` also removes the first reset value from the array. If none are left, it deletes the parameter entirely.

# Parameters

## observations

### `TimerStart`

- Has no input parameters.

### `TimerStop`

- `resets`: An array of booleans indicating whether the time should be reset. The length of the array has to be identical to the number of invocations of `TimerStop`.
- `timer/start`: Usually set by a prior invocation of `TimerStart`. (But that is no requirement.)

## Returns

### `TimerStart`

- `timer/start`: Set to the time of invocation of `TimerStart`.

### `TimerStop`

If reset is true:

- `timestamp`: set to the value of `timer/start`.
- `duration`: Set to the difference: time of invocation of `TimerStop` - time of invocation of `TimerStart`.
- deletes `timer/start` if present.

If reset is false:

- `duration`: Set to: `duration` + time of invocation of `TimerStop` - time of invocation of `TimerStart`.
- deletes `timer/start` if present.

## Error Handling

- `TimerStart` throws an error if there is already an input value `time/start` because that indicates that `TimerStop` was not called before calling `TimerStart`, since `TimerStop` removes removes the `time/start` parameter.
- `TimerStop` validates its inputs with the zod library and will throw errors if `time/start` is missing and the `resets` array does not contain at least one value.

## Manifest

The following is an example of how `TimerStart` and `TimerStop` can be invoked using a manifest.

```yaml
name: timer-demo
description: example manifest invoking timer plugins
tags:
initialize:
  outputs:
    - yaml
  plugins:
    timer-start:
      method: TimerStart
      path: '@TNG/if-webpage-plugin'
    timer-stop:
      method: TimerStop
      path: '@TNG/if-webpage-plugin'
    exec-command:
      method: ShellExecCommand
      path: '@TNG/if-webpage-plugins'
tree:
  children:
    child:
      pipeline:
        - timer-start
        - exec-command
        - timer-stop
      config:
        exec-command:
          command: 'sleep 10'
      inputs:
        - timestamp: 2024-02-25T00:00 # some placeholder timestamp that will be substituted by timer-start
          duration: 1 # if reset = true this will be overwritten, otherwise it will be added to
          resets: [true]
```

The `outputs` look like in this example:

```yaml
...
tree:
  children:
    child:
      pipeline:
        - timer-start
        - exec-command
        - timer-stop
      config:
        exec-command:
          command: sleep 1
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          resets:
            - true
      outputs:
        - timestamp: '2024-09-08T19:44:29.657Z'
          duration: 1.017
          stdout: ''
```
