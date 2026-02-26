// 所有可选的小说类型（题材）
const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const ALL_NOVEL_GENRES = [
  "玄幻",
  "仙侠",
  "奇幻",
  "武侠",
  "都市",
  "言情",
  "科幻",
  "系统文",
  "后宫",
  "无限流",
  "悬疑",
  "历史",
  "军事",
  "游戏",
  "末世",
  "穿越",
  "重生",
  "网游",
  "竞技",
  "机甲",
  "星际",
  "灵异",
  "恐怖",
  "宫斗",
  "种田",
  "娱乐圈",
  "盗墓",
  "洪荒",
] as const;

export type NovelGenre = (typeof ALL_NOVEL_GENRES)[number];

export type RelationshipType =
  | "盟友"
  | "恋人"
  | "导师"
  | "死敌"
  | "家人"
  | "竞争者"
  | "炮灰"
  | "同门"
  | "队友"
  | "上司"
  | "下属"
  | "其他";

export type CharacterArc = "成长" | "黑化" | "救赎" | "牺牲" | "退场" | "保持不变" | "其他";

export type EndingType = "HE" | "BE" | "开放" | "大团圆" | "虐" | "爽" | "开放式";

export type NarrationType = "第一人称" | "第三人称有限" | "全知视角";

export type ToneType =
  | "热血"
  | "黑暗"
  | "轻松"
  | "细腻"
  | "幽默"
  | "压抑"
  | "爽快"
  | "文艺"
  | "写实";

export type CheatLevel = "无敌流" | "稳步成长" | "真实吃力" | "反转流" | "废柴逆袭";

export type FocusArea =
  | "战斗"
  | "感情"
  | "智斗"
  | "日常"
  | "装逼"
  | "后宫"
  | "权谋"
  | "经营";

export interface MainCharacter {
  name: string;
  gender: "男" | "女" | "其他";
  age: string;
  personality: string;
}

export interface CharacterBase {
  id: string;
  name: string;
  nickname: string;
  gender: "男" | "女" | "其他";
  age: string;
  relationship: RelationshipType | "";
  relationshipCustom: string;
  personalityTags: string[];
  background: string;
  abilities: string;
  role: string;
  arc: CharacterArc | "";
  arcCustom: string;
}

export interface SideCharacter extends CharacterBase {}

export interface Antagonist extends CharacterBase {
  motive: string;
  fate: string;
}

export interface WorldDetails {
  powerSystem: string;
  factions: string;
  historyEvents: string;
  importantLocations: string;
  cultureAndTaboos: string;
}

export interface PlotBeat {
  id: string;
  title: string;
  detail: string;
}

export interface WritingStyle {
  narration: NarrationType;
  tones: ToneType[];
  cheatLevel: CheatLevel;
  focusAreas: FocusArea[];
  wordsPerChapter: number;
  temperature: number;
}

export interface TabooRule {
  id: string;
  content: string;
}

export interface ReferenceWork {
  id: string;
  title: string;
  inspiration: string;
}

export interface NovelSettings {
  // 基础信息
  genres: NovelGenre[];
  oneLinePitch: string;
  // 主角
  mainCharacter: MainCharacter;
  // 角色
  sideCharacters: SideCharacter[];
  antagonists: Antagonist[];
  // 世界观
  worldSummary: string;
  conflictTheme: string;
  worldDetails: WorldDetails;
  // 情节
  opening: string;
  middleBeats: PlotBeat[];
  endingType: EndingType | "";
  subplots: PlotBeat[];
  // 写作风格
  writingStyle: WritingStyle;
  // 规模与开关
  totalWords: number;
  chapterWords: number;
  nsfw: boolean;
  systemNovel: boolean;
  harem: boolean;
  // 约束与参考
  taboos: TabooRule[];
  references: ReferenceWork[];
}

export const createEmptySideCharacter = (): SideCharacter => ({
  id: randomId(),
  name: "",
  nickname: "",
  gender: "男",
  age: "",
  relationship: "",
  relationshipCustom: "",
  personalityTags: [],
  background: "",
  abilities: "",
  role: "",
  arc: "",
  arcCustom: "",
});

export const createEmptyAntagonist = (): Antagonist => ({
  ...createEmptySideCharacter(),
  id: randomId(),
  motive: "",
  fate: "",
});

export const createEmptyPlotBeat = (): PlotBeat => ({
  id: randomId(),
  title: "",
  detail: "",
});

export const createEmptyTaboo = (): TabooRule => ({
  id: randomId(),
  content: "",
});

export const createEmptyReferenceWork = (): ReferenceWork => ({
  id: randomId(),
  title: "",
  inspiration: "",
});

export const createDefaultNovelSettings = (): NovelSettings => ({
  genres: [],
  oneLinePitch: "",
  mainCharacter: {
    name: "",
    gender: "男",
    age: "",
    personality: "",
  },
  sideCharacters: [],
  antagonists: [],
  worldSummary: "",
  conflictTheme: "",
  worldDetails: {
    powerSystem: "",
    factions: "",
    historyEvents: "",
    importantLocations: "",
    cultureAndTaboos: "",
  },
  opening: "",
  middleBeats: [],
  endingType: "",
  subplots: [],
  writingStyle: {
    narration: "第三人称有限",
    tones: [],
    cheatLevel: "稳步成长",
    focusAreas: [],
    wordsPerChapter: 3000,
    temperature: 0.7,
  },
  totalWords: 100000,
  chapterWords: 3000,
  nsfw: false,
  systemNovel: false,
  harem: false,
  taboos: [],
  references: [],
});

