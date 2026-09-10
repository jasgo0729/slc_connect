/**
 * Connect-MBTI (F-02·F-03).
 *
 * 12문항 4축 16유형. 개인 MBTI(users.mbti_type)와는 다른 값이며
 * mbti_results.type_code 에 저장된다.
 *
 * 코드는 축 순서대로 붙인다 — 장소·목적·성격·일정.
 *   IGMP = 실내(I) · 성장(G) · 생산(M) · 계획(P)
 */

export const AXES = [
  {
    key: 'activity',
    label: '활동 장소',
    a: { code: 'O', label: '야외' },
    b: { code: 'I', label: '실내' },
  },
  {
    key: 'purpose',
    label: '모임 목적',
    a: { code: 'G', label: '자기계발과 배움' },
    b: { code: 'C', label: '힐링과 친목' },
  },
  {
    key: 'action',
    label: '활동의 성격',
    a: { code: 'M', label: '생산형' },
    b: { code: 'E', label: '소비형' },
  },
  {
    key: 'scheduling',
    label: '모임 일정',
    a: { code: 'P', label: '정기적·계획적' },
    b: { code: 'S', label: '즉흥적' },
  },
] as const;

export type AxisKey = (typeof AXES)[number]['key'];

export interface Question {
  id: number;
  axis: AxisKey;
  prompt: string;
  /** 두 선택지. code 가 그대로 유형 코드의 한 글자가 된다. */
  choices: { code: string; text: string }[];
}

/**
 * 문항 순서를 축별로 묶지 않고 섞는다.
 *
 * 같은 축 세 문항이 연달아 나오면 무엇을 재는지 드러나 답이 한쪽으로
 * 쏠린다. 12문항짜리 가벼운 테스트라 그 쏠림이 결과를 바로 바꾼다.
 */
