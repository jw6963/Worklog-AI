# Worklog AI 배포

현재 운영 체험 환경은 Render 무료 Web Service와 Render 무료 PostgreSQL을 사용한다. 앱과 데이터베이스를 Render Blueprint 하나로 생성하므로 별도의 데이터베이스 서비스 가입이 필요 없다.

> Render 무료 PostgreSQL은 생성 후 30일이 지나면 만료된다. 만료 전에 전체 JSON 백업을 내려받고, 계속 사용할 경우 Render 유료 DB로 전환하거나 외부 PostgreSQL로 이전해야 한다.

## 1. 배포 전 준비

1. GitHub의 `main` 브랜치에 배포할 코드가 반영됐는지 확인한다.
2. Render에 가입하고 GitHub 계정을 연결한다.
3. 비공개 저장소 `jw6963/Worklog-AI`에 대한 접근을 허용한다.

## 2. Blueprint 생성

1. Render Dashboard에서 **New > Blueprint**를 선택한다.
2. `jw6963/Worklog-AI` 저장소를 선택한다.
3. 저장소 루트의 `render.yaml`을 사용한다.
4. Blueprint가 다음 리소스를 함께 생성하는지 확인한다.
   - `worklog-ai`: Docker Web Service
   - `worklog-db`: PostgreSQL database
5. 생성 과정에서 `WORKLOG_ADMIN_PASSWORD`에 최초 관리자용 강력한 임시 비밀번호를 입력한다.

`DB_URL`은 Blueprint가 PostgreSQL connection string으로 자동 설정한다. 직접 복사하거나 Git에 저장할 필요가 없다. 관리자 로그인 ID는 기본값 `admin`이다.

## 3. 배포 확인

1. Render가 제공한 `onrender.com` 주소에 접속한다.
2. 관리자 계정으로 로그인한다.
3. 최초 로그인 안내에 따라 관리자 비밀번호를 변경한다.
4. 테스트 일지를 저장한 후 페이지를 새로 고쳐 기록이 유지되는지 확인한다.
5. Render에서 Web Service를 재배포한 뒤에도 같은 기록이 남아 있는지 확인한다.
6. 설정 화면에서 전체 JSON 백업을 내려받아 로컬과 허용된 클라우드에 보관한다.

무료 Web Service는 유휴 상태에서 정지되므로 첫 접속에 시간이 걸릴 수 있다.

## 4. 30일 안에 결정할 일

- 계속 사용: Render PostgreSQL을 유료 플랜으로 전환하거나 외부 PostgreSQL로 이전
- 체험 종료: 전체 JSON 백업을 받은 뒤 서비스와 DB 정리
- 어떤 경우든 무료 DB 만료 전에 마지막 JSON 백업 확인
