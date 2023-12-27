import * as fs from "node:fs"
import * as http from "node:http"
import { basename, extname } from "node:path"
import { readBody } from "./utils"
import type { IncomingMessage, ServerResponse } from "node:http"

interface ServerRoute {
  path: string
  method: string
  handler: RouteHandler
}

interface RequestMessage {
  req: IncomingMessage
  body: string
  query: Record<string, string>
  method: string
  path: string
}

interface ResponseMessage {
  res: ServerResponse
  text(status: number, responseText: string): void
  json(status: number, responseJson: object | Array<unknown>): void
  html(status: number, file: string, injectData?: Record<string, string | number>): void
  setHeader(name: string, value: string): void
}

type RouteHandler = (request: RequestMessage, response: ResponseMessage) => Promise<void>
type ServerMiddleware = (request: RequestMessage, response: ResponseMessage) => Promise<void>

export class Server {
  private running: boolean
  private routes: ServerRoute[]
  private middlewares: ServerMiddleware[]
  private files: Record<string, string>
  private assetsDir: string

  constructor() {
    this.running = false
    this.routes = []
    this.middlewares = []
    this.files = {}
    this.assetsDir = "/assets"
  }

  use(middleware: ServerMiddleware) {
    this.middlewares.push(middleware)
    return this
  }

  get(path: string, handler: RouteHandler) {
    this.routes.push({ path, method: "GET", handler })
    return this
  }

  post(path: string, handler: RouteHandler) {
    this.routes.push({ path, method: "POST", handler })
    return this
  }

  loadHtml(file: string) {
    const filePath = new URL(file.endsWith(".html") ? file : `${file}.html`, import.meta.url)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} not found`)
    }
    this.files[basename(filePath.toString())] = fs.readFileSync(filePath, "utf-8")
    return this
  }

  assetsIn(folder: string) {
    this.assetsDir = "/" + folder.replace(/^\/*|\/*&/g, "")
    return this
  }

  listen(port: number) {
    if (this.running) {
      return
    }
    const files = this.files
    const baseURL = import.meta.url
    const middlewares = this.middlewares
    const routes = this.routes
    const server = http.createServer(async (req, res) => {
      const { method } = req
      // make request
      const bodyString = await readBody(req)
      const url = new URL(req.url + "", `http://${req.headers.host}`)
      const query: Record<string, string> = {}
      url.searchParams.forEach((value, key) => (query[key] = value))
      const request: RequestMessage = { req, method: method || "GET", path: url.pathname, body: bodyString, query }
      // make response
      const response: ResponseMessage = new CustomServerResponse(res, files)
      // find assets
      if (this.assetsDir && url.pathname.startsWith(this.assetsDir)) {
        const assetsFile = new URL(url.pathname.replace(/^\//, ""), baseURL)
        const ext = extname(assetsFile.pathname).toLowerCase().slice(1)
        if (fs.existsSync(assetsFile)) {
          res.setHeader("Content-Type", mineTypeMap[ext] || "")
          fs.createReadStream(assetsFile).pipe(res)
          return
        }
      }
      // exec middlewares
      for (const middleware of middlewares) {
        await middleware(request, response)
      }
      // exec route
      for (const route of routes) {
        if (route.method === method && route.path === url.pathname) {
          await route.handler(request, response)
        }
      }
      // 兜底检查是否已经做了响应
      if (!res.writableEnded) {
        res.statusCode = 404
        res.end("Not Found")
      }
    })
    this.running = true
    server.listen(port)
    return server
  }
}

class CustomServerResponse implements ResponseMessage {
  private files: Record<string, string>
  res: ServerResponse
  constructor(res: ServerResponse, files: Record<string, string>) {
    this.res = res
    this.files = files
  }
  text(status: number, text: string) {
    this.res.statusCode = status
    this.res.end(text)
  }
  json(status: number, responseJson: object | unknown[]): void {
    this.res.statusCode = status
    this.res.setHeader("Content-Type", "application/json")
    this.res.end(JSON.stringify(responseJson))
  }
  html(status: number, file: string, injectData?: Record<string, string | number>): void {
    this.res.statusCode = status
    this.res.setHeader("Content-Type", "text/html")
    const key = basename(file.endsWith(".html") ? file : `${file}.html`)
    const htmlContent = this.files[key] || "Not Found HTML"
    this.res.end(injectData ? injectHtml(htmlContent, injectData) : htmlContent)
  }
  setHeader(name: string, value: string): void {
    this.res.setHeader(name, value)
  }
}

function injectHtml(html: string, data: Record<string, string | number>) {
  return html.replace(/\$\{\s*(.*?)\s*\}/g, function (raw: string, field: string) {
    return field in data ? `${data[field]}` : ""
  })
}

const mineTypeMap: Record<string, string> = {
  html: "text/html;charset=utf-8",
  htm: "text/html;charset=utf-8",
  xml: "text/xml;charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  css: "text/css;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  ico: "image/x-icon",
  tif: "image/tiff",
  svg: "image/svg+xml",
  json: "application/json",
}
