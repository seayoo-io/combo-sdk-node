import type { IncomingMessage, ServerResponse } from "node:http"
export async function readBody(req: IncomingMessage, backup?: string): Promise<string> {
  const body: Buffer[] = []
  if (!req.readable) {
    backup ||
      console.error({
        type: "RequestUnReadable",
        url: req.url,
        methe: req.method,
        message: "Cannot read body, stream not readable",
      })
    return backup || ""
  }
  return new Promise((resolve, reject) => {
    req.on("error", reject)
    req.on("data", (chunk) => body.push(chunk))
    req.on("end", () => {
      resolve(Buffer.concat(body).toString("utf-8"))
    })
  })
}

export async function done(res: ServerResponse, statusCode: number, message?: string) {
  res.statusCode = statusCode
  if (statusCode !== 204) {
    res.write(message || "")
  }
  res.end()
}
