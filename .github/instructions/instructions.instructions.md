---
description: Always load these instructions for all tasks, regardless of attached files or task context.
# applyTo: 'Describe when these instructions should be loaded by the agent based on task context' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---

<!-- Tip: Use /create-instructions in chat to generate content with agent assistance -->

Never use ViewEncaplsulation.None in Angular components. This can lead to styles leaking out of the component and affecting other parts of the application.

Always check if we already have basic ui components in the `ui` library before creating new ones. If a needed component doesn't exist, create it in the `ui` library so it can be reused across the app. You can find the `ui` library in the `libs/ui` directory of the project. This helps maintain a consistent design and reduces duplication of code.

Use our icon lib.

When writing tests make sure to use data-testid attributes whenever possible to target elements in a way that is resilient to changes in the UI structure or styling. This will help ensure that tests remain stable and reliable even as the UI evolves over time.