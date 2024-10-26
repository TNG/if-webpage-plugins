# Exec Shell Command

> [!NOTE] > `ShellExecCommand` is a community plugin and not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `ShellExecCommand` plugin allows you to run shell commands within a plugin in your manifest file. This can be useful for running scripts or other commands that are not natively supported by IF.

## Parameters

## config

- `command`: String, the shell command to be executed.

## observations

No input values.

## Returns

- `stdout`: The standard output of the command if it exited with successfully.

In case of exit codes other than 0, nothing is written to input and a log message with the error is written to the console.

## Manifest

The following is an example of how `ShellExecCommand` can be invoked using a manifest.

```yaml
name: exec-shell-command-demo
description: example manifest invoking exec-shell-command
tags:
initialize:
  outputs:
    - yaml
  plugins:
    exec-command:
      method: ShellExecCommand
      path: '@tngtech/if-webpage-plugins'
      config:
        exec-command:
          command: 'echo "Hello, World!"'
tree:
  children:
    child:
      pipeline:
        compute:
          - exec-command
      inputs:
```

The produced `outputs` look like in this example:

```yaml
name: exec-shell-command-demo
description: example manifest invoking exec-shell-command
tags: null
initialize:
  plugins:
    exec-command:
      path: '@tngtech/if-webpage-plugins'
      method: ShellExecCommand
      config:
        command: echo "Hello, World!"
...
tree:
  children:
    child:
      pipeline:
        compute:
          - exec-command
      inputs: null
      outputs:
        - timestamp: '2024-10-26T10:14:16.716Z'
          duration: 0.002
          stdout: Hello, World!
```
