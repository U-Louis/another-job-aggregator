import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildReviewPrompt,
  formatJobCard,
  loadReviewRules,
  parseReviewRules,
  parseVerdict,
  verdictJsonSchema,
} from "./rules.ts"
import { offer } from "../test/job-offer-fixture.ts"

const internship = {
  id: "internship",
  reason: "Internship, apprenticeship, or stage.",
  comment: "Archived — internship.",
}

const rulesFile = {
  model: "grok-4.7" as const,
  reasoning_effort: "medium" as const,
  rules: [internship],
}

test("parseReviewRules accepts grok-4.7 at medium effort", () => {
  const rules = parseReviewRules(rulesFile)
  assert.equal(rules.model, "grok-4.7")
  assert.equal(rules.reasoning_effort, "medium")
  assert.equal(rules.rules[0]?.comment, "Archived — internship.")
})

test("parseReviewRules rejects a fast model and any other effort", () => {
  assert.throws(
    () => parseReviewRules({ ...rulesFile, model: "grok-4.7-fast" }),
    /Invalid config/,
  )
  assert.throws(
    () => parseReviewRules({ ...rulesFile, reasoning_effort: "low" }),
    /Invalid config/,
  )
})

test("parseReviewRules rejects duplicate ids and empty reasons", () => {
  assert.throws(
    () =>
      parseReviewRules({
        ...rulesFile,
        rules: [internship, { ...internship }],
      }),
    /Duplicate rule id internship/,
  )
  assert.throws(
    () =>
      parseReviewRules({
        ...rulesFile,
        rules: [{ id: "x", reason: "", comment: "no" }],
      }),
    /Invalid config/,
  )
})

test("loadReviewRules reads the committed rules file", () => {
  const rules = loadReviewRules()
  assert.equal(rules.model, "grok-4.7")
  assert.equal(rules.reasoning_effort, "medium")
  assert.ok(rules.rules.length >= 1)
  for (const rule of rules.rules) {
    assert.ok(rule.id.length > 0)
    assert.ok(rule.reason.length > 0)
    assert.ok(rule.comment.length > 0)
  }
})

test("buildReviewPrompt lists each reason and verdict schema enums the ids", () => {
  const prompt = buildReviewPrompt([internship])
  assert.match(prompt, /id: internship/)
  assert.match(prompt, /Internship, apprenticeship, or stage/)
  assert.deepEqual(verdictJsonSchema(["internship"]), {
    type: "object",
    additionalProperties: false,
    required: ["ruleId"],
    properties: {
      ruleId: {
        anyOf: [{ type: "string", enum: ["internship"] }, { type: "null" }],
      },
    },
  })
})

test("formatJobCard includes the offer fields the model screens", () => {
  const card = formatJobCard(
    offer({ title: "Engineer", company: "Acme", description: "Build things" }),
  )
  assert.match(card, /Title: Engineer/)
  assert.match(card, /Company: Acme/)
  assert.match(card, /Description:\nBuild things/)
})

test("parseVerdict reads a rule id or null", () => {
  assert.equal(parseVerdict({ ruleId: "internship" }), "internship")
  assert.equal(parseVerdict({ ruleId: null }), null)
  assert.throws(() => parseVerdict({ ruleId: 1 }), /ruleId/)
})
