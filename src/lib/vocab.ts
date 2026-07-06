export type VocabWord = {
  id: string;
  testId: string;
  word: string;
  meaning: string;
  uz: string;
  ru: string;
};

export const VOCAB_WORDS: VocabWord[] = [
  {
    id: "reading-test-1:microcosm",
    testId: "reading-test-1",
    word: "microcosm",
    meaning: "a small example that represents something much bigger",
    uz: "kichik namuna (mikrokosm)",
    ru: "уменьшенная копия чего-то большего",
  },
  {
    id: "reading-test-1:plummeted",
    testId: "reading-test-1",
    word: "plummeted",
    meaning: "fell suddenly and steeply",
    uz: "keskin pasaydi",
    ru: "резко упал",
  },
  {
    id: "reading-test-1:forestall",
    testId: "reading-test-1",
    word: "forestall",
    meaning: "to prevent something by acting first",
    uz: "oldini olmoq",
    ru: "предотвратить заранее",
  },
  {
    id: "reading-test-1:catastrophic",
    testId: "reading-test-1",
    word: "catastrophic",
    meaning: "extremely harmful or damaging; disastrous",
    uz: "falokatli, halokatli",
    ru: "катастрофический",
  },
  {
    id: "reading-test-1:preside",
    testId: "reading-test-1",
    word: "preside",
    meaning: "to be in charge of and control an event or situation",
    uz: "boshqarmoq, rahbarlik qilmoq",
    ru: "руководить, председательствовать",
  },
  {
    id: "reading-test-1:sustainable",
    testId: "reading-test-1",
    word: "sustainable",
    meaning: "able to continue for a long time without causing damage",
    uz: "barqaror, davomli",
    ru: "устойчивый",
  },
  {
    id: "reading-test-1:erosion",
    testId: "reading-test-1",
    word: "erosion",
    meaning: "the gradual wearing away of soil or rock",
    uz: "eroziya, yemirilish",
    ru: "эрозия, размывание",
  },
  {
    id: "reading-test-1:diversification",
    testId: "reading-test-1",
    word: "diversification",
    meaning: "the act of adding variety or different types of things",
    uz: "xilma-xillashtirish",
    ru: "диверсификация",
  },
  {
    id: "reading-test-1:endorsement",
    testId: "reading-test-1",
    word: "endorsement",
    meaning: "public support or approval",
    uz: "qo'llab-quvvatlash",
    ru: "одобрение, поддержка",
  },
  {
    id: "reading-test-1:unprecedented",
    testId: "reading-test-1",
    word: "unprecedented",
    meaning: "never having happened before",
    uz: "misli ko'rilmagan",
    ru: "беспрецедентный",
  },
  {
    id: "reading-test-1:anomaly",
    testId: "reading-test-1",
    word: "anomaly",
    meaning: "something unusual that does not match the normal pattern",
    uz: "anomaliya (me'yordan chetlanish)",
    ru: "аномалия",
  },
  {
    id: "reading-test-1:swathe",
    testId: "reading-test-1",
    word: "swathe",
    meaning: "a large area or strip of something",
    uz: "katta hudud, keng qism",
    ru: "обширная полоса",
  },
  {
    id: "reading-test-1:overload",
    testId: "reading-test-1",
    word: "overload",
    meaning: "to put too much strain or burden on something",
    uz: "ortiqcha yuklamoq",
    ru: "перегружать",
  },
  {
    id: "reading-test-1:repercussions",
    testId: "reading-test-1",
    word: "repercussions",
    meaning: "the effects or consequences of an action, often bad",
    uz: "oqibatlar",
    ru: "последствия",
  },
  {
    id: "reading-test-1:prominent",
    testId: "reading-test-1",
    word: "prominent",
    meaning: "important and well known; noticeable",
    uz: "taniqli, ko'zga tashlanadigan",
    ru: "выдающийся, заметный",
  },
  {
    id: "reading-test-1:commissioned",
    testId: "reading-test-1",
    word: "commissioned",
    meaning: "officially asked or paid to do a piece of work",
    uz: "buyurtma qilingan",
    ru: "заказанный, порученный",
  },
  {
    id: "reading-test-1:attributed",
    testId: "reading-test-1",
    word: "attributed",
    meaning: "said to be caused by something",
    uz: "sabab deb hisoblangan",
    ru: "приписываемый чему-либо",
  },
  {
    id: "reading-test-1:prohibitive",
    testId: "reading-test-1",
    word: "prohibitive",
    meaning: "(of a cost) so high that it prevents people from doing something",
    uz: "haddan tashqari qimmat",
    ru: "непомерный, недоступный",
  },
  {
    id: "reading-test-1:sceptical",
    testId: "reading-test-1",
    word: "sceptical",
    meaning: "having doubts; not easily convinced",
    uz: "shubha bilan qaraydigan",
    ru: "скептический",
  },
  {
    id: "reading-test-1:legislation",
    testId: "reading-test-1",
    word: "legislation",
    meaning: "laws made by a government",
    uz: "qonunchilik",
    ru: "законодательство",
  },
  {
    id: "reading-test-1:cognitive",
    testId: "reading-test-1",
    word: "cognitive",
    meaning: "relating to thinking, understanding, and mental processes",
    uz: "kognitiv (fikrlash bilan bog'liq)",
    ru: "когнитивный",
  },
  {
    id: "reading-test-1:innovation",
    testId: "reading-test-1",
    word: "innovation",
    meaning: "a new idea, method, or invention",
    uz: "innovatsiya, yangilik",
    ru: "инновация, новшество",
  },
];

export function getWordsForTest(testId: string): VocabWord[] {
  return VOCAB_WORDS.filter((w) => w.testId === testId);
}

export function getWordById(id: string): VocabWord | undefined {
  return VOCAB_WORDS.find((w) => w.id === id);
}

export function getAllVocabTestIds(): string[] {
  return Array.from(new Set(VOCAB_WORDS.map((w) => w.testId)));
}