export const QUESTIONS: Question[] = [
  {
    id: 1,
    axis: 'activity',
    prompt: '주말에 모처럼 아무 일정도 없는 날, 나의 진짜 속마음은?',
    choices: [
      { code: 'I', text: '‘역시 집 밖은 위험해!’ 푹신한 이불 속이나 조용한 동네 카페가 최고지.' },
      { code: 'O', text: '‘날씨가 이렇게 좋은데 아깝지!’ 무조건 밖에 나가서 콧바람 쐬어야지.' },
    ],
  },
  {
    id: 2,
    axis: 'purpose',
    prompt: '이번 소그룹 활동이 끝났을 때, 내가 가장 뿌듯할 것 같은 순간은?',
    choices: [
      { code: 'G', text: '“이번 활동으로 확실히 뭔가 얻어 가네!” 새로운 걸 배우고 한 뼘 더 성장했을 때' },
      { code: 'C', text: '“진짜 웃다가 배 찢어지는 줄ㅋㅋ” 스트레스 쫙 풀리고 좋은 인연들을 얻었을 때' },
    ],
  },
  {
    id: 3,
    axis: 'action',
    prompt: '소그룹에서 다 함께 원데이 클래스를 하러 간다면?',
    choices: [
      { code: 'M', text: '‘내 손으로 직접!’ 베이킹, 비즈 공예 등 결과물을 뚝딱 만들어내는 것' },
      { code: 'E', text: '‘눈과 귀가 즐겁게!’ 감각적인 전시회, 팝업스토어, 핫플 탐방하는 것' },
    ],
  },
  {
    id: 4,
    axis: 'scheduling',
    prompt: '약속을 잡을 때, 내가 선호하는 방식은?',
    choices: [
      { code: 'P', text: '‘다음 주 금요일 저녁 6시 어때?’ 미리 약속 시간을 정해둔다' },
      { code: 'S', text: '‘이번 수업 끝나고 저녁 먹으러 갈 사람?’ 삘 받을 때 시간 맞는 사람끼리 모인다' },
    ],
  },
  {
    id: 5,
    axis: 'activity',
    prompt: 'Connect 단원들과 처음 만나는 소그룹 모임, 내가 더 끌리는 장소는?',
    choices: [
      { code: 'I', text: '우리끼리 오순도순 대화하기 좋은 감성 카페나 프라이빗 파티룸' },
      { code: 'O', text: '탁 트인 야외 한강공원 피크닉이나 활기찬 야장' },
    ],
  },
  {
    id: 6,
    axis: 'purpose',
    prompt: '새로운 사람들과 처음 만나는 자리, 나는 어떤 대화 주제가 더 흥미로울까?',
    choices: [
      { code: 'G', text: '각자의 진로, 요즘 관심 있는 트렌드나 책 등 깊이 있는 대화' },
      { code: 'C', text: '밸런스 게임, MBTI 등 가벼운 대화' },
    ],
  },
  {
    id: 7,
    axis: 'action',
    prompt: '인상 깊은 경험을 한 뒤 나의 반응은?',
    choices: [
      { code: 'M', text: '블로그나 일기장에 글을 쓰고, 스토리를 예쁘게 꾸며 기록으로 남긴다.' },
      { code: 'E', text: '그 순간의 짜릿한 감정과 여운을 온전히 느낀다.' },
    ],
  },
  {
    id: 8,
    axis: 'scheduling',
    prompt: '오늘 가려고 한 식당이 휴무일일 때 나의 반응은?',
    choices: [
      { code: 'P', text: '“어떡하지? 일단 플랜 B 식당으로 가자!”' },
      { code: 'S', text: '“그럴 수 있지~ 돌아다니다 마음에 드는 곳 아무데나 가자!”' },
    ],
  },
  {
    id: 9,
    axis: 'activity',
    prompt: '과제와 시험, 바쁜 일정으로 스트레스가 극에 달했을 때 나의 해소법은?',
    choices: [
      { code: 'I', text: '방을 어둡게 하고 넷플릭스를 정주행하거나 조용히 혼자만의 시간을 보낸다.' },
      { code: 'O', text: '밖으로 나가 러닝을 하거나, 예쁜 풍경을 보러 돌아다니며 머리를 식힌다.' },
    ],
  },
  {
    id: 10,
    axis: 'purpose',
    prompt: '모임이 끝나고 집으로 돌아가는 길, 내 기분이 좋은 이유는?',
    choices: [
      { code: 'G', text: '“오늘 진짜 유익한 시간이었다. 갓생 산 기분!”' },
      { code: 'C', text: '“아 너무 재미있었다. 완전 힐링한 기분!”' },
    ],
  },
  {
    id: 11,
    axis: 'action',
    prompt: '새로운 취미를 시작할 때, 더 끌리는 쪽은?',
    choices: [
      { code: 'M', text: '영상 편집, 그림 그리기, 다이어리 꾸미기 등 눈에 보이는 결과물이 쌓이는 것' },
      { code: 'E', text: '다양한 장르의 음악이나 영화 감상, 맛집 투어처럼 여러 경험이 쌓이는 것' },
    ],
  },
  {
    id: 12,
    axis: 'scheduling',
    prompt: '주말 아침 눈을 떴을 때, 나의 하루 시작은?',
    choices: [
      { code: 'P', text: '어제 자기 전 생각해 둔 오늘의 계획을 떠올린다.' },
      { code: 'S', text: '그날의 기분과 컨디션에 따라 유동적으로 움직인다.' },
    ],
  },
];

export interface ConnectMbtiType {
  code: string;
  emoji: string;
  animal: string;
  /** 별명. 이모지 없이 쓴다. */
  title: string;
  /** 어떤 사람인지. */
  description: string;
  /** 그래서 무엇을 해보면 좋을지. */
  suggestion: string;
  tags: string[];
  match: {
    code: string;
    emoji: string;
    animal: string;
    label: string;
    text: string;
  };
  /** 유형마다 다른 색. 원형 배경과 CTA에 쓴다. */
  tint: string;
  accent: string;
}

