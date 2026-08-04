import { Link } from 'react-router-dom'
import { localDate } from '../../utils/date'

const importExample = `---
date: 2026-08-03
---

## To Do

첫 번째 할 일

---

두 번째 할 일

## Done

완료한 작업과 결과

## Notes

### 배운 점

- 목록과 하위 내용을 한 항목 안에 작성
- 항목을 나눌 때만 단독 구분선 사용`

export function GuidePage() {
  return <main className="page guide-page">
    <div className="page-heading"><div><span className="page-kicker">USER GUIDE</span><h1>사용 가이드</h1><p>일지를 작성하고 다시 찾는 데 필요한 핵심 사용법입니다.</p></div></div>
    <div className="guide-layout">
      <nav className="guide-toc" aria-label="가이드 목차">
        <a href="#write">일지 작성</a>
        <a href="#import">Markdown 불러오기</a>
        <a href="#projects">프로젝트</a>
        <a href="#browse">모아보기</a>
        <a href="#review">회고</a>
        <a href="#backup">백업과 복원</a>
      </nav>
      <div className="guide-content">
        <section id="write">
          <span>01</span><h2>일지 작성</h2>
          <p>하루에는 하나의 일지가 있고, 그 안에 할 일·완료한 일·메모 항목을 여러 개 작성합니다. 각 항목에는 서로 다른 프로젝트를 지정할 수 있습니다.</p>
          <ul><li><code># </code>로 제목, <code>- </code>로 목록을 시작합니다.</li><li>Tab과 Shift+Tab으로 목록 깊이를 조절합니다.</li><li>Ctrl+Enter로 새 항목을 저장합니다.</li><li>Alt+1·2·3으로 할 일·완료·메모 입력기로 이동합니다.</li><li>섹션 제목을 누르면 긴 목록을 접거나 펼칠 수 있습니다.</li><li>기존 항목을 클릭하면 편집하며, 바깥을 클릭하면 변경 내용이 저장됩니다.</li></ul>
          <div className="guide-callout"><strong>전날 할 일을 가져오면 하나의 업무 흐름으로 연결됩니다.</strong><p>전날 항목은 이월 이력으로 남고 열린 TODO에서는 제외됩니다. 어느 날짜에서 완료해도 현재 항목이 완료되며 과거 이력에도 실제 완료 날짜가 표시됩니다.</p></div>
          <p>최신 이월 TODO의 <strong>이월 취소</strong>를 누르면 현재 항목을 제거하고 직전 날짜의 TODO로 되돌립니다. 완료된 항목은 먼저 할 일로 되돌린 뒤 취소할 수 있습니다.</p>
          <Link to={`/logs/${localDate()}`}>오늘 일지 열기 →</Link>
        </section>

        <section id="import">
          <span>02</span><h2>Markdown 불러오기</h2>
          <p><code>## To Do</code>, <code>## Done</code>, <code>## Notes</code> 제목으로 유형을 구분합니다. 같은 유형 안에서 한 줄에 단독으로 쓴 <code>---</code>만 새 항목의 경계로 인식합니다.</p>
          <pre><code>{importExample}</code></pre>
          <div className="guide-callout"><strong>목록의 <code>-</code>는 항목 경계가 아닙니다.</strong><p>설명과 하위 목록을 하나의 항목으로 유지합니다. 미리보기에서는 생성될 항목마다 프로젝트를 따로 선택할 수 있습니다.</p></div>
          <p>파일명이나 본문 메타데이터에 날짜가 없으면 현재 보고 있던 날짜를 사용하며, 불러오기 전에 날짜를 직접 바꿀 수 있습니다.</p>
        </section>

        <section id="projects">
          <span>03</span><h2>프로젝트</h2>
          <p>프로젝트는 하루 일지 전체가 아닌 개별 항목에 지정됩니다. 같은 날짜의 항목도 서로 다른 프로젝트에 연결할 수 있습니다.</p>
          <ul><li>프로젝트 카드에서 남은 일·완료·메모 수와 최근 활동을 확인합니다.</li><li>최근 활동을 누르면 해당 날짜의 원문 항목으로, 기록 모아보기를 누르면 프로젝트 필터가 적용된 모아보기로 이동합니다.</li><li><code>···</code> 메뉴에서 이름·색상 수정, 보관, 삭제와 다른 활성 프로젝트로의 항목 이관을 실행합니다.</li><li>이관은 이월 이력을 포함한 모든 연결 항목의 프로젝트를 한 번에 변경합니다.</li><li>프로젝트를 삭제해도 일지 항목은 남고 프로젝트 연결만 해제됩니다.</li></ul>
          <Link to="/projects">프로젝트 관리 열기 →</Link>
        </section>

        <section id="browse">
          <span>04</span><h2>모아보기</h2>
          <p>1주, 2주, 한 달 또는 직접 지정한 기간의 기록을 검색합니다. 키워드·프로젝트·TODO/DONE/NOTE 조건을 함께 적용할 수 있습니다.</p>
          <ul><li>날짜 제목을 누르면 해당 날짜의 일지로 이동합니다.</li><li>개별 항목 카드를 누르면 일지 안의 정확한 항목 위치로 이동하고 포커스됩니다.</li><li>프로젝트 필터와 항목 유형은 URL에 남아 링크를 다시 열어도 유지됩니다.</li></ul>
          <Link to="/logs">모아보기 열기 →</Link>
        </section>

        <section id="review">
          <span>05</span><h2>회고</h2>
          <p>주간·월간 기록을 이전 기간과 비교하고, 완료율과 프로젝트별 기록 분포를 확인합니다.</p>
          <ul><li>완료·미완료·메모 수와 완료율의 이전 기간 대비 변화를 표시합니다.</li><li>오래 남은 할 일을 누르면 해당 날짜의 원문 항목으로 이동합니다.</li><li>자주 기록한 주제는 외부 AI 없이 의미 있는 2~24자 단어의 빈도로 계산하며, 숫자·반복·과도하게 긴 토큰은 제외합니다.</li><li>기간 분석은 업무량, 완료 흐름, 기록 습관, 프로젝트 집중도, 회고 습관, 지연 업무와 분류 상태를 여러 구간으로 세분화해 평가합니다.</li><li>여러 신호의 조합에 따라 패턴 해석과 다음 행동 제안을 달리하며, 같은 데이터에는 같은 결과를 보여줍니다.</li><li>종합 평가는 개별 신호의 균형을 요약하며 개인의 실제 성과점수나 인사평가를 의미하지 않습니다.</li></ul>
          <Link to="/reviews">회고 열기 →</Link>
        </section>

        <section id="backup">
          <span>06</span><h2>백업과 복원</h2>
          <p>Markdown은 읽고 공유하기 위한 일지 단위 파일이고, JSON은 계정의 전체 데이터를 복원하기 위한 백업 파일입니다.</p>
          <ul><li>JSON에는 프로젝트, 항목과 이월 연결 정보가 함께 저장됩니다.</li><li>복원은 현재 계정의 프로젝트와 기록 전체를 백업 내용으로 교체합니다.</li><li>중요한 변경 전과 최소 주 1회 전체 JSON 백업을 권장합니다.</li><li>백업 파일은 로컬과 허용된 클라우드 두 곳에 보관합니다.</li><li>Render 무료 PostgreSQL 만료 전에는 반드시 마지막 JSON 백업을 확인합니다.</li></ul>
          <Link to="/settings">백업 설정 열기 →</Link>
        </section>
      </div>
    </div>
  </main>
}
