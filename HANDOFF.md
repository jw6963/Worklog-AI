# Worklog AI 작업 인수인계

> 2026-08-03 업데이트: 홈·모아보기·주간/월간 회고·프로젝트·JSON 백업/복원·노션형 Markdown 편집·자동 저장·전날 미완료 가져오기가 구현되었다. 프로젝트는 이름·색상 수정, 보관, 연결 항목 수 확인, 안전 삭제(연결 기록은 유지하고 프로젝트만 분리)를 지원한다. 현재 다음 큰 단계는 로그인과 사용자별 데이터 분리이며, 인증 구현은 아직 시작하지 않았다. 최신 실행 및 기능 목록은 `README.md`를 우선 참고한다.

작성일: 2026-07-31  
프로젝트 위치: `C:\worklog-ai`

## 1. 제품 방향

매일 작성하는 업무일지를 축적하고, 시간이 지나면 완료한 일과 배운 점을
프로젝트·기간·주제별로 다시 보여주는 개인 업무 기록 서비스다.

최종적으로는 AI가 원문 기록에 근거하여 다음 기능을 제공하는 것이 목표다.

- 일간·주간·월간 요약
- 기간별 성과 추출
- 반복되는 장애물과 미뤄지는 업무 탐지
- 배운 점과 주요 의사결정 추출
- 다음 기간의 우선순위 제안
- 업무 보고서 및 성과평가용 문장 생성
- AI 문장과 근거 날짜·원문 기록 연결

전체 제품 기획은 `PROJECT.md`에 정리되어 있다.

## 2. 현재 완료된 범위

React + Spring Boot 기반의 로컬 1차 MVP가 구현되어 있다.

### 오늘 화면

- 날짜 선택
- 이전 날짜 및 다음 날짜 이동
- 오늘 날짜로 돌아가기
- 할 일 추가
- 완료한 일 추가
- 메모 및 회고 추가
- 할 일을 완료 목록으로 이동
- 항목 삭제
- 유형별 항목 개수 표시
- 모바일 반응형 레이아웃

### 데이터 저장

- Spring Data JPA 사용
- H2 파일 데이터베이스 사용
- 날짜별 기록 조회
- 브라우저나 서버를 다시 시작해도 기록 유지

## 3. 기술 구성

### Frontend

- React 19
- TypeScript
- Vite
- 별도 상태관리 라이브러리 없음
- Fetch API로 Spring Boot REST API 호출

### Backend

- Java 21
- Spring Boot 4.1
- Spring Web MVC
- Spring Data JPA
- Bean Validation
- H2 파일 데이터베이스
- Maven Wrapper 포함

JDK 21은 Eclipse Temurin으로 설치되어 있다.

## 4. 주요 파일

```text
C:\worklog-ai
├── backend
│   ├── data
│   │   └── worklog.mv.db
│   ├── src\main\java\com\worklog\backend
│   │   ├── BackendApplication.java
│   │   ├── WorkItem.java
│   │   ├── WorkItemController.java
│   │   └── WorkItemRepository.java
│   ├── src\main\resources\application.properties
│   ├── mvnw.cmd
│   └── pom.xml
├── frontend
│   ├── src
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   └── package.json
├── PROJECT.md
├── README.md
└── HANDOFF.md
```

`backend.zip`은 Spring Initializr에서 받은 원본 압축 파일이다. 개발에는 필요하지
않으므로 추후 삭제해도 된다.

## 5. 현재 데이터 모델

`WorkItem` 하나로 MVP를 단순화했다.

```text
WorkItem
- id
- workDate
- type: TODO | DONE | NOTE
- content
- createdAt
```

현재는 별도의 `DailyLog`, `Project`, `Tag`, `Review` 테이블이 없다.

## 6. 현재 API

### 날짜별 목록

```http
GET /api/items?date=2026-07-31
```

### 항목 생성