/** 코드 순서: 장소(O/I) · 목적(G/C) · 성격(M/E) · 일정(P/S) */
export const CONNECT_MBTI: Record<string, ConnectMbtiType> = {
  IGMP: {
    code: 'IGMP', emoji: '🦫', animal: '비버', title: '각 잡고 갓생 사는 비버',
    description: '방구석에서 완벽한 계획을 세우고 확실한 결과물을 뚝딱뚝딱 만들어내는 스타일이에요.',
    suggestion: '나만의 공간에서 다이어리를 싹 정리하거나 새로운 목표를 세우면서, 갓생 버튼을 다시 한번 꾹 눌러보는 건 어떨까요?',
    tags: ['#방구석갓생러', '#계획이_곧_결과물', '#효율끝판왕'],
    match: { code: 'OCES', emoji: '🐬', animal: '돌고래', label: '아웃풋 제조 듀오',
      text: '기획은 비버가 방구석에서, 실행은 돌고래가 밖에서! 안팎으로 손발이 척척 맞는 전설의 아웃풋 제조기들.' },
    tint: '#fdf1d3', accent: '#b8860b',
  },
  IGMS: {
    code: 'IGMS', emoji: '🦉', animal: '올빼미', title: '밤새서 뚝딱 만드는 올빼미',
    description: '새벽에 갑자기 영감이 떠오르면 밤을 새워서라도 기어코 무언가를 완성해 내고 마는 스타일이에요.',
    suggestion: '모두가 잠든 새벽에 나만의 플레이리스트를 틀어두고 삘 꽂힌 작업물을 시원하게 완성해 보는 건 어떨까요?',
    tags: ['#야행성작업러', '#삘받으면_밤샘', '#즉흥적'],
    match: { code: 'OCEP', emoji: '🐰', animal: '토끼', label: '노빠꾸 직진 듀오',
      text: '올빼미가 새벽 감성으로 던진 아이디어를, 토끼가 실패 없는 코스로 멱살 잡고 캐리하는 환상의 직진 조합.' },
    tint: '#e5e6fb', accent: '#5a4fd6',
  },
  IGEP: {
    code: 'IGEP', emoji: '🦢', animal: '백조', title: '우아하게 교양 쌓는 백조',
    description: '아늑한 실내에서 잘 짜여진 스케줄에 맞춰 깊이 있게 교양을 쌓고 지식을 향유하는 스타일이에요.',
    suggestion: '따뜻한 커피 한 잔과 함께 평소 미뤄뒀던 책을 펼치거나 교양 다큐를 보면서, 지식 배터리를 든든하게 채워보는 건 어떨까요?',
    tags: ['#스케줄러_필수', '#지식수집가', '#우아한_방구석'],
    match: { code: 'OCMS', emoji: '🐧', animal: '펭귄', label: '엘리트 살롱 듀오',
      text: '실내외를 가리지 않고 서로 얻은 고퀄리티 지식과 영감을 끊임없이 티키타카로 교환하는 우아한 지식인들.' },
    tint: '#eceef3', accent: '#5b6478',
  },
  IGES: {
    code: 'IGES', emoji: '🐿️', animal: '다람쥐', title: '방구석 호기심 대장 다람쥐',
    description: '궁금한 게 생기면 시간 가는 줄 모르고 즉흥적으로 꼬리에 꼬리를 무는 탐구를 즐기는 스타일이에요.',
    suggestion: '푹신한 침대에 누워 알고리즘이 이끄는 흥미로운 영상들을 정주행하며, 꼬리에 꼬리를 무는 재미를 느껴보는 건 어떨까요?',
    tags: ['#유튜브_파도타기', '#알쓸신잡', '#호기심천국'],
    match: { code: 'OCMP', emoji: '🐶', animal: '강아지', label: '무한 호기심 탐험 듀오',
      text: '다람쥐가 방구석에서 꽂힌 호기심을, 강아지가 기어코 밖으로 끌고 나가 우당탕탕 몸으로 검증하고 마는 탐험대.' },
    tint: '#f6e9dc', accent: '#96603a',
  },
  ICMP: {
    code: 'ICMP', emoji: '🐹', animal: '햄스터', title: '꼼지락 힐링 금손 햄스터',
    description: '안전한 방구석에서 정해진 시간에 소소하고 예쁜 것들을 꼼지락꼼지락 만들어내는 스타일이에요.',
    suggestion: '좋아하는 음악을 틀어두고 다이어리를 꾸미거나 작은 소품을 조립하면서, 나만의 소소하고 확실한 행복을 챙겨보는 건 어떨까요?',
    tags: ['#사부작사부작', '#방구석금손', '#계획된_소확행'],
    match: { code: 'OGES', emoji: '🦦', animal: '수달', label: '무적의 금손 듀오',
      text: '사부작거리는 햄스터와 발길 닿는 대로 영감을 모으는 수달이 만나, 결과물 만드는 실력이 장난 아닌 금손 조합.' },
    tint: '#fdf0cf', accent: '#c78d0a',
  },
  ICMS: {
    code: 'ICMS', emoji: '🦝', animal: '너구리', title: '낭만 가득 야행성 너구리',
    description: '기분이 꿀꿀하거나 심심할 때 즉흥적으로 야식 번개를 치며 힐링템을 만들어내는 스타일이에요.',
    suggestion: '출출한 밤에 친구를 불러 소소하게 야식을 만들어 먹으며, 오늘 하루의 피로를 맛있게 털어내 보는 건 어떨까요?',
    tags: ['#야식번개_대환영', '#즉흥힐링', '#오늘_우리집올래'],
    match: { code: 'OGEP', emoji: '🦊', animal: '여우', label: '즉흥 힐링 듀오',
      text: '여우가 똑똑하게 찾아낸 세상 재밌는 코스에, 너구리의 그날그날 꽂히는 기분이 더해져 완성되는 환상의 즉흥 힐링 메이트.' },
    tint: '#f2e6fa', accent: '#8b4bc4',
  },
  ICEP: {
    code: 'ICEP', emoji: '🐼', animal: '판다', title: '각 잡고 힐링하는 판다',
    description: '나만의 완벽한 휴식 루틴을 세워두고 실내에서 세상 편안하게 에너지를 충전하는 스타일이에요.',
    suggestion: '가장 편안한 옷을 입고 밀린 넷플릭스 시리즈를 각 잡고 정주행하며, 그 누구의 방해도 없는 완벽한 오프 모드를 즐겨보는 건 어떨까요?',
    tags: ['#프로방콕러', '#루틴대로_쉽니다', '#충전100퍼센트'],
    match: { code: 'OGMS', emoji: '🐆', animal: '표범', label: '텐션 조절 깔끔 듀오',
      text: '표범의 미친 텐션으로 밖에서 신나게 놀다가, 방전되면 미련 없이 판다처럼 각자 침대로 쿨하게 흩어지는 깔끔한 조합.' },
    tint: '#d9f5ec', accent: '#12876b',
  },
  ICES: {
    code: 'ICES', emoji: '🦥', animal: '나무늘보', title: '소파 위 평화주의자 나무늘보',
    description: '계획 없이 푹신한 곳에 누워 흘러가는 대로 유유자적 시간을 보내며 에너지를 얻는 스타일이에요.',
    suggestion: '복잡한 생각은 다 던져두고 푹신한 소파에 누워 좋아하는 플레이리스트를 무한반복하며 뇌를 완벽하게 쉬게 해주는 건 어떨까요?',
    tags: ['#공강시간_하이에나', '#무계획이_계획', '#눕방장인'],
    match: { code: 'OGMP', emoji: '🐝', animal: '꿀벌', label: '타격감 제로 듀오',
      text: '꿀벌이 이끄는 대로 발길 닿는 대로 놀다가, 나무늘보 기 빨리면 눈치 볼 것 없이 칼같이 해산하는 편안한 사이.' },
    tint: '#e2f5dc', accent: '#3f8f34',
  },
  OGMP: {
    code: 'OGMP', emoji: '🐝', animal: '꿀벌', title: '행동으로 보여주는 꿀벌',
    description: '탁상공론 대신 밖으로 나가 철저한 계획 아래 세상에 유의미한 결과물을 만들어내는 스타일이에요.',
    suggestion: '맑은 공기를 마시며 러닝 크루를 뛰거나 뿌듯한 봉사활동에 참여하며, 나의 에너지를 세상 밖으로 맘껏 발산해 보는 건 어떨까요?',
    tags: ['#프로실천러', '#갓생프로젝트', '#세상은_나의무대'],
    match: { code: 'ICES', emoji: '🦥', animal: '나무늘보', label: '타격감 제로 듀오',
      text: '꿀벌이 이끄는 대로 발길 닿는 대로 놀다가, 나무늘보 기 빨리면 눈치 볼 것 없이 칼같이 해산하는 편안한 사이.' },
    tint: '#fdf0cf', accent: '#c78d0a',
  },
  OGMS: {
    code: 'OGMS', emoji: '🐆', animal: '표범', title: '에너지 폭발 직진러 표범',
    description: "'이거다!' 싶으면 잴 것 없이 당장 밖으로 튀어나가 미친 추진력으로 일을 저지르고 보는 스타일이에요.",
    suggestion: '친구들에게 당장 번개를 쳐서 운동을 하며 끓어오르는 텐션을 시원하게 태워보는 건 어떨까요?',
    tags: ['#일단가보자고', '#미친추진력', '#게릴라행동파'],
    match: { code: 'ICEP', emoji: '🐼', animal: '판다', label: '텐션 조절 깔끔 듀오',
      text: '표범의 미친 텐션으로 밖에서 신나게 놀다가, 방전되면 미련 없이 판다처럼 각자 침대로 쿨하게 흩어지는 깔끔한 조합.' },
    tint: '#fde3e6', accent: '#d02f4b',
  },
  OGEP: {
    code: 'OGEP', emoji: '🦊', animal: '여우', title: '스마트한 핫플 지식인 여우',
    description: '동선 낭비 없는 완벽한 코스로 바깥세상의 지식과 트렌드를 누구보다 똑똑하게 수집하는 스타일이에요.',
    suggestion: '찜해둔 전시회나 강연을 동선 낭비 없이 싹 돌면서, 새로운 영감을 알차게 업데이트해 보는 건 어떨까요?',
    tags: ['#인사이트투어', '#동선낭비_용납못해', '#핫플내비게이터'],
    match: { code: 'ICMS', emoji: '🦝', animal: '너구리', label: '즉흥 힐링 듀오',
      text: '여우가 똑똑하게 찾아낸 세상 재밌는 코스에, 너구리의 그날그날 꽂히는 기분이 더해져 완성되는 환상의 즉흥 힐링 메이트.' },
    tint: '#fbe8d5', accent: '#d2691e',
  },
  OGES: {
    code: 'OGES', emoji: '🦦', animal: '수달', title: '발길 닿는 대로 걷는 수달',
    description: '목적지 없이 발길 닿는 대로 돌아다니며 우연히 마주치는 낯선 풍경과 사람들에게서 영감을 얻는 스타일이에요.',
    suggestion: '지도 어플은 잠시 끄고 낯선 동네 골목이나 재래시장을 뽈뽈거리며 걷다가, 숨겨진 찐 맛집을 발견해 보는 건 어떨까요?',
    tags: ['#무계획탐험가', '#발길닿는대로', '#길거리인류학자'],
    match: { code: 'ICMP', emoji: '🐹', animal: '햄스터', label: '무적의 금손 듀오',
      text: '사부작거리는 햄스터와 발길 닿는 대로 영감을 모으는 수달이 만나, 결과물 만드는 실력이 장난 아닌 금손 조합.' },
    tint: '#d8f2f8', accent: '#0f7f96',
  },
  OCMP: {
    code: 'OCMP', emoji: '🐶', animal: '강아지', title: '우당탕탕 열정 부자 강아지',
    description: '정해진 날짜에 다 같이 야외로 나가 왁자지껄 땀 흘리며 기어코 무언가를 같이 해내는 스타일이에요.',
    suggestion: '텐션 맞는 친구들과 다 같이 공방에서 도자기를 빚거나 스포츠 내기를 하며, 시끌벅적하고 유쾌한 추억을 하나 더 적립해 보는 건 어떨까요?',
    tags: ['#텐션폭발', '#취미부자', '#같이의_가치'],
    match: { code: 'IGES', emoji: '🐿️', animal: '다람쥐', label: '무한 호기심 탐험 듀오',
      text: '다람쥐가 방구석에서 꽂힌 호기심을, 강아지가 기어코 밖으로 끌고 나가 우당탕탕 몸으로 검증하고 마는 탐험대.' },
    tint: '#fdf0cf', accent: '#c78d0a',
  },
  OCMS: {
    code: 'OCMS', emoji: '🐧', animal: '펭귄', title: '삘 받으면 뛰쳐나가는 펭귄',
    description: '눈이 오면 눈사람을 만들고 날이 좋으면 당장 밖으로 나가 그날의 기분을 추억으로 빚어내는 스타일이에요.',
    suggestion: '날씨 좋은 날 삘 받으면 보드를 타러 나가거나 폴라로이드 사진을 찍으며, 오늘의 기분을 200% 즐겨보는 건 어떨까요?',
    tags: ['#오늘_뭐해', '#즉흥낭만러', '#추억뚝딱_메이커'],
    match: { code: 'IGEP', emoji: '🦢', animal: '백조', label: '엘리트 살롱 듀오',
      text: '실내외를 가리지 않고 서로 얻은 고퀄리티 지식과 영감을 끊임없이 티키타카로 교환하는 우아한 지식인들.' },
    tint: '#dcedfb', accent: '#1d6fb8',
  },
  OCEP: {
    code: 'OCEP', emoji: '🐰', animal: '토끼', title: '낭만 찾아 떠나는 토끼',
    description: '머릿속에 세워둔 완벽한 코스대로 실패 없이 예쁜 핫플과 맛집을 싹 돌고 와야 직성이 풀리는 스타일이에요.',
    suggestion: '리뷰 꼼꼼히 찾아둔 핫플 카페에 가서 예쁜 인증샷도 건지고, 일주일의 스트레스도 달달하게 날려버리는 건 어떨까요?',
    tags: ['#계획된_핫플투어', '#실패없는_외출', '#프로놀러러'],
    match: { code: 'IGMS', emoji: '🦉', animal: '올빼미', label: '노빠꾸 직진 듀오',
      text: '토끼가 실패 없는 코스로 멱살 잡고 캐리하면, 올빼미가 새벽 감성으로 던진 아이디어까지 더해져 완벽하게 직진하는 환상의 조합.' },
    tint: '#fce3ee', accent: '#d1477a',
  },
  OCES: {
    code: 'OCES', emoji: '🐬', animal: '돌고래', title: '유유자적 자유로운 돌고래',
    description: '계획 1도 없이 무작정 밖으로 나가 물 흐르듯 힐링하며 텐션 높게 그 순간을 즐기는 스타일이에요.',
    suggestion: '날씨 좋은 날 무작정 돗자리 하나 챙겨 한강에 누워서 치킨도 시켜 먹고, 물 흐르듯 유유자적한 하루를 보내보는 건 어떨까요?',
    tags: ['#자유로운영혼', '#노는게_제일좋아', '#물흐르듯_살자'],
    match: { code: 'IGMP', emoji: '🦫', animal: '비버', label: '아웃풋 제조 듀오',
      text: '실행은 돌고래가 밖에서, 기획은 비버가 방구석에서! 안팎으로 손발이 척척 맞는 전설의 아웃풋 제조기들.' },
    tint: '#dfeafc', accent: '#3152ea',
  },
};

export function findConnectMbti(code: string | null | undefined): ConnectMbtiType | null {
  if (!code) return null;
  return CONNECT_MBTI[code.toUpperCase()] ?? null;
}

/**
 * 응답으로 유형 코드를 만든다.
 *
 * 축마다 문항이 셋이라 동점이 나지 않는다. 문항이 줄거나 늘어
 * 짝수가 되면 앞 글자(O·G·M·P)로 정한다 — 무작위로 정하면
 * 같은 답인데 결과가 달라진다.
 */
export function computeType(answers: Record<number, string>): {
  code: string;
  scores: Record<string, number>;
} {
  const scores: Record<string, number> = {};
  for (const q of QUESTIONS) {
    const picked = answers[q.id];
    if (picked) scores[picked] = (scores[picked] ?? 0) + 1;
  }

  const code = AXES.map((axis) => {
    const a = scores[axis.a.code] ?? 0;
    const b = scores[axis.b.code] ?? 0;
    return b > a ? axis.b.code : axis.a.code;
  }).join('');

  return { code, scores };
}
