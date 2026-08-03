# Worklog AI 배포

운영 환경은 Render 무료 Web Service와 Neon 무료 PostgreSQL을 사용합니다.
로컬 개발은 기존처럼 H2 파일 데이터베이스를 사용하므로 운영 데이터와 섞이지 않습니다.

## 1. Neon 데이터베이스 생성

1. [Neon](https://console.neon.tech/)에 가입하고 새 프로젝트를 생성합니다.
2. 데이터베이스 이름은 `worklog`처럼 알아보기 쉽게 지정합니다.
3. **Connect** 화면에서 PostgreSQL connection string을 복사합니다.
4. 연결 문자열은 비밀번호를 포함하므로 Git이나 문서에 저장하지 않습니다.

연결 문자열은 다음과 같은 형태입니다.

```text
postgresql://사용자:비밀번호@호스트/데이터베이스?sslmode=require&channel_binding=require
```

## 2. Render 배포

1. GitHub에서 배포 변경을 `main` 브랜치에 병합합니다.
2. Render Dashboard에서 **New > Blueprint**를 선택합니다.
3. 비공개 GitHub 저장소 `jw6963/Worklog-AI`를 연결합니다.
4. 저장소 루트의 `render.yaml`을 사용합니다.
5. 생성 과정에서 다음 Secret 값을 입력합니다.

| 환경변수 | 값 |
|---|---|
| `DB_URL` | Neon에서 복사한 PostgreSQL connection string |
| `WORKLOG_ADMIN_PASSWORD` | 최초 관리자용 강력한 임시 비밀번호 |

`WORKLOG_ADMIN_USERNAME`은 기본값 `admin`을 사용합니다. 배포 후 최초 로그인에서 관리자 비밀번호를 변경합니다.

## 3. 배포 확인

1. Render가 제공한 `onrender.com` 주소에 접속합니다.
2. 관리자 계정으로 로그인하고 비밀번호를 변경합니다.
3. 테스트 일지를 하나 저장한 다음 페이지를 새로 고쳐 데이터가 유지되는지 확인합니다.
4. Render에서 재배포한 뒤에도 같은 기록이 남아 있는지 확인합니다.
5. 설정 화면에서 전체 JSON 백업을 내려받아 별도 위치에 보관합니다.

무료 서비스는 첫 접속이 느릴 수 있습니다. Render와 Neon이 유휴 상태에서 깨어나는 동안 잠시 기다린 뒤 다시 접속하면 됩니다.
