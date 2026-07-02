export type PmLevel = "基础" | "进阶" | "高阶";

export type PmVocabInfo = {
  ipa: string;
  cn: string;
  example: string;
};

export type PmTurn = {
  name: string;
  hint: string;
  customer: string;
  model: string;
};

export type PmScene = {
  id: string;
  title: string;
  stage: string;
  level: PmLevel;
  roles: string;
  objective: string;
  turns: PmTurn[];
};

export const PM_TASK_TYPE = "pm_roleplay";
export const PM_WORD_SOURCE = "pm_voice_roleplay";

export const pmVocabulary = {
  dedicated: {
    ipa: "/ˈdedɪkeɪtɪd/",
    cn: "专属的；尽责的",
    example: "I'm your dedicated project manager.",
  },
  doorstep: {
    ipa: "/ˈdɔːrstep/",
    cn: "门口；送达地点",
    example: "delivery at your doorstep",
  },
  seamlessly: {
    ipa: "/ˈsiːmləsli/",
    cn: "无缝地；顺畅地",
    example: "ensuring every step is seamlessly connected",
  },
  showroom: {
    ipa: "/ˈʃoʊruːm/",
    cn: "展厅；陈列室",
    example: "I just saw your showroom online.",
  },
  construction: {
    ipa: "/kənˈstrʌkʃən/",
    cn: "施工；建设",
    example: "The villa is still under construction.",
  },
  stakeholders: {
    ipa: "/ˈsteɪkˌhoʊldərz/",
    cn: "利益相关者",
    example: "How many stakeholders will be involved?",
  },
  proposal: {
    ipa: "/prəˈpoʊzəl/",
    cn: "方案；提案",
    example: "bring you an accurate proposal",
  },
  quotation: {
    ipa: "/kwoʊˈteɪʃən/",
    cn: "报价；报价单",
    example: "Please check the quotation.",
  },
  fluctuate: {
    ipa: "/ˈflʌktʃuˌeɪt/",
    cn: "波动",
    example: "freight and duties can fluctuate",
  },
  balance: {
    ipa: "/ˈbæləns/",
    cn: "尾款；余额",
    example: "final balance",
  },
  specifications: {
    ipa: "/ˌspesɪfɪˈkeɪʃənz/",
    cn: "规格；技术参数",
    example: "confirmed specifications",
  },
  inspection: {
    ipa: "/ɪnˈspekʃən/",
    cn: "质检；检查",
    example: "quality inspection report",
  },
  "apples-to-apples": {
    ipa: "/ˈæpəlz tuː ˈæpəlz/",
    cn: "同等条件对比",
    example: "an apples-to-apples comparison",
  },
  "impact resistance": {
    ipa: "/ˈɪmpækt rɪˈzɪstəns/",
    cn: "抗冲击性",
    example: "impact resistance",
  },
  warranty: {
    ipa: "/ˈwɔːrənti/",
    cn: "保修；质保",
    example: "warranty terms",
  },
} satisfies Record<string, PmVocabInfo>;

export const pmVocabTerms = Object.keys(pmVocabulary).sort((a, b) => b.length - a.length);

