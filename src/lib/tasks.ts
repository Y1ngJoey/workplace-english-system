export const taskLabels: Record<string, string> = {
  email: "写邮件",
  interpreting: "口译听记复述",
  drafting: "起草汇报",
  roleplay: "角色扮演",
  vocab: "术语+产品口头介绍",
  review: "复盘+整理语料",
};

export function getDefaultTaskType(date = new Date()) {
  const day = date.getDay();
  if (day === 1) return "email";
  if (day === 2) return "interpreting";
  if (day === 3) return "drafting";
  if (day === 4) return "roleplay";
  if (day === 5) return "vocab";
  return "review";
}
