# Test Cases

To test the functionality of the plugins in this repo, you need an [installation
of the impact framework cli tool](https://if.greensoftware.foundation/users/how-to-install-if).

Install if-webpage-plugins globally on your system with

```sh
pnpm link
```

and run the following commands to check their output files.

```sh
if-run --manifest ./example-manifests/green-hosting.yaml --output ./example-manifests/output/green_hosting_test.yaml
if-run --manifest ./example-manifests/co2js.yaml --output ./example-manifests/output/co2js_test.yaml
if-run --manifest ./example-manifests/timer.yaml --output ./example-manifests/output/timer_test.yaml
if-run --manifest ./example-manifests/webpage-impact.yaml --output ./example-manifests/output/webpage_impact_test.yaml
```
