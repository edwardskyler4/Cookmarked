# recipe_app
A recipe collection app designed to accept recipes shared from social media, store them, and allow the user to assign those meals to a calendar for the week.

Team members:

Evan Crenshaw
Ruby Larson
Alex Hooper 
EmilyRose Beck

## MVP capabilities

By the end of Sprint 5, users should be able to:

* Create recipes manually.
* Paste or share social URLs into the app.
* Automatically save the URL, platform, title, thumbnail, and description when available.
* Edit imported information and convert it into a recipe.
* Browse a large recipe library with pagination, search, and filters.
* Tag recipes as breakfast, lunch, dinner, or snack.
* View a weekly calendar.
* Assign, replace, and remove recipes from meal slots.
* Use the app comfortably on a phone and desktop.

| Sprint | Main milestone                  | Important work                                                                                                                                | Exit criterion                                                    |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1      | Foundation and risk validation  | Confirm MVP, wireframes, repository, database schema, authentication, deployment pipeline, test real social URLs and mobile sharing           | A deployed user can sign in and save a test recipe                |
| 2      | Recipe library                  | Recipe create/edit/delete, recipe detail page, tags, search, filtering, pagination, seed data                                                 | Users can manage and find recipes reliably                        |
| 3      | Social capture and import inbox | Paste URL, PWA share target, platform detection, metadata extraction, preview, deduplication, manual fallback, convert saved item into recipe | A shared public link appears in the inbox and can become a recipe |
| 4      | Weekly meal planner             | Week navigation, seven-day layout, meal slots, assign/change/remove recipes, mobile layout                                                    | Users can plan an entire week                                     |
| 5      | Production hardening            | End-to-end testing, permissions, security, accessibility, performance, error states, deployment, backups/export, documentation, beta feedback | A small group can use the app without developer assistance        |
