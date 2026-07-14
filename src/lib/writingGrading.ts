import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { describeWritingChart, type WritingTestMeta } from "@/lib/writingTests";

const CriterionSchema = z.object({
  band: z.number().describe("Band score for this criterion, 0-9, in 0.5 increments"),
  feedback: z
    .string()
    .describe("1-3 sentences of specific, actionable feedback for this criterion, quoting the student's own text where useful"),
});

const TaskGradeSchema = z.object({
  task_achievement: CriterionSchema,
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

function criterionJsonSchema(description: string) {
  return {
    type: "object",
    properties: {
      band: { type: "number", description: "Band score 0-9, in 0.5 increments" },
      feedback: { type: "string", description },
    },
    required: ["band", "feedback"],
  };
}

const taskGradeJsonSchema = {
  type: "object",
  properties: {
    task_achievement: criterionJsonSchema(
      "Task Achievement (Task 1) / Task Response (Task 2) feedback, quoting the student's own text where useful",
    ),
    coherence_cohesion: criterionJsonSchema("Coherence and Cohesion feedback"),
    lexical_resource: criterionJsonSchema("Lexical Resource feedback"),
    grammatical_range: criterionJsonSchema("Grammatical Range and Accuracy feedback"),
    band: { type: "number", description: "Overall band for this task: average of the four criteria, nearest 0.5" },
  },
  required: ["task_achievement", "coherence_cohesion", "lexical_resource", "grammatical_range", "band"],
};

const GRADING_JSON_SCHEMA = {
  type: "object",
  properties: {
    task1: taskGradeJsonSchema,
    task2: taskGradeJsonSchema,
  },
  required: ["task1", "task2"],
};

const SYSTEM_PROMPT = `You are an official IELTS Academic Writing examiner. Grade both Task 1 and Task 2 responses strictly against the four official IELTS Writing band descriptors, each scored 0-9 in 0.5 increments:

- Task Achievement / Task Response: For Task 1, whether the response accurately and fully covers the key features and data shown, with appropriate comparisons — not just listing every number. For Task 2, whether the response fully addresses all parts of the essay prompt with a clear position and relevant, developed ideas.
- Coherence and Cohesion: logical organization, clear progression, effective paragraphing, and appropriate use of linking words/cohesive devices (not overused or mechanical).
- Lexical Resource: range and precision of vocabulary, appropriate word choice, awareness of style/collocation, and control of spelling.
- Grammatical Range and Accuracy: range of sentence structures used, and accuracy (frequency of grammar/punctuation errors).

Grade realistically and strictly, the way a real IELTS examiner would — do not inflate scores. A response that is off-topic, far under the minimum word count, or memorized/generic should score low on Task Achievement/Response regardless of surface fluency. For each criterion, write specific feedback that quotes or references the student's own words where possible. The overall band for each task is the average of its four criteria, rounded to the nearest 0.5.

Respond with JSON only, matching the given schema exactly.`;

export async function gradeWritingSubmission({
  test,
  task1Response,
  task2Response,
}: {
  test: WritingTestMeta;
  task1Response: string;
  task2Response: string;
}): Promise<GradingResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: `${SYSTEM_PROMPT}\n\n${userMessage}`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: GRADING_JSON_SCHEMA,
    },
  });

  if (!interaction.output_text) {
    throw new Error("Grading model returned no output.");
  }

  const parsed = JSON.parse(interaction.output_text);
  return GradingResultSchema.parse(parsed);
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
