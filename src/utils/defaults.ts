export type ConfigType = ".ts" | ".js" | ".cjs" | ".mjs"

export function createBaseConfig(configType: ConfigType): string {
  switch (configType) {
    case ".ts":
      return `
import type { Config } from "vscl";

export default {
  links: [
    {
      include: "*",
      pattern: /vscode-link/g,
      handle: ({ /* Ctrl + Space */ }) => {
        // Your magic 🧙‍♂️
        return {
          target: "https://github.com/webry-com/vsc-links#readme",
          tooltip: "Go to VSCode ReadMe.",
          description: "## VSCode Links\\nClick to go to the README.",
          buttons: [
            {
              title: "To the README, wooo",
              target: "https://github.com/webry-com/vsc-links#readme"
            }
          ]
        };
      },
    },
  ],
} satisfies Config;
`
    case ".js":
      return `
/** @type {import("vscl").Config} */
export default {
  links: [
    {
      include: "*",
      pattern: /vscode-link/g,
      handle: ({ /* Ctrl + Space */ }) => {
        // Your magic 🧙‍♂️
        return {
          target: "https://github.com/webry-com/vsc-links#readme",
          tooltip: "Go to VSCode ReadMe.",
          description: "## VSCode Links\\nClick to go to the README.",
          buttons: [
            {
              title: "To the README, wooo",
              target: "https://github.com/webry-com/vsc-links#readme"
            }
          ]
        };
      },
    },
  ],
};
  `
    case ".cjs":
      return `
/** @type {import("vscl").Config} */
exports.default = {
  links: [
    {
      include: "*",
      pattern: /vscode-link/g,
      handle: ({ /* Ctrl + Space */ }) => {
        // Your magic 🧙‍♂️
        return {
          target: "https://github.com/webry-com/vsc-links#readme",
          tooltip: "Go to VSCode ReadMe.",
          description: "## VSCode Links\\nClick to go to the README.",
          buttons: [
            {
              title: "To the README, wooo",
              target: "https://github.com/webry-com/vsc-links#readme"
            }
          ]
        };
      },
    },
  ],
};
  `
    case ".mjs":
      return `
/** @type {import("vscl").Config} */
export default {
  links: [
    {
      include: "*",
      pattern: /vscode-link/g,
      handle: ({ /* Ctrl + Space */ }) => {
        // Your magic 🧙‍♂️
        return {
          target: "https://github.com/webry-com/vsc-links#readme",
          tooltip: "Go to VSCode ReadMe.",
          description: "## VSCode Links\\nClick to go to the README.",
          buttons: [
            {
              title: "To the README, wooo",
              target: "https://github.com/webry-com/vsc-links#readme"
            }
          ]
        };
      },
    },
  ],
};
  `
  }
}
