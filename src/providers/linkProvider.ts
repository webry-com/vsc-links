import fs from "fs"
import { minimatch } from "minimatch"
import path from "path"
import * as vscode from "vscode"
import type { z } from "zod"
import { vscLog } from "../utils/output"
import { handlerResponseSchema, linkButtonSchema } from "../utils/schemas"
import { getConfig } from "../utils/watchers"

const linkProviders: Map<
  LinkDefinitionProvider,
  {
    disposable: vscode.Disposable
  }
> = new Map()

type VSCLButton = z.infer<typeof linkButtonSchema>
type VSCLDocumentLink = vscode.DocumentLink &
  (
    | {
      range: vscode.Range
      tooltip?: string
      description?: string
      buttons?: VSCLButton[]
      _originalVsclTarget?: string
      _vsclTarget?: vscode.Uri
      _jumpPattern?: RegExp | string
    }
    | {
      target: vscode.Uri
      range: vscode.Range
      tooltip?: string
      description?: string
      buttons?: VSCLButton[]
    }
  )

const FILE_PREFIX =
  (
    {
      win32: "file:///",
    } as Record<string, string>
  )[process.platform] || "file://"

export function createLinkProvider() {
  const lp = new LinkDefinitionProvider()
  const lpDisposable = vscode.languages.registerDocumentLinkProvider({ pattern: `**/*` }, lp)

  linkProviders.set(lp, {
    disposable: lpDisposable,
  })
  return lp
}

