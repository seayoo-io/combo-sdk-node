import { genSessionID } from "../src"
import { describe, expect, test } from "vitest"

describe("CreateInstance", () => {
  test("genSessionID", () => {
    const sessionID = genSessionID("")
    expect(sessionID).toBeTypeOf("string")
    expect(sessionID.length).toBe(32)
  })

  test("genSessionID Repeat", () => {
    const ids: string[] = []
    const N = 10000
    for (let i = 0; i < N; i++) {
      ids.push(genSessionID(""))
    }
    const uids = Array.from(new Set(ids))
    expect(uids.length).toBe(N)
  })
})
