# Worklog AI

매일의 할 일, 완료한 일, 메모와 회고를 Markdown 기반으로 기록하고 기간·프로젝트별로 다시 살펴보는 로컬 업무일지입니다.

## 주요 기능

- 홈: 오늘 현황, 이번 주 완료율, 지난 할 일, 최근 일지
- 일지: 노션형 Markdown 편집, 자동 저장, 삭제 실행 취소
- 전날 미완료 업무 가져오기 및 홈에서 즉시 완료
- 모아보기: 기간·키워드·유형·프로젝트 필터
- 주간·월간 회고: 완료율, 완료 내역, 키워드, 규칙 기반 요약
- 프로젝트 생성·색상 수정·보관 및 기록 연결
- 프로젝트 삭제 시 연결 기록 확인 및 프로젝트만 안전하게 분리
- Markdown 가져오기·내보내기
- JSON 전체 백업·복원
- H2 파일 데이터베이스 영구 저장
- `ADMIN`·`USER` 역할 기반 로그인과 세션 보호
- 관리자 전용 계정 생성·활성화·비활성화·임시 비밀번호 초기화
- 임시 비밀번호 최초 로그인 후 비밀번호 변경 강제
- 사용자별 일지·프로젝트·백업 데이터 완전 분리
- Markdown 불러오기·프로젝트·모아보기·백업을 설명하는 화면 내 사용 가이드

공개 회원가입은 제공하지 않습니다. 관리자가 사용자 관리 화면에서 계정을 만들며, 새 사용자는 임시 비밀번호를 변경한 뒤 자신의 기록 공간을 사용합니다.

## 프로젝트 구조

```text
Worklog-AI/
├─ frontend/   React 화면, 기능별 API·페이지·컴포넌트·스타일
├─ backend/    Spring Boot API, 도메인별 Java 패키지
├─ Dockerfile
└─ render.yaml
```

세부 구조는 `frontend/README.md`와 `backend/README.md`를 참고하세요.

## 실행 방법

IntelliJ의 `Worklog AI` Run Configuration을 실행하거나 PowerShell 창 두 개에서 다음 명령을 실행합니다.

```powershell
cd C:\worklog-ai\backend
.\mvnw.cmd spring-boot:run
```

```powershell
cd C:\worklog-ai\frontend
npm run dev
```

- 프론트엔드: `http://localhost:5173`
- 백엔드: `http://localhost:8080`

### 로그인

새 데이터베이스를 처음 실행하기 전, 관리자 비밀번호를 반드시 환경 변수로 지정하세요.

```powershell
$env:WORKLOG_ADMIN_USERNAME='my-account'
$env:WORKLOG_ADMIN_PASSWORD='충분히-긴-비밀번호'
$env:WORKLOG_ADMIN_DISPLAY_NAME='내 Worklog'
```

로컬 개발에서는 `backend\.env.properties.example`을 `backend\.env.properties`로 복사한 뒤 실제 값을 입력할 수도 있습니다. `.env.properties`는 Git에서 제외됩니다.

계정은 최초 실행 시 H2 데이터베이스에 BCrypt 해시로 생성됩니다. 이미 같은 아이디의 계정이 생성된 뒤에는 환경 변수 변경만으로 기존 비밀번호가 바뀌지 않습니다.

## 데이터와 백업

H2 데이터 파일은 `C:\worklog-ai\backend\data\worklog.mv.db`에 저장됩니다. 사이트의 설정 화면에서 JSON 전체 백업을 내려받고 새 환경에서 복원할 수 있습니다.

## Render 배포

동일한 소스가 환경에 따라 다르게 실행됩니다.

- 로컬 기본 프로필 `local`: Vite 개발 서버 + Spring Boot + H2
- Render 프로필 `prod`: Spring Boot가 React 정적 파일과 API를 함께 제공 + Render PostgreSQL

배포 절차:

1. `feature/deployment`을 `develop`에 병합해 CI를 확인합니다.
2. `develop`에서 `main`으로 PR을 병합합니다.
3. Render Dashboard에서 **New > Blueprint**를 선택합니다.
4. GitHub 비공개 저장소 `jw6963/Worklog-AI` 접근을 허용합니다.
5. 저장소 루트의 `render.yaml`을 선택합니다.
6. 생성 과정에서 `WORKLOG_ADMIN_PASSWORD`에 강한 초기 관리자 비밀번호를 입력합니다.
7. 배포 완료 후 발급된 `onrender.com` 주소로 접속합니다.

`main`의 GitHub Actions 검사가 통과한 커밋만 Render가 자동 배포합니다. 자세한 절차는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요. 무료 데이터베이스와 별개로 JSON 백업도 보관해야 합니다.

운영 배포는 Docker 다단계 빌드로 프론트엔드와 백엔드를 하나의 실행 JAR에 포함합니다. 로컬에는 Docker가 없어도 기존 IntelliJ `Worklog AI` 실행 설정을 그대로 사용할 수 있습니다.

## 검증

```powershell
cd C:\worklog-ai\backend
.\mvnw.cmd test

cd C:\worklog-ai\frontend
npm run build
npm run lint
```