export const pmScenes = [
  {
    id: "1.1",
    title: "Scene 1.1 — First Contact",
    stage: "D1 询盘破冰",
    level: "基础",
    roles: "PM ↔ Customer",
    objective: "训练目标：确立 PM 项目经理定位 + 展示一站式能力，不急着报价。",
    turns: [
      {
        name: "Customer has no clear need",
        hint: "承接模糊需求",
        customer: "Hi Sarah, I just saw your showroom online, not sure exactly what I need yet.",
        model:
          "Hello, this is Sarah from George Group One-Stop Building Materials. I'm your dedicated project manager. I'll take full charge from concept design all the way to delivery at your doorstep, ensuring every step is seamlessly connected. No problem at all — may I know what kind of project you're working on?",
      },
      {
        name: "Project stage",
        hint: "把施工阶段转成设计机会",
        customer: "It's a new villa, still under construction.",
        model:
          "That's great timing. Since you're still building, this is actually the best stage to lock in a design style before anything is finalized. I'll be with you from here through delivery.",
      },
    ],
  },
  {
    id: "2.1",
    title: "Scene 2.1 — Identify Decision Maker",
    stage: "D1-D2 客户画像",
    level: "基础",
    roles: "PM ↔ Builder",
    objective: "训练目标：确认客户身份和决策链，方便资料转发给最终决策人。",
    turns: [
      {
        name: "Identity check",
        hint: "确认客户身份",
        customer: "I'm a builder, working for a client who owns the property.",
        model: "Got it, thank you. Is this project residential or commercial, and how many stakeholders will be involved in the final decision?",
      },
      {
        name: "Homeowner approval",
        hint: "协助 Builder 汇报",
        customer: "Residential, but the homeowner has final sign-off on everything.",
        model: "Understood. I'll make sure all materials I send are easy for you to present to the homeowner directly.",
      },
    ],
  },
  {
    id: "3.1",
    title: "Scene 3.1 — Six-Dimension Discovery",
    stage: "D2 需求挖掘",
    level: "进阶",
    roles: "PM ↔ Homeowner",
    objective: "训练目标：围绕空间、品类、预算、时间、风格、决策六维问清需求。",
    turns: [
      {
        name: "Start discovery",
        hint: "报价前补齐关键维度",
        customer: "We need materials for a 300 square meter house in Dubai.",
        model:
          "Perfect. To make sure I bring you an accurate proposal, could you confirm which areas or categories you want to cover? Is this a full-house project or specific rooms only?",
      },
      {
        name: "Budget and timeline",
        hint: "自然引出预算和交付时间",
        customer: "Full house — kitchen, bathrooms, flooring, and lighting.",
        model:
          "Understood. Do you have an overall budget range in mind, or a budget per category? Also, when would you like the products to arrive on site?",
      },
      {
        name: "Style and decision",
        hint: "确认风格和决策人",
        customer: "Around 80,000 USD total. Ideally within 5 months. My wife will also need to approve it.",
        model:
          "That's very helpful. Could you share two or three reference images or describe the style you both love? I'll make sure the proposal is easy for both decision-makers to review.",
      },
    ],
  },
  {
    id: "4.1",
    title: "Scene 4.1 — Shipping Cost Inquiry",
    stage: "D2-D3 FAQ 应对",
    level: "进阶",
    roles: "PM ↔ Builder",
    objective: "训练目标：解释 FOB/CIF/DDP 与运费波动，不提前锁死运费。",
    turns: [
      {
        name: "Shipping options",
        hint: "给选项，不锁死",
        customer: "How much will shipping cost to Houston?",
        model:
          "We can do FOB, CIF, or DDP depending on what works best for you. Shipping prices can vary by season. If you'd like, I can look up the current reference rate for your address.",
      },
      {
        name: "Do not lock freight",
        hint: "解释最终确认节点",
        customer: "Can we just include shipping in the contract now so it's locked in?",
        model:
          "I understand wanting certainty, but freight and duties can fluctuate right up until the container is confirmed. What I can do is give you the most accurate reference rate now, and we'll finalize the exact number once the packing list is confirmed.",
      },
    ],
  },
  {
    id: "5.3",
    title: "Scene 5.3 — Price Objection",
    stage: "D3 议价逼单",
    level: "高阶",
    roles: "PM ↔ Wholesaler",
    objective: "训练目标：把价格异议拉回产品参数与同等条件对比。",
    turns: [
      {
        name: "Price is too high",
        hint: "先确认是否同等对比",
        customer: "Your price is too high compared to other suppliers I've contacted.",
        model:
          "I understand. Lower prices are always there for a reason. Could I ask you to confirm whether the comparison is truly apples-to-apples? Specifically, the material grade, impact resistance, sound insulation rating, and warranty terms.",
      },
      {
        name: "Educate comparison",
        hint: "解释低价背后可能是配置差异",
        customer: "I hadn't thought about all of that.",
        model:
          "That's exactly why I want to walk through it with you. A lower number on paper can hide a very different product, so let's compare the specifications clearly before making a decision.",
      },
    ],
  },
] satisfies PmScene[];
