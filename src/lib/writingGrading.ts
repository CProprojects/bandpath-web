import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describeWritingChart, type WritingTestMeta } from "@/lib/writingTests";

const CriterionSchema = z.object({
  band: z.number().describe("Band score for this criterion, 0-9, in 0.5 increments"),
  feedback: z
    .string()
    .describe("1-3 sentences of specific, actionable feedback for this criterion, quoting the student's own text where useful"),
});

const TaskGradeSchema = z.object({
  task_achievement: CriterionSchema.describe(
    "Task Achievement (Task 1) / Task Response (Task 2) — how fully and accurately the response addresses the prompt",
  ),
  coherence_cohesion: CriterionSchema,
  lexical_resource: CriterionSchema,
  grammatical_range: CriterionSchema,
  band: z.number().describe("Overall band for this task — the average of the four criteria, rounded to the nearest 0.5"),
});

const GradingResultSchema = z.object({
  task1: TaskGradeSchema,
  task2: TaskGradeSchema,
});

export type GradingResult = z.infer<typeof GradingResultSchema>;

const SYSTEM_PROMPT = `You are an official IELTS Academic Writing examiner. Grade both Task 1 and Task 2 responses strictly against the four official IELTS Writing band descriptors, each scored 0-9 in 0.5 increments:

- Task Achievement / Task Response: For Task 1, whether the response accurately and fully covers the key features and data shown, with appropriate comparisons — not just listing every number. For Task 2, whether the response fully addresses all parts of the essay prompt with a clear position and relevant, developed ideas.
- Coherence and Cohesion: logical organization, clear progression, effective paragraphing, and appropriate use of linking words/cohesive devices (not overused or mechanical).
- Lexical Resource: range and precision of vocabulary, appropriate word choice, awareness of style/collocation, and control of spelling.
- Grammatical Range and Accuracy: range of sentence structures used, and accuracy (frequency of grammar/punctuation errors).

Grade realistically and strictly, the way a real IELTS examiner would — do not inflate scores. A response that is off-topic, far under the minimum word count, or memorized/generic should score low on Task Achievement/Response regardless of surface fluency. For each criterion, write specific feedback that quotes or references the student's own words where possible. The overall band for each task is the average of its four criteria, rounded to the nearest 0.5.`;

export async function gradeWritingSubmission({
  test,
  task1Response,
  task2Response,
}: {
  test: WritingTestMeta;
  task1Response: string;
  task2Response: string;
}): Promise<GradingResult> {
  const client = new Anthropic();

  const userMessage = `## Task 1

**Prompt:** ${test.task1Prompt}

**Chart data the student was describing:**
${describeWritingChart(test.task1Chart)}

**Minimum word count:** ${test.task1MinWords}

**Student's response** (word count: ${task1Response.trim() ? task1Response.trim().split(/\s+/).length : 0}):
"""
${task1Response || "(no response submitted)"}
"""

## Task 2

**Prompt:** ${test.task2Prompt}

**Minimum word count:** ${test.task2MinWords}

**Student's response** (word count: ${task2Response.trim() ? task2Response.trim().split(/\s+/).length : 0}):
"""
${task2Response || "(no response submitted)"}
"""

Grade both tasks now.`;

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      format: zodOutputFormat(GradingResultSchema),
      effort: "high",
    },
    messages: [{ role: "user", content: userMessage }],
  });

  if (!response.parsed_output) {
    throw new Error(`Grading failed to parse: stop_reason=${response.stop_reason}`);
  }

  return response.parsed_output;
}

function clampBand(band: number): number {
  const clamped = Math.min(9, Math.max(0, band));
  return Math.round(clamped * 2) / 2;
}

export function computeOverallBand(result: GradingResult): {
  task1Band: number;
  task2Band: number;
  overallBand: number;
} {
  const task1Band = clampBand(result.task1.band);
  const task2Band = clampBand(result.task2.band);
  // Real IELTS weighting: Task 2 counts twice as much as Task 1.
  const overallBand = clampBand((task1Band + 2 * task2Band) / 3);
  return { task1Band, task2Band, overallBand };
}
