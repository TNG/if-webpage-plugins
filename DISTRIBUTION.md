# Distribution

To create a new release

1. Run `./scripts/prepare-release.sh` to create a version bump commit and a tag.
2. Create the GitHub release.
3. The release workflow should be triggered automatically and an admin needs to approve it. It picks up the latest tag to create a release.

Background:

Security restrictions in the separation of code and release repo make it hard to have one automated workflow for the release that does all the things at once (create version bump commit and tag, publish release).

To make the two step setup convenient the branch protection rules are configured such that pushes are possible without requiring all checks to pass.

This is a short-coming since it can lead to a broken main branch.
But otherwise I have to do even more manual stuff. Doesn't make me happy...
Might have to reconsider if this proves to be the wrong choice.
