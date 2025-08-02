import { string, function as func, void as vod, promise, object, any, array, union } from "zod"

export const linkButtonSchema = object({
  title: string(),
  action: func()
    .args()
    .returns(vod().or(promise(vod()))),
}).or(
  object({
    title: string(),
    target: string(),
  }),
)
export const handlerResponseSchema = object({
  target: string(),
  tooltip: string().optional(),
  jumpPattern: any()
    .refine((val) => val instanceof RegExp || typeof val === "string")
    .optional(),
  description: string().optional(),
  buttons: array(linkButtonSchema).optional(),
})
export const configSchema = object({
  links: array(
    object({
      include: union([string(), array(string())])
        .optional()
        .default("**/*"),
      exclude: union([string(), array(string())])
        .optional()
        .default([]),
      pattern: any().refine(
        (val): val is RegExp | RegExp[] =>
          val instanceof RegExp || (Array.isArray(val) && val.length > 0 && val.every((v) => v instanceof RegExp)),
      ),
      handle: func()
        .args(
          object({
            linkText: string(),
            workspace: any(),
            file: any(),
            reload: any(),
            log: any(),
          }),
        )
        .returns(handlerResponseSchema),
    }),
  ),
})
