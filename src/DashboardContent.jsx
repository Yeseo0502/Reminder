import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Megaphone, MoreHorizontal, Plus, ShoppingBasket } from 'lucide-react';

export function TodaySchedules({items,onSelect,onAdd}){
  const visible=items.slice(0,3),remaining=items.length-visible.length;
  if(!items.length)return <div className="schedule-empty"><i><CalendarDays/></i><b>오늘 등록된 일정이 없어요</b><span>일정을 추가해보세요</span><button onClick={onAdd}><Plus/>일정 추가</button></div>;
  return <div className="today-schedule-list">{visible.map(item=><button className="today-schedule-item" key={item.id} onClick={()=>onSelect(item)}><i/><div><b>{item.title}</b><small>{item.time||'시간 미정'} · {{exam:'시험',event:'행사',class:'학급 일정'}[item.type]||'학급 일정'}</small></div><MoreHorizontal/></button>)}{remaining>0&&<button className="schedule-more" onClick={()=>onSelect(items[3])}>+ {remaining}개의 일정 더보기</button>}</div>;
}

export function ScheduleCalendar({date,items,onSelect,onAdd}){
  const[selectedDate,setSelectedDate]=React.useState(date),[weekOffset,setWeekOffset]=React.useState(0);
  const base=new Date(`${date}T00:00:00`);base.setDate(base.getDate()+weekOffset*7);
  const week=Array.from({length:7},(_,index)=>{const day=new Date(base);day.setDate(base.getDate()-base.getDay()+index);return day});
  const selectedItems=items.filter(item=>item.date===selectedDate);
  const formatDate=day=>{const year=day.getFullYear(),month=String(day.getMonth()+1).padStart(2,'0'),dateValue=String(day.getDate()).padStart(2,'0');return `${year}-${month}-${dateValue}`};
  const selectedLabel=new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
  return <section className="card calendar-card improved-calendar"><header><div><h2>일정 / 캘린더</h2><p>{selectedLabel} 일정</p></div><button className="secondary-button compact" onClick={onAdd}><Plus/>일정 추가</button></header><div className="week-row"><button className="week-arrow" onClick={()=>setWeekOffset(value=>value-1)}><ChevronLeft/></button>{week.map((day,index)=>{const value=formatDate(day),hasSchedule=items.some(item=>item.date===value);return <button className={`calendar-day ${value===selectedDate?'active':''}`} key={value} onClick={()=>setSelectedDate(value)}><span>{'일월화수목금토'[index]}</span><b>{day.getDate()}</b>{hasSchedule&&<i/>}</button>})}<button className="week-arrow" onClick={()=>setWeekOffset(value=>value+1)}><ChevronRight/></button></div><div className="calendar-schedule-list">{selectedItems.length?selectedItems.map(item=><button key={item.id} onClick={()=>onSelect(item)}><i className={`schedule-dot ${item.type}`}/><div><b>{item.title}</b><small>{item.time||'시간 미정'} · {{exam:'시험',event:'행사',class:'학급 일정'}[item.type]||'학급 일정'}</small></div><MoreHorizontal/></button>):<div className="inline-empty"><CalendarDays/><span>{selectedLabel}에 등록된 일정이 없어요</span></div>}</div></section>;
}

export function NoticePanel({items,onAdd}){
  const visible=items.slice(0,3);
  return <section className="card notice-card improved-notices"><header><div><h2>학급 공지</h2><p>최근 공지사항</p></div><button className="secondary-button compact notice-write" onClick={onAdd}><Plus/>공지 작성</button></header><div className="card-body">{visible.length?<div className="notice-card-list">{visible.map(item=><article key={item.id}><i>공지</i><b>{item.title}</b><p>{item.content||'내용이 없습니다.'}</p><time>{item.date.replace('-','.')}</time></article>)}</div>:<div className="notice-empty"><i><Megaphone/></i><b>등록된 공지가 없어요</b><span>새로운 공지가 등록되면 여기에 표시됩니다.</span><button onClick={onAdd}><Plus/>첫 공지 작성하기</button></div>}</div>{items.length>0&&<button className="notice-all">전체 공지 보기</button>}</section>;
}

export function SupplyPanel({items,onAdd,onSelect}){
  return <section className="card supply-panel"><header><div><h2>준비물 안내</h2><p>수업 전 챙겨야 할 준비물</p></div><button className="secondary-button compact" onClick={onAdd}><Plus/>추가</button></header><div className="card-body">{items.length?<div className="supply-list">{items.slice(0,5).map(item=><button key={item.id} onClick={()=>onSelect(item)}><i><ShoppingBasket/></i><div><b>{item.item}</b><small>{item.date.replaceAll('-','.')}</small></div><MoreHorizontal/></button>)}</div>:<div className="supply-empty"><i><ShoppingBasket/></i><b>등록된 준비물이 없어요</b><span>필요한 준비물이 등록되면 여기에 표시됩니다.</span><button onClick={onAdd}><Plus/>첫 준비물 추가하기</button></div>}</div>{items.length>5&&<button className="notice-all">+ {items.length-5}개의 준비물 더보기</button>}</section>;
}
