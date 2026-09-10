import type { ConnectMbtiType } from './mbti';

/**
 * 결과 이미지를 캔버스로 그린다.
 *
 * 서버에서 만들지 않는 이유 — 한글 폰트 파일을 따로 실어야 하고,
 * 이모지는 외부 CDN에서 받아와야 한다. 배포 환경에 의존이 늘어난다.
 * 브라우저는 한글도 이모지도 이미 그릴 수 있다.
 *
 * 기기마다 글꼴이 조금씩 다르게 나오지만, 공유용 이미지라 그 차이는
 * 감수할 만하다. 대신 줄바꿈과 여백을 직접 계산해 잘리지 않게 한다.
 */
const W = 1080;
const H = 1350; // 인스타그램 세로 비율

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  // 한국어는 단어 사이 공백이 드물어 글자 단위로 끊는다.
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export async function drawMbtiCard(
  type: ConnectMbtiType,
  origin: string,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 배경 — 유형 색을 아주 옅게 깔고 아래로 흰색에 가깝게.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, type.tint);
  bg.addColorStop(1, '#fbfcfe');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // 머리말
  ctx.fillStyle = type.accent;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('당신의 Connect-MBTI는', W / 2, 150);

  // 이모지 원
  ctx.beginPath();
  ctx.arc(W / 2, 380, 150, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.font = `160px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(type.emoji, W / 2, 390);
  ctx.textBaseline = 'alphabetic';

  // 별명 — 길면 두 줄로 접는다.
  ctx.fillStyle = '#0f172b';
  ctx.font = `800 62px ${FONT}`;
  const titleLines = wrap(ctx, type.title, W - 160);
  let y = 640;
  for (const l of titleLines) {
    ctx.fillText(l, W / 2, y);
    y += 78;
  }

  // 코드
  ctx.fillStyle = type.accent;
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText(type.code, W / 2, y + 40);
  y += 130;

  // 설명
  ctx.fillStyle = '#45556c';
  ctx.font = `400 36px ${FONT}`;
  for (const l of wrap(ctx, type.description, W - 200)) {
    ctx.fillText(l, W / 2, y);
    y += 54;
  }

  // 해시태그
  y += 40;
  ctx.font = `600 32px ${FONT}`;
  const tagLine = type.tags.join('  ');
  ctx.fillStyle = type.accent;
  for (const l of wrap(ctx, tagLine, W - 160)) {
    ctx.fillText(l, W / 2, y);
    y += 48;
  }

  // 꼬리말 — 어디서 본 것인지 남는다. 공유 이미지의 목적이다.
  ctx.fillStyle = '#90a1b9';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText(origin.replace(/^https?:\/\//, ''), W / 2, H - 80);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
