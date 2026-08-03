# Worklog AI Frontend

React, TypeScript, Vite 기반의 Worklog AI 화면입니다.

## 폴더 구조

```text
src/
├─ api/                 API 공통 클라이언트와 도메인별 요청
├─ auth/                인증 상태와 라우트 가드
├─ components/
│  ├─ editor/           Markdown 편집·일지 항목
│  ├─ import/           Markdown 가져오기
│  ├─ layout/           앱 셸·헤더·스크롤
│  └─ ui/               공용 UI 요소
├─ pages/
│  ├─ admin/            관리자 화면
│  ├─ auth/             공개·로그인·비밀번호 화면
│  ├─ home/             홈
│  ├─ logs/             일지 상세·모아보기
│  ├─ projects/         프로젝트
│  ├─ reviews/          회고
│  └─ settings/         설정
├─ styles/              공통·기능별 스타일시트
├─ types/               공용 타입
└─ utils/               날짜·Markdown 순수 유틸리티
```

API는 브라우저에서 항상 `/api` 상대 경로를 사용합니다. 로컬 개발에서는 `vite.config.ts`의 프록시가 Spring Boot `localhost:8080`으로 전달하고, 운영에서는 같은 도메인의 Spring Boot가 직접 처리합니다.

## 검증

```powershell
npm run lint
npm run build
```
