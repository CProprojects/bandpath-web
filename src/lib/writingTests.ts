export type BarChartData = {
  kind: "bar";
  unit: string;
  categories: string[];
  series: { label: string; color: string; values: number[] }[];
};

export type LineChartData = {
  kind: "line";
  unit: string;
  xLabels: string[];
  series: { label: string; color: string; values: number[] }[];
};

export type PieChartData = {
  kind: "pie";
  groups: { label: string; segments: { label: string; value: number; color: string }[] }[];
};

export type WritingChartData = BarChartData | LineChartData | PieChartData;

export type WritingTestMeta = {
  id: string;
  title: string;
  task1Prompt: string;
  task1Chart: WritingChartData;
  task1MinWords: number;
  task2Prompt: string;
  task2MinWords: number;
  durationMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  requiresPro: boolean;
};

const ACCENT = "#00C4FF";
const SUCCESS = "#2ed573";
const WARNING = "#ffa502";

export const WRITING_TESTS: WritingTestMeta[] = [
  {
    id: "writing-test-1",
    title: "Writing Test 1",
    difficulty: "Easy",
    requiresPro: false,
    durationMinutes: 60,
    task1MinWords: 150,
    task2MinWords: 250,
    task1Prompt:
      "The chart below shows the percentage of households that owned selected appliances in the UK, Japan, and Brazil in 2010. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task1Chart: {
      kind: "bar",
      unit: "%",
      categories: ["Refrigerator", "Washing Machine", "Dishwasher", "Microwave"],
      series: [
        { label: "UK", color: ACCENT, values: [98, 96, 45, 90] },
        { label: "Japan", color: SUCCESS, values: [99, 99, 32, 97] },
        { label: "Brazil", color: WARNING, values: [93, 71, 8, 54] },
      ],
    },
    task2Prompt:
      "Some people believe that unpaid community service should be a compulsory part of every high school programme. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
  },
  {
    id: "writing-test-2",
    title: "Writing Test 2",
    difficulty: "Medium",
    requiresPro: false,
    durationMinutes: 60,
    task1MinWords: 150,
    task2MinWords: 250,
    task1Prompt:
      "The line graph below shows the number of international tourist arrivals (in millions) in Spain, Thailand, and Mexico between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task1Chart: {
      kind: "line",
      unit: "millions",
      xLabels: ["2000", "2005", "2010", "2015", "2020"],
      series: [
        { label: "Spain", color: ACCENT, values: [47, 55, 53, 68, 19] },
        { label: "Thailand", color: SUCCESS, values: [10, 12, 16, 30, 7] },
        { label: "Mexico", color: WARNING, values: [21, 22, 24, 32, 24] },
      ],
    },
    task2Prompt:
      "In many countries, the amount of crime is increasing. What do you think are the main causes of crime, and what solutions can you suggest to reduce it? Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
  },
  {
    id: "writing-test-3",
    title: "Writing Test 3",
    difficulty: "Medium",
    requiresPro: true,
    durationMinutes: 60,
    task1MinWords: 150,
    task2MinWords: 250,
    task1Prompt:
      "The pie charts below show the main reasons why students chose to attend a particular university, in the years 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    task1Chart: {
      kind: "pie",
      groups: [
        {
          label: "2000",
          segments: [
            { label: "Reputation", value: 40, color: ACCENT },
            { label: "Cost", value: 15, color: SUCCESS },
            { label: "Location", value: 25, color: WARNING },
            { label: "Course content", value: 20, color: "#a78bfa" },
          ],
        },
        {
          label: "2020",
          segments: [
            { label: "Reputation", value: 25, color: ACCENT },
            { label: "Cost", value: 30, color: SUCCESS },
            { label: "Location", value: 15, color: WARNING },
            { label: "Course content", value: 30, color: "#a78bfa" },
          ],
        },
      ],
    },
    task2Prompt:
      "Some people think that governments should spend money on public transportation rather than roads. Others believe building more roads is the better solution to reduce traffic congestion. Discuss both views and give your own opinion.",
  },
];

export function getWritingTestById(id: string) {
  return WRITING_TESTS.find((t) => t.id === id);
}

export function isWritingTestId(id: string) {
  return WRITING_TESTS.some((t) => t.id === id);
}

// Renders the chart's underlying data as plain text so the grading model can
// judge whether the student's Task 1 description is factually accurate.
export function describeWritingChart(chart: WritingChartData): string {
  if (chart.kind === "bar") {
    const rows = chart.categories.map((cat, i) => {
      const values = chart.series.map((s) => `${s.label}: ${s.values[i]}${chart.unit}`).join(", ");
      return `- ${cat} — ${values}`;
    });
    return `Bar chart (values in ${chart.unit}):\n${rows.join("\n")}`;
  }

  if (chart.kind === "line") {
    const rows = chart.series.map((s) => `- ${s.label}: ${chart.xLabels.map((label, i) => `${label}=${s.values[i]}`).join(", ")}`);
    return `Line graph (values in ${chart.unit}):\n${rows.join("\n")}`;
  }

  const groups = chart.groups.map((group) => {
    const segs = group.segments.map((s) => `${s.label} ${s.value}%`).join(", ");
    return `- ${group.label}: ${segs}`;
  });
  return `Pie chart(s):\n${groups.join("\n")}`;
}