```http
POST /api/items
Content-Type: application/json

{
  "workDate": "2026-07-31",
  "type": "TODO",
  "content": "업무일지 작성"
}
```

### 유형 변경

```http
PATCH /api/items/{id}/type
Content-Type: application/json

{
  "type": "DONE"
}
```

### 삭제

```http
DELETE /api/items/{id}
```

## 7. 실행 방법

새 PowerShell 창 두 개를 사용한다.

### 백엔드

```powershell
cd C:\worklog-ai\backend
.\mvnw.cmd spring-boot:run
```

주소: `http://localhost:8080`

### 프론트엔드

```powershell
cd C:\worklog-ai\frontend
npm run dev
```

주소: `http://localhost:5173`

현재 작성 시점에는 두 개발 서버가 백그라운드에서 실행 중이며 양쪽 모두
HTTP 200 응답을 확인했다. PC를 재시작한 뒤에는 위 명령으로 다시 실행해야 한다.

## 8. 데이터 위치와 백업

H2 데이터베이스는 다음 위치에 생성된다.

```text
C:\worklog-ai\backend\data
```

서버가 종료된 상태에서 이 폴더를 복사하면 기록을 백업할 수 있다.

## 9. 검증 완료 항목

- `frontend`: `npm run build` 성공
- `backend`: `.\mvnw.cmd test` 성공
- Spring 애플리케이션 컨텍스트 로딩 성공
- API 생성 → 조회 → 삭제 통합 확인 성공
- 프론트엔드 개발 서버 HTTP 200
- 백엔드 API HTTP 200

API 검증용으로 생성한 임시 데이터는 검증 후 삭제했다.

## 10. 알려진 제한사항

- 항목 내용을 수정할 수 없다.
- 전날 미완료 항목을 가져오는 기능이 없다.
- 전체 타임라인과 검색이 없다.
- 프로젝트와 태그가 없다.
- 주간·월간 통계가 없다.
- 내보내기와 백업 UI가 없다.
- AI 기능이 아직 없다.
- 로그인과 다중 사용자 기능이 없다.
- API 주소가 프론트엔드 코드에 `http://localhost:8080`으로 고정되어 있다.
- CORS가 `http://localhost:5173`만 허용한다.
- CSS가 Google Fonts를 불러오므로 인터넷이 없으면 시스템 글꼴로 대체된다.
- 현재 DB 스키마는 Hibernate `ddl-auto=update`에 의존하며 Flyway는 아직 없다.

## 11. 내일 권장 작업 순서

### 우선순위 1: 실제 사용성 보완

1. 항목 내용 수정 API와 UI
2. 할 일과 완료한 일 사이의 양방향 상태 변경
3. 저장 중·저장 성공·오류 상태 표시
4. Enter 입력과 키보드 포커스 UX 개선
5. 삭제 전 확인 또는 실행 취소

### 우선순위 2: 기록을 모아보는 기능

1. 전체 날짜 타임라인
2. 기간 선택
3. 키워드 검색
4. TODO, DONE, NOTE 필터
5. 날짜별 완료한 일만 모아보기

### 우선순위 3: 데이터 구조 확장

1. `Project` 엔티티 추가
2. `WorkItem`과 프로젝트 연결
3. `BLOCKER`, `LEARNING` 유형 추가
4. Flyway 마이그레이션 도입
5. Markdown 및 JSON 내보내기

AI 기능은 최소 1~2주 실제 기록을 쌓은 뒤 추가하는 편이 좋다. 실제 데이터가
있어야 요약 결과의 품질과 필요한 분석 형태를 판단할 수 있다.

## 12. 내일 시작할 때 사용할 요청 예시

```text
C:\worklog-ai\HANDOFF.md와 PROJECT.md를 읽고 현재 구현 상태를 확인해줘.
그다음 항목 수정 기능과 전체 타임라인 화면을 구현하고 테스트해줘.
```
