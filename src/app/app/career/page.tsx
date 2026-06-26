import { BriefcaseBusiness } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function CareerPage() {
  return (
    <ComingSoonPage
      title="职业历程"
      description="这里会放我的职业故事线：关键阶段、重要项目、学到的判断，以及那些让我变得更稳的节点。"
      icon={BriefcaseBusiness}
      tone="blue"
      bullets={["职业故事线", "关键项目", "成长节点"]}
    />
  );
}
