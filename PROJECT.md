# Worklog AI

매일 작성한 업무일지를 축적하고, 완료한 일과 배운 점을 보기 좋게 재구성하며,
장기적으로 AI가 근거 기반 회고와 요약을 제공하는 개인 업무 기록 서비스다.

## 제품 원칙

- 할 일보다 실제로 완료한 일과 그 맥락을 중심으로 기록한다.
- 날짜별 기록을 프로젝트, 태그, 기간 단위로 다시 볼 수 있어야 한다.
- AI가 만든 문장에는 근거가 된 날짜와 원문 기록을 연결한다.
- 사용자의 기록은 내보내기와 백업이 가능해야 한다.
- 초기에는 로컬 단일 사용자 앱으로 만들고, 이후 웹 서비스로 확장한다.

## 주요 사용 흐름

사용자는 매일 다음 내용을 간단히 기록한다.

- 오늘 할 일
- 완료한 일
- 진행 중이거나 미룬 일
- 메모, 회고, 느낀 점
- 막힌 점
- 배운 점
- 내일 이어서 할 일

기록이 쌓이면 서비스는 다음 형태로 재구성한다.

- 날짜별 업무일지
- 주간 및 월간 타임라인
- 프로젝트별 완료 내역
- 태그별 기록
- 반복적으로 발생한 문제
- 자주 미뤄지는 업무
- 최근 배운 내용
- 기간별 성과 요약

## MVP 범위

첫 단계에서는 AI 없이도 매일 실제로 사용할 수 있는 로컬 앱을 만든다.

### 오늘 화면

- 날짜별 업무일지 작성
- 할 일, 완료한 일, 메모 입력
- 항목 추가, 수정, 삭제, 순서 변경
- 자동 저장
- 이전 및 다음 날짜 이동
- 전날 미완료 업무 가져오기

### 타임라인

- 날짜별 업무일지 카드
- 기간 검색
- 키워드 검색
- 프로젝트 및 항목 유형 필터

### 프로젝트

- 프로젝트 생성 및 보관
- 여러 날짜의 업무 기록을 프로젝트별로 모아보기

### 회고

- 주간 및 월간 완료 내역
- 항목 유형별 개수
- 프로젝트별 기록 비중
- AI 기능이 추가되기 전에는 규칙 기반 요약 제공

### 데이터 관리

- 로컬 데이터베이스 저장
- JSON 및 Markdown 내보내기
- 추후 가져오기 기능 추가

## AI 확장 기능

- 일간, 주간, 월간 요약
- 기간별 성과 추출
- 반복되는 장애물 탐지
- 계속 미뤄지는 업무 지적
- 배운 점과 주요 의사결정 추출
- 다음 기간의 우선순위 제안
- 업무 보고서 문체로 변환
- 성과평가 및 이력서용 문장 생성

AI 결과에는 근거가 된 날짜와 기록 ID를 포함한다. AI가 원문에 없는 사실을
단정하지 않도록 프롬프트와 응답 구조를 제한한다.

## 기술 스택

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- 초기에는 일반 CSS 또는 CSS Modules

### Backend

- Java
- Spring Boot
- Spring Web
- Spring Data JPA
- Bean Validation
- Flyway
- 초기 로컬 개발: H2 파일 모드
- 웹 서비스 전환: PostgreSQL

### AI

- AI API 호출은 Spring 백엔드에서 수행한다.
- API 키, 프롬프트, 사용량 제한 및 결과 저장을 백엔드가 관리한다.
- MVP가 안정적으로 사용된 후 연결한다.

## 초기 데이터 모델

### DailyLog

- id
- workDate
- summary
- mood
- createdAt
- updatedAt

### LogItem

- id
- dailyLogId
- type: TODO, DONE, NOTE, BLOCKER, LEARNING
- content
- status
- projectId
- sortOrder
- createdAt
- updatedAt

### Project

- id
- name
- description
- color
- archived

### Tag

- id
- name

### Review

- id
- periodType: DAILY, WEEKLY, MONTHLY
- startDate
- endDate
- generatedContent
- sourceLogIds
- createdAt

## 개발 단계

### 1단계: 로컬 MVP

- React와 Spring Boot 프로젝트 구성
- 날짜별 업무일지 CRUD
- 자동 저장
- 전날 미완료 항목 가져오기
- 타임라인, 검색, 프로젝트 필터
- H2 파일 데이터베이스

### 2단계: 회고와 백업

- 주간 및 월간 통계
- 완료한 일 모아보기
- 프로젝트 활동 타임라인
- 반복 키워드 및 장애물 표시
- Markdown 및 JSON 내보내기

### 3단계: AI

- 근거 연결형 요약
- 반복 문제 분석
- 다음 행동 제안
- 보고서 및 성과 문장 생성

### 4단계: 웹 서비스

- PostgreSQL 전환
- 사용자 인증
- HTTPS 및 백업
- 모바일 UI 개선
- 배포 자동화
- AI 사용량 및 비용 제한

## 권장 프로젝트 구조

```text
C:\worklog-ai
├── frontend
├── backend
├── docs
└── PROJECT.md
```

## 다음 작업

1. React + TypeScript + Vite 프론트엔드 생성
2. Spring Boot 백엔드 생성
3. 로컬 개발 실행 명령 통합
4. DailyLog 및 LogItem API 구현
5. 오늘 화면부터 연결

