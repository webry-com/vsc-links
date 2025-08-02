# VSCode Links

- [Setup](#setup)
- [Docs](https://vscl.webry.com/getting-started.html)
- [Config](#config)
- [Examples](#examples)
- [Latest Changes](#latest-changes)

## Setup

- Install the extension [here](https://marketplace.visualstudio.com/items?itemName=webry.vscode-links)
- Create a config file `Ctrl+Shift+P` -> `VSC Links: Create Config File`
- _Optional_ `npm i -D vscl@latest` (Adds typings for easier config editing)

## Docs

Read the full docs [here](https://vscl.webry.com/getting-started.html)

## Previews

![](./previews/eslint-comment.png)
![](./previews/eslint-config.png)
![](./previews/out-git.png)

## Debugging your config

- Open the output panel
- Select `VSCode Links` from the dropdown
- Errors will be shown here
- If the links dont work/update, try `Ctrl+Shift+P` -> `VSC Links: Restart` _(can happen when renaming/moving config file)_
- Use the `log` function argument of your handler function to log strings to the output panel.

## Config

### `links`

An array of link objects with the properties:

- **include:** Glob pattern to include files. _(string | string[])_
- **exclude:** Glob pattern to exclude files. Will exclude even if a file is included. _(string | string[])_
- **pattern:** Regex pattern to match links. Use `(?<link>ClickableText)` to define the clickable area if its different from the whole regex match. _(RegExp)_
- **handle:** Function to handle the link. _(Function)_
  - **linkText:** Text matched by the pattern. _(string)_
  - **file:** Template literal tag to get the file path based on the current file and os.
  - **workspace:** Template literal tag to get the workspace file path based on your relative path and os.
  - **log:** Function to log strings to the VSCode Links output panel.

### `extends`

A string or array of strings to extend other config files. _(string | string[])_ Example: `"./other-config.js"`

## Examples

<details>
  <summary>Git Links</summary>
  You can create a config to open git issues in your browser like this:

```ts
import { type Config } from "vscl"

export default {
  links: [
    {
      include: "**/*.js",
      pattern: /git#\d+/g, // Clickable: "git#123"
      handle: ({ linkText }) => {
        const issue = linkText.replace("git#", "")
        return {
          target: `https://github.com/webry-com/vscode-links/issues/${issue}`,
        }
      },
    },
  ],
} satisfies Config
```

</details>

<details>
  <summary>API Strings</summary>
  Here is a config to open the python file based on an api route in frappe:

```ts
import { type Config } from "vscl"

export default {
  links: [
    {
      include: "*",
      pattern: /"(?<link>frappe(\.[^"'`]+)+)"/g, // Clickable: "frappe.core.doctype.user.user.get_timezones"
      handle: ({ linkText, workspace }) => {
        const parts = linkText.split(".")
        const apiName = parts.pop()
        return {
          target: workspace`${parts.join("/")}.py`,
          tooltip: `Open python file for the "${apiName}" API.`,
          jumpPattern: `def ${apiName}(`, // Jump to the function definition in user.py
        }
      },
    },
  ],
} satisfies Config
```

</details>

## Latest Changes

- _**Breaking:** The `workspace` and `file` helpers from `vscode-links-cli` will no longer work. Instead they are now arguments to the handle function (see examples)._
- Added [docs](https://vscl.webry.com/getting-started.html)
- Added Typescript support for the config file
- Added "Restart" command to restart the extension
- Added different formats for the "Create Config" command (.ts, .js. .cjs, .mjs)
- Moved the config loading from `vscode-links-cli` to the extension. The package is now deprecated. In replacement you can optionally install the `vscl` package to get typings and intellisense in your config.

## Contribute

Feel free to open an issue or PR.
