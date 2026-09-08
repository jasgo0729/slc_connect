# 배포

EC2 한 대에 Caddy · Next.js · Postgres를 Docker Compose로 올린다.
사용자 300명 규모라 쪼갤 이유가 없다.

## 처음 한 번

### 1. 서버 준비

```bash
sudo dnf install -y docker git          # Amazon Linux 2023
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"         # 재로그인 필요
sudo dnf install -y docker-compose-plugin
```

보안 그룹에서 **80과 443을 모두** 엽니다. 443만 열면 Let's Encrypt가
도메인 소유를 확인하지 못해 인증서를 못 받습니다.

### 2. 도메인

A 레코드가 EC2 공인 IP를 가리켜야 합니다. DNS가 먼저 붙어야
인증서 발급이 됩니다.

### 3. 코드와 설정

```bash
git clone <저장소> /srv/connect
cd /srv/connect
cp .env.production.example .env.production
vi .env.production          # 도메인, DB 비밀번호, 구글 키
```

### 4. 구글 OAuth

콘솔의 승인된 리디렉션 URI에 운영 주소를 추가합니다.

```
https://<도메인>/api/auth/google/callback
```

로컬 주소만 등록해 두면 배포 후 로그인이 안 됩니다.
반영에 몇 시간 걸릴 수 있으니 미리 넣어 두세요.

### 5. 배포

```bash
./deploy.sh
```

### 6. 명단 적재

```bash
docker compose cp 명단.xlsx app:/tmp/roster.xlsx
docker compose exec app node -e "…"    # 또는 로컬에서 DATABASE_URL 을 서버로 향하게 해 실행
```

명단 적재는 `tsx`가 필요해 실행 이미지에 없습니다.
로컬에서 서버 DB에 직접 붙어 넣는 편이 간단합니다(임시로 5432를 열고 작업 후 닫기).

### 7. 관리자 지정

```bash
docker compose exec db psql -U connect -d connect \
  -c "UPDATE users SET role='admin' WHERE student_no='본인학번';"
```

### 8. 백업 자동화

```bash
crontab -e
```

```
0 4 * * * cd /srv/connect && ./backup.sh >> /var/log/connect-backup.log 2>&1
```

## 이후 배포

```bash
cd /srv/connect && ./deploy.sh
```

배포 전에 자동으로 백업하고, 마이그레이션이 실패하면 앱을 띄우지 않습니다.

## 자주 쓰는 것

```bash
docker compose ps                  # 상태
docker compose logs -f app         # 로그
docker compose restart app         # 앱만 재시작
./backup.sh                        # 수동 백업
./restore.sh backups/파일.sql.gz    # 복원 (되돌릴 수 없음)
```

## 막힐 때

**인증서가 발급되지 않는다**
DNS가 서버를 가리키는지, 80 포트가 열려 있는지 확인하세요.
`docker compose logs caddy` 에 이유가 나옵니다.

Let's Encrypt는 도메인당 주 5회 발급 제한이 있습니다. `caddy_data`
볼륨을 지우고 반복 배포하면 한도에 걸려 일주일간 HTTPS가 막힙니다.
이 볼륨은 건드리지 마세요.

**로그인이 안 된다**
`APP_URL` 끝에 `/` 가 붙어 있으면 리디렉트 주소가 어긋납니다.
구글 콘솔 등록값과 한 글자도 다르면 안 됩니다.

**마이그레이션에서 멈춘다**
`docker compose run --rm migrate` 를 직접 돌려 메시지를 보세요.
앱은 띄우지 않은 상태이므로 서비스는 이전 버전 그대로입니다.

**디스크가 찬다**
`docker system prune -a` 로 옛 이미지를 지웁니다.
`backups/` 도 확인하세요 — S3에 올라간 뒤에는 로컬을 지워도 됩니다.
