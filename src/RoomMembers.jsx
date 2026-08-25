import React from 'react';
import { Check, Copy, MoreVertical, UsersRound } from 'lucide-react';

const labels={teacher:'선생님',president:'회장',vice_president:'부회장',member:'학생'};

export default function RoomMembers({api,classId,toast}){
  const[room,setRoom]=React.useState(null);
  const[members,setMembers]=React.useState([]);
  const[search,setSearch]=React.useState('');
  const[loading,setLoading]=React.useState(true);
  const[copied,setCopied]=React.useState(false);

  const load=React.useCallback(async()=>{
    setLoading(true);
    try{
      const[roomData,memberData]=await Promise.all([
        api(`/classes/${classId}`),
        api(`/classes/${classId}/members?search=${encodeURIComponent(search)}`)
      ]);
      setRoom(roomData);setMembers(memberData.members);
    }catch(e){toast(e.message,'error')}finally{setLoading(false)}
  },[api,classId,search,toast]);

  React.useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer)},[load]);

  async function copyCode(){
    try{await navigator.clipboard.writeText(room.inviteCode);setCopied(true);toast('초대 코드가 복사되었습니다.');setTimeout(()=>setCopied(false),1800)}
    catch{toast(`초대 코드: ${room.inviteCode}`)}
  }

  return <div className="page-content room-members-page">
    <div className="page-heading"><div><h1>멤버</h1><p>초대 코드를 공유하면 다른 사용자가 이 방에 참여할 수 있어요.</p></div></div>
    {room&&<section className="invite-code-card">
      <div className="invite-code-heading"><i><UsersRound/></i><div><small>방 초대 코드</small><strong>{room.inviteCode}</strong></div></div>
      <button className="primary-button" onClick={copyCode}>{copied?<Check/>:<Copy/>}{copied?'복사 완료':'초대 코드 복사'}</button>
      <p>방 만들기 화면에서 <b>초대 코드로 참여</b>를 선택한 뒤 이 코드를 입력하면 됩니다.</p>
    </section>}
    <section className="content-card">
      <div className="toolbar"><label className="search-box"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름으로 검색"/></label></div>
      {loading?<div className="empty">멤버를 불러오는 중...</div>:!members.length?<div className="empty">참여한 멤버가 없습니다.</div>:<div className="member-table">
        <div className="table-head"><span>순번</span><span>이름</span><span>이메일</span><span>상태</span><span>역할</span><span/></div>
        {members.map((member,index)=><div className="member-row" key={member.id}><span>{index+1}</span><span className="person"><i className="avatar">{member.name?.[0]||'?'}</i><b>{member.name||'이름 미설정'}</b></span><span>{member.email}</span><span><i className={`status ${member.status}`}>{member.status==='accepted'?'참여 중':'대기 중'}</i></span><span>{labels[member.role]}</span><MoreVertical/></div>)}
      </div>}
    </section>
  </div>
}
