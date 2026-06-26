import { BriefcaseBusiness, Globe2, Music2, Plane } from "lucide-react";

export const homeTextDefaults = {
  home_title: "你好，我是 Joey",
  home_intro:
    "这里是我的个人主场：一边练外贸英语，一边记录爵士成长，也给旅行美食和职业故事留一点慢慢长出来的空间。",
  room_eng_name: "外贸英语",
  room_eng_desc: "每日练习、语料库、每周复盘和语音陪练，都放在这个工作台里。",
  room_jazz_name: "爵士档案",
  room_jazz_desc: "记录每一次舞感变好、动作变干净、灵感被点亮的小证据。",
  room_travel_name: "旅行美食",
  room_travel_desc: "以后这里会有城市、餐厅、地址、照片和一张慢慢展开的旅行地图。",
  room_career_name: "职业历程",
  room_career_desc: "以后这里会放我的职业故事线、关键项目和成长节点。",
} as const;

export type HomeTextSlot = keyof typeof homeTextDefaults;

export const homeRooms = [
  {
    key: "eng",
    href: "/app/today",
    nameSlot: "room_eng_name",
    descSlot: "room_eng_desc",
    icon: Globe2,
    tone: "pink",
  },
  {
    key: "jazz",
    href: "/app/jazz",
    nameSlot: "room_jazz_name",
    descSlot: "room_jazz_desc",
    icon: Music2,
    tone: "grape",
  },
  {
    key: "travel",
    href: "/app/travel",
    nameSlot: "room_travel_name",
    descSlot: "room_travel_desc",
    icon: Plane,
    tone: "mint",
  },
  {
    key: "career",
    href: "/app/career",
    nameSlot: "room_career_name",
    descSlot: "room_career_desc",
    icon: BriefcaseBusiness,
    tone: "blue",
  },
] as const satisfies Array<{
  key: string;
  href: string;
  nameSlot: HomeTextSlot;
  descSlot: HomeTextSlot;
  icon: typeof Globe2;
  tone: "pink" | "grape" | "mint" | "blue";
}>;
