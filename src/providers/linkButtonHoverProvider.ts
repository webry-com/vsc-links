import * as vscode from "vscode"
import { LinkDefinitionProvider } from "../providers/linkProvider"
import { v4 } from "uuid"
import { vscLog } from "../utils/output"

const linkProviders: Map<
  LinkButtonHoverProvider,
  {
    disposable: vscode.Disposable
  }
> = new Map()
const buttonHandlers = new Map<string, () => void>()
export function getButtonActionHandler(token: string) {
  return buttonHandlers.get(token)
}

export function createLinkButtonHoverProvider() {
  const lbhp = new LinkButtonHoverProvider()
  const lbhpDisposable = vscode.languages.registerHoverProvider({ pattern: `**/*` }, lbhp)

  linkProviders.set(lbhp, {
    disposable: lbhpDisposable,
  })
  return lbhp
}

export class LinkButtonHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const linkProvider = new LinkDefinitionProvider()
    const links = linkProvider.provideDocumentLinks(document)
    const link = links?.find((link) => link.buttons && link.range.contains(position))
    if (link == null) {
      return null
    }

    const markdown = new vscode.MarkdownString()
    markdown.supportHtml = true

    const markdowns: string[] = []
    link.buttons?.forEach((button) => {
      const title = button.title.replace(/([[\]()\\])/g, "\\$1")

      if ("target" in button && button.target.match(/:\d+(?::\d+)?$/)) {
        // Handle file:line or file:line:column format manually since VSCode markdown doesn't support it
        markdown.isTrusted = true

        const token = v4()
        buttonHandlers.set(token, () => {
          const match = button.target.match(/:(\d+)(?::(\d+))?$/)

          let filePath: string
          let lineNumber: number = 1
          let columnNumber: number = 0

          if (match) {
            filePath = button.target.replace(/:(\d+)(?::(\d+))?$/, '') // Remove :line:column from end
            lineNumber = parseInt(match[1], 10)
            columnNumber = match[2] ? parseInt(match[2], 10) : 0
          } else {
            filePath = button.target
          }

          vscLog("Info", `Opening file: ${filePath}`)
          const uri = vscode.Uri.parse(filePath, true)
          vscode.workspace.openTextDocument(uri).then(doc => {
            vscLog("Info", `Successfully opened: ${doc.uri.toString()}`)

            vscode.window.showTextDocument(doc).then(editor => {
              const position = new vscode.Position(lineNumber - 1, Math.max(0, columnNumber - 1))
              editor.selection = new vscode.Selection(position, position)
              editor.revealRange(new vscode.Range(position, position))
            })
          })
        })

        const commandUri = vscode.Uri.parse(
          `command:vscode-links.linkButton?${encodeURIComponent(
            JSON.stringify({
              actionToken: token,
            }),
          )}`,
        )
        markdowns.push(`[${title}](${commandUri})`)
      } else if ("target" in button) {
        markdowns.push(`[${title}](${button.target})`)
      } else {
        markdown.isTrusted = true

        const token = v4()
        buttonHandlers.set(token, button.action)

        const commandUri = vscode.Uri.parse(
          `command:vscode-links.linkButton?${encodeURIComponent(
            JSON.stringify({
              actionToken: token,
            }),
          )}`,
        )
        markdowns.push(`[${title}](${commandUri})`)
      }
    })

    markdown.appendMarkdown(markdowns.join("  •  "))
    return new vscode.Hover(markdown, link.range)
  }
}

export function disposeLinkButtonHoverProvider(lbhp: LinkButtonHoverProvider) {
  const res = linkProviders.get(lbhp)
  if (!res) {
    return
  }
  res.disposable.dispose()
}

export function disposeAllLinkButtonHoverProviders() {
  linkProviders.forEach((res) => {
    res.disposable.dispose()
  })
}
