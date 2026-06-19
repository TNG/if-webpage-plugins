# Distribution

To create a new release:

1. Run `./scripts/prepare-release.sh x.y.z` to create the version bump commit and tag, and push both to `main`.
2. The release workflow (`.github/workflows/release.yaml`) triggers automatically on the pushed `v*` tag. An admin approves the `npm-publish` environment, after which a single run tests, builds, publishes to npm (via OIDC), and creates the GitHub release.

Background:

Publishing uses npm trusted publishing (OIDC), so no long-lived npm token is stored. Everything now happens in one workflow, triggered by the tag — there is no longer a separate release repo or a manual "create GitHub release" step.
