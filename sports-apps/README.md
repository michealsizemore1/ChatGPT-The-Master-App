# Sports app source

This folder contains the editable source projects for the sports applications linked from the My Life Master App home page.

- `nfl-gameday`: NFL Gameday
- `ncaa-top25`: Saturday Top 25

Each application is an independent hosted project with its own package configuration, API route, and `.openai/hosting.json`. Work on and publish each application from its own folder. The links in the root `index.html` continue to open their separately hosted addresses.

Generated dependencies and build output are intentionally excluded. Install dependencies inside the selected application folder before local development or publishing.
