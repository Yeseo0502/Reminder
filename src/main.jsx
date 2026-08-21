import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, Clock3, Crown,
  Home, HousePlus, Menu, Megaphone, Settings, ShieldCheck,
  ShoppingBasket, UserRound, UsersRound, Utensils, X
} from 'lucide-react';
import './styles.css';

const meals = ['김치볶음밥', '미역국', '계란말이', '배추김치'];
const timetable = [
  ['1교시', '국어'], ['2교시', '수학'], ['3교시', '영어'],
  ['4교시', '정보'], ['5교시', '한국사'], ['6교시', '체육']
];
const notices = [
  ['3학년 장소 변경 안내', '08.21'],
  ['프로젝트 발표 순서 안내', '08.18'],
  ['수행 수행평가 범위 안내', '08.17']
];
const week = [
  { day: '일', date: 17 }, { day: '월', date: 18 }, { day: '화', date: 19 },
  { day: '수', date: 20, active: true }, { day: '목', date: 21 },
  { day: '금', date: 22 }, { day: '토', date: 23 }
];

function Sidebar({ open, onClose }) {
  const items = [
    [Home, '홈', true], [UsersRound, '멤버'],
    [HousePlus, '방만들기 / 초대코드입력'], [Settings, '설정']
  ];
  return <>
    {open && <button className="scrim" aria-label="메뉴 닫기" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-icon"><Bell size={25} fill="currentColor" /></span><strong>미알림</strong></div>
      <nav>
        {items.map(([Icon, label, active]) => <a className={active ? 'active' : ''} href="#" key={label} onClick={onClose}><Icon size={19}/><span>{label}</span></a>)}
      </nav>
      <div className="role-card">
        <h3>권한 안내</h3>
        <div><Crown className="teacher" size={20} fill="currentColor"/><p><b>선생님</b><small>모든 관리 및 수정 가능</small></p></div>
        <div><ShieldCheck className="president" size={20} fill="currentColor"/><p><b>회장 / 부회장</b><small>공지 작성 및 수정 가능</small></p></div>
      </div>
    </aside>
  </>;
}

function SectionCard({ title, date, children, footer, className = '' }) {
  return <section className={`card ${className}`}>
    <header><h2>{title}</h2>{date && <time>{date}</time>}</header>
    <div className="card-body">{children}</div>
    {footer && <div className="card-footer">{footer}</div>}
  </section>;
}

function App() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main>
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><Menu/></button>
        <h1>3학년 4반</h1>
        <button className="profile" aria-label="프로필"><UserRound size={22} fill="currentColor"/></button>
      </header>

      <div className="dashboard">
        <div className="primary">
          <div className="summary-grid">
            <SectionCard title="오늘의 급식" date="8월 20일" footer={<><Utensils size={18}/> 맛있게 식사하세요!</>}>
              <ul className="meal-list">{meals.map(item => <li key={item}>{item}</li>)}</ul>
            </SectionCard>
            <SectionCard title="오늘의 시간표" date="8월 20일" footer={<><Clock3 size={18}/> 수업 열심히 들어요!</>}>
              <div className="timetable">{timetable.map(([period, subject]) => <React.Fragment key={period}><span>{period}</span><b>{subject}</b></React.Fragment>)}</div>
            </SectionCard>
            <SectionCard title="오늘의 일정" date="8월 20일" footer={<><CalendarDays size={18}/> 오늘의 일정입니다!</>}>
              <p className="schedule-item">응용프로그래밍 기획서 수행평가</p>
            </SectionCard>
          </div>

          <section className="card calendar-card">
            <header><h2>일정 / 캘린더</h2><button className="more">더보기 &gt;</button></header>
            <div className="week-row"><ChevronLeft size={15}/>{week.map(d => <div key={d.date}><span>{d.day}</span><b className={d.active ? 'selected' : ''}>{d.date}</b></div>)}<ChevronRight size={15}/></div>
            <div className="calendar-event">응용프로그래밍 기획서 수행평가</div>
            <button className="add-button">+&nbsp; 일정 추가</button>
          </section>
        </div>

        <aside className="right-column">
          <SectionCard title="학급 공지" className="notice-card">
            <button className="more floating">더보기 &gt;</button>
            <ul className="notice-list">{notices.map(([title, date]) => <li key={title}><span>{title}</span><time>{date}</time></li>)}</ul>
          </SectionCard>
          <SectionCard title="준비물 안내" className="supply-card">
            <button className="more floating">더보기 &gt;</button>
            <p>체육복 챙기기</p>
            <ShoppingBasket className="basket" size={62}/>
          </SectionCard>
        </aside>
      </div>
    </main>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