export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  constructor() { }

  provideDocumentLinks(document: vscode.TextDocument): VSCLDocumentLink[] | null {
    const workspace = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!workspace) {
      return null
    }

    const config = getConfig(workspace)
    if (config == null) {
      vscLog("Error", `No valid config loaded in workspace "${workspace.name}"`)
      return null
    }

    const currentFileRelative = path.relative(workspace.uri.fsPath, document.uri.fsPath)
    const configLinks = config.links.filter((link) => {
      const includes = Array.isArray(link.include) ? link.include : [link.include]
      const excludes = Array.isArray(link.exclude) ? link.exclude : [link.exclude]
      const isIncluded = includes.some((pattern) => minimatch(currentFileRelative, pattern, { dot: true }))
      const isExcluded = excludes.some((pattern) => minimatch(currentFileRelative, pattern, { dot: true }))
      return isIncluded && !isExcluded
    })

    const content = document.getText()
    vscLog("Info", `provideDocumentLinks for ${document.fileName} (${document.lineCount} lines).`)
    const links: VSCLDocumentLink[] = []
    for (const link of configLinks) {
      link.pattern = Array.isArray(link.pattern) ? link.pattern : [link.pattern]
      for (const pattern of link.pattern) {
        const regEx = new RegExp(pattern, pattern.flags)
        let match: RegExpExecArray | null
        while ((match = regEx.exec(content))) {
          //vscLog("Warn", config.links.length + " D LINKS (MATCH)")
          const range = {
            start: match.index,
            end: match.index + match[0].length,
          }

          if (match.groups && "link" in match.groups) {
            const linkText = match.groups.link
            range.start = match.index + match[0].indexOf(linkText)
            range.end = match.index + match[0].indexOf(linkText) + linkText.length
          }

          const linkText = content.substring(range.start, range.end)
          const result = link.handle({
            linkText,
            workspace(strings: TemplateStringsArray, ...values: string[]): string {
              let builtString = ""
              strings.forEach((string, i) => {
                builtString += string + (values[i] || "")
              })
              const filePath = `${workspace.uri.fsPath}/${builtString}`.replace(/[\\/]+/g, "/")
              return `${FILE_PREFIX}${filePath}`
            },
            file(strings: TemplateStringsArray, ...values: string[]): string {
              let builtString = ""
              strings.forEach((string, i) => {
                builtString += string + (values[i] || "")
              })
              const filePath = builtString.replace(/[\\/]+/g, "/")
              return `${FILE_PREFIX}${filePath}`
            },
            reload(): void {
              vscode.commands.executeCommand("vsc-links.refreshVSCodeLinksProviders")
            },
            log(...logs: any[]) {
              vscLog("Info", logs.map((log) => log.toString()).join("  "))
            },
          })

          if ("then" in result) {
            vscLog("Error", "The link handler can not be async")
            continue
          }

          const handlerResultValidationResult = handlerResponseSchema.safeParse(result)
          if (!handlerResultValidationResult.success) {
            vscLog(
              "Warn",
              `Skipping link "${linkText}" in file "${document.fileName}" due to invalid handler response: ${handlerResultValidationResult.error}`,
            )
            continue
          }

          if (result.jumpPattern) {
            links.push({
              range: new vscode.Range(document.positionAt(range.start), document.positionAt(range.end)),
              tooltip: result.tooltip || "",
              description: result.description,
              buttons: result.buttons,
              _originalVsclTarget: result.target,
              _vsclTarget: vscode.Uri.parse(result.target.replace(/:(\d+)(?::(\d+))?$/, '')),
              _jumpPattern: result.jumpPattern,
            })
          } else {
            // Check if the target has :line:column format
            const lineColumnMatch = result.target.match(/:(\d+)(?::(\d+))?$/)
            if (lineColumnMatch) {
              links.push({
                range: new vscode.Range(document.positionAt(range.start), document.positionAt(range.end)),
                tooltip: result.tooltip || "",
                description: result.description,
                buttons: result.buttons,
                _originalVsclTarget: result.target,
                _vsclTarget: vscode.Uri.parse(result.target.replace(/:(\d+)(?::(\d+))?$/, '')),
                _jumpPattern: undefined,
              })
            } else {
              links.push({
                target: vscode.Uri.parse(result.target),
                range: new vscode.Range(document.positionAt(range.start), document.positionAt(range.end)),
                tooltip: result.tooltip || "",
                description: result.description,
                buttons: result.buttons,
              })
            }
          }
        }
      }
    }

    vscLog(
      "Info",
      `Result of provideDocumentLinks for ${document.fileName} (${document.lineCount} lines): ${links.length} Links!`,
    )
    return links
  }

  resolveDocumentLink(
    link: vscode.DocumentLink & { _vsclTarget: vscode.Uri; _jumpPattern?: RegExp | string; _originalVsclTarget: string },
  ): vscode.ProviderResult<vscode.DocumentLink> {
    if (link.target) {
      return link
    }

    // Parse :line:column format from the original target
    const lineColumnMatch = link._originalVsclTarget.match(/:(\d+)(?::(\d+))?$/)
    if (lineColumnMatch) {
      const line = parseInt(lineColumnMatch[1], 10)
      // Remove the :line:column part from the target to get the actual file path
      const cleanTarget = link._originalVsclTarget.replace(/:(\d+)(?::(\d+))?$/, '')
      link.target = vscode.Uri.parse(`${cleanTarget}#L${line}`)
      return {
        range: link.range,
        target: link.target,
        tooltip: link.tooltip,
      }
    }

    if (link._vsclTarget.scheme === "file") {
      const targetDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.path === link._vsclTarget.path)
      if (targetDocument) {
        if (link._jumpPattern instanceof RegExp) {
          const index = targetDocument.getText().search(link._jumpPattern)
          if (index >= 0) {
            const position = targetDocument.positionAt(index)
            link.target = vscode.Uri.parse(
              `${link._originalVsclTarget}#L${position.line + 1}:${position.character + 1}`,
            )
          }
        } else if (link._jumpPattern && typeof link._jumpPattern === "string") {
          const index = targetDocument.getText().indexOf(link._jumpPattern)
          if (index >= 0) {
            const position = targetDocument.positionAt(index)
            link.target = vscode.Uri.parse(
              `${link._originalVsclTarget}#L${position.line + 1}:${position.character + 1}`,
            )
          }
        }
      } else {
        try {
          const targetDocumentContent = fs.readFileSync(link._vsclTarget.fsPath, "utf8")
          if (link._jumpPattern instanceof RegExp) {
            const index = targetDocumentContent.search(link._jumpPattern)
            if (index >= 0) {
              const { line, column } = getLineAndColumn(targetDocumentContent, index)
              link.target = vscode.Uri.parse(`${link._originalVsclTarget}#L${line}:${column}`)
            }
          } else if (link._jumpPattern && typeof link._jumpPattern === "string") {
            const index = targetDocumentContent.indexOf(link._jumpPattern)
            if (index >= 0) {
              const { line, column } = getLineAndColumn(targetDocumentContent, index)
              link.target = vscode.Uri.parse(`${link._originalVsclTarget}#L${line}:${column}`)
            }
          }
        } catch (error) {
          vscLog("Error", error)
        }
      }
    }

    if (!link.target) {
      vscLog("Error", `Could not find jumpPattern in document: ${link._vsclTarget.path}`)
      link.target = link._vsclTarget
    }

    return {
      range: link.range,
      target: link.target,
      tooltip: link.tooltip,
    }
  }
}

function getLineAndColumn(
  text: string,
  index: number,
): {
  line: number
  column: number
} {
  if (index < 0 || index > text.length) {
    return { line: 1, column: 1 }
  }

  const lines = text.split("\n")
  let currentLength = 0
  let lineNumber = 1

  for (const line of lines) {
    const lineLength = line.length + 1
    if (currentLength + lineLength > index) {
      return {
        line: lineNumber,
        column: index - currentLength + 1,
      }
    }
    currentLength += lineLength
    lineNumber++
  }

  return {
    line: lineNumber - 1,
    column: lines[lines.length - 1].length + 1,
  }
}

export function disposeLinkProvider(lp: LinkDefinitionProvider) {
  const res = linkProviders.get(lp)
  if (!res) {
    return
  }
  res.disposable.dispose()
}

export function disposeAllLinkProviders() {
  linkProviders.forEach((res) => {
    res.disposable.dispose()
  })
}
