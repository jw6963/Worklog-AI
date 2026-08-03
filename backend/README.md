# Worklog AI Backend

Spring Boot, Spring Security, JPA 기반의 Worklog AI API입니다.

## 패키지 구조

```text
com.worklog.backend
├─ auth/       로그인·현재 사용자·계정 상태 필터
├─ config/     보안·데이터소스·SPA 웹 설정
├─ project/    프로젝트 엔티티·저장소·API
├─ user/       사용자 엔티티·저장소·관리자 API
└─ workitem/   일지 엔티티·저장소·API·백업
```

기능별 패키지 안에서 엔티티, 저장소, 컨트롤러를 함께 관리합니다. 다른 기능의 데이터에 접근할 때만 해당 도메인 패키지를 import합니다.

## 환경

- 기본 `local` 프로필: 파일 H2 데이터베이스
- `prod` 프로필: Render에서 사용하는 Neon PostgreSQL

## 검증

```powershell
.\mvnw.cmd test
```
