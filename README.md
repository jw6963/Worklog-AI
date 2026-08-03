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

공개 회원가입은 제공하지 않습니다. 관리자가 사용자 관리 화면에서 계정을 만들며, 새 사용자는 임시 비밀번호를 변경한 뒤 자신의 기록 공간을 사용합니다.

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

## 검증

```powershell
cd C:\worklog-ai\backend
.\mvnw.cmd test

cd C:\worklog-ai\frontend
npm run build
npm run lint
```
