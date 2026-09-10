서버에서 명단 적재

■ 신규
  roster.sh      명단 적재 (마이그레이터 이미지에서 실행)

■ 수정
  Dockerfile     migrator 단계에 scripts/ 추가.
                 실행 이미지에는 tsx·exceljs 가 없어 명단 적재를 돌릴 수 없습니다.
  DEPLOY.md      적재 절차

■ 쓰는 법
  chmod +x roster.sh
  ./deploy.sh                        # Dockerfile 이 바뀌었으니 다시 빌드
  ./roster.sh 명단.xlsx --dry-run     # 확인
  ./roster.sh 명단.xlsx               # 적재

  결과 예시
    읽은 시트 2 · 적재 대상 303명 · 문제 0건
      기수: 1기 147 · 2기 156
      캠퍼스: 인문사회 56 · 자연과학 247

■ 확인
  docker compose exec db psql -U connect -d connect -c "select count(*) from roster;"
