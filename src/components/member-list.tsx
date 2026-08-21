import { IconUser } from './ui/icon';

/**
 * B-02 참여자 목록.
 *
 * 로그인한 사람에게만 보인다. 이름은 성만 남기고 가린다(김OO).
 * 프로필을 눌러야 본인이 입력한 선택 항목이 보이는 3층 구조의 가운데다.
 *
 * 빈 자리를 함께 그린다 — 개설 초반에는 자리가 대부분 비어 있고,
 * 그것이 이 서비스에서 감출 사실이 아니라 초대다.
 */
export function MemberList({
  members,
  capacity,
}: {
  members: { id: string; label: string }[];
  capacity: number;
}) {
  const empty = Math.max(0, capacity - members.length);

  return (
    <div className="members">
      {members.map((m) => (
        <div key={m.id} className="member">
          <div className="avatar">
            <IconUser size={22} />
          </div>
          <p className="member-name">{m.label}</p>
        </div>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <div key={`e${i}`} className="member member--empty">
          <div className="avatar">
            <IconUser size={22} />
          </div>
          <p className="member-name">빈 자리</p>
        </div>
      ))}
    </div>
  );
}
