import { MapPin } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function TravelPage() {
  return (
    <ComingSoonPage
      title="旅行美食"
      description="这里先留一个温柔的位置。以后会记录打卡过的全球美食店、城市、地址、名字，也会慢慢长出一张旅行地图。"
      icon={MapPin}
      tone="mint"
      bullets={["城市 + 地址 + 店名", "全球美食打卡", "旅行地图"]}
    />
  );
}
