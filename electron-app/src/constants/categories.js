export const CATEGORIES = [
  '종합게임',
  '일상',
  '음악',
  'League of Legends',
  'VALORANT',
  'Overwatch 2',
  'Battlegrounds',
  'Lost Ark',
  'MapleStory',
  'EA SPORTS FC Online',
  'Sudden Attack',
  'StarCraft',
  'Minecraft',
  'World of Warcraft',
  'Palworld',
  'Teamfight Tactics',
  'Genshin Impact',
  'Honkai: Star Rail',
  'HELLDIVERS 2',
  'ELDEN RING',
  'Grand Theft Auto V',
  'Red Dead Redemption 2',
  'The Witcher 3: Wild Hunt',
  'Cyberpunk 2077',
  'Monster Hunter: World',
  'Stardew Valley',
  'Terraria',
  'The Binding of Isaac: Rebirth',
  'Hades',
  'Dead by Daylight',
  'Among Us',
  'Fall Guys',
  'Apex Legends',
  'Fortnite',
  'Escape from Tarkov',
  'Dark and Darker',
  "Baldur's Gate 3",
];

// 이미지 관련 로직은 단순화 또는 추후 재설계 예정
export const getCategoryImage = (category) => {
  // 일단 모든 카테고리에 대해 기본 게임 아이콘을 반환하도록 수정
  // 나중에 카테고리별 이미지를 다시 연결할 수 있음
  if (['일상', '음악'].includes(category)) {
    // '일상', '음악'은 기존 이미지 사용 가능성이 있으므로 소문자로 변환하여 경로 생성
    return `/images/categories/${category.toLowerCase()}.png`;
  }
  if (CATEGORIES.includes(category)) {
     return '/images/categories/game.png';
  }
  return '/images/categories/default.png';
};