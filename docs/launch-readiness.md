# Launch-readiness notes

This repository is being prepared on the `launch-readiness` branch. The checklist is intentionally honest: items that require a real Discord deployment, a license choice, or owner-only GitHub settings remain marked for follow-up instead of being represented as complete.

## Recording the demo

Run the relevant bot locally with test credentials in a local, ignored `.env` file. Record one short flow that shows the bot responding to a slash command and, if useful, the HQ dashboard. Keep the recording under 15 seconds and 5 MB, save it under `assets/` or `docs/`, and replace `docs/demo-placeholder.svg` in the README.

## Required owner actions

Choose the project license, confirm the public demo URL, upload `assets/social-preview.svg` under Settings → Social preview if GitHub does not accept the SVG through the API, and enable Discussions with the requested categories. After the pull request is merged, confirm the release version before creating a tag or GitHub Release.
