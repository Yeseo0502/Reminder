import React from 'react';
import { Bell, Check, UserRound, X } from 'lucide-react';

const roleLabels={member:'학생',president:'회장',vice_president:'부회장',teacher:'선생님'};

export default function RoomOnboarding({api,close,toast}){
  const[step,setStep]=React.useState(1);
  const[mode,setMode]=React.useState('login');
  const[auth,setAuth]=React.useState({id:'',password:'',passwordConfirm:''});
  const[roomMode,setRoomMode]=React.useState('create');
  const[room,setRoom]=React.useState({schoolName:'',schoolCode:'',officeCode:'',grade:'',classNum:'',inviteCode:''});
  const[profile,setProfile]=React.useState({name:'',role:'member'});
  const[result,setResult]=React.useState(null);
  const[error,setError]=React.useState('');
  const[busy,setBusy]=React.useState(false);

  async function authenticate(){
    if(!auth.id.trim()||!auth.password)return setError('아이디와 비밀번호를 입력해 주세요.');
    if(mode==='signup'&&auth.password!==auth.passwordConfirm)return setError('비밀번호 확인이 일치하지 않습니다.');
    setBusy(true);setError('');
    try{
      const session=await api(`/auth/${mode}`,{method:'POST',body:{...auth,id:auth.id.trim()}});
      localStorage.setItem('mialrim-user-id',String(session.userId));
      if(mode==='login'&&session.classId)return;
      setStep(2);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function saveRoom(targetMode){
    setRoomMode(targetMode);
    if(targetMode==='join'&&!room.inviteCode.trim())return setError('초대 코드를 입력해 주세요.');
    if(targetMode==='create'&&(!room.schoolName.trim()||!room.grade||!room.classNum))return setError('학교, 학년, 반을 모두 입력해 주세요.');
    setBusy(true);setError('');
    try{
      const data=await api(targetMode==='join'?'/classes/join':'/classes',{
        method:'POST',
        body:targetMode==='join'?{inviteCode:room.inviteCode.trim().toUpperCase()}:{...room,grade:Number(room.grade),classNum:Number(room.classNum)}
      });
      setResult(data);setProfile(p=>({...p,role:targetMode==='join'?'member':'president'}));setStep(3);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function finish(){
    if(!profile.name.trim())return setError('이름을 입력해 주세요.');
    setBusy(true);setError('');
    try{
      await api('/users/me/profile',{method:'POST',body:{...profile,name:profile.name.trim(),classId:result.classId}});
      toast('방 참여가 완료되었습니다.');close();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="onboarding-layer"><section className="onboarding room-onboarding">
    <button className="onboard-close" onClick={close} aria-label="닫기"><X/></button>
    <div className="welcome"><i className="brand-icon"><Bell fill="currentColor"/></i><h1>미알림에 오신 것을 환영합니다!</h1><p>로그인 후 방을 만들거나 초대 코드로 참여해 주세요.</p></div>
    <div className="stepper">{['본인 확인','반 정보 입력','프로필 완성'].map((label,index)=><React.Fragment key={label}><div className={step>index+1?'done':step===index+1?'now':''}><i>{step>index+1?<Check/>:index+1}</i><span>{label}</span></div>{index<2&&<b className={step>index+1?'done':''}/>}</React.Fragment>)}</div>

    <div className={`onboard-card ${step!==1?'dim':''}`}><h2><i>1</i> 본인 확인</h2>{step===1&&<div className="form">
      <div className="tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>로그인</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('')}}>회원가입</button></div>
      <label>아이디<input value={auth.id} onChange={e=>setAuth({...auth,id:e.target.value})} autoComplete="username"/></label>
      <label>비밀번호<input type="password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} autoComplete={mode==='login'?'current-password':'new-password'}/></label>
      {mode==='signup'&&<label>비밀번호 확인<input type="password" value={auth.passwordConfirm} onChange={e=>setAuth({...auth,passwordConfirm:e.target.value})} autoComplete="new-password"/></label>}
      <button className="primary-button wide" disabled={busy} onClick={authenticate}>{busy?'처리 중...':mode==='login'?'로그인':'회원가입'}</button>
    </div>}</div>

    <div className={`onboard-card ${step!==2?'dim':''}`}><h2><i>2</i> 반 정보 입력</h2>{step===2&&<div className="form">
      <div className="join-code-row"><label>초대 코드로 참여<input value={room.inviteCode} onChange={e=>setRoom({...room,inviteCode:e.target.value.toUpperCase()})} placeholder="초대 코드 입력" maxLength={12}/></label><button className="primary-button" disabled={busy} onClick={()=>saveRoom('join')}>코드로 참여</button></div>
      <div className="room-divider"><span>또는 새 방 만들기</span></div>
      <label>학교 검색<input value={room.schoolName} onChange={e=>setRoom({...room,schoolName:e.target.value})} placeholder="학교명을 입력하세요"/></label>
      <div className="form-grid"><label>학년<input type="number" min="1" max="6" value={room.grade} onChange={e=>setRoom({...room,grade:e.target.value})}/></label><label>반<input type="number" min="1" value={room.classNum} onChange={e=>setRoom({...room,classNum:e.target.value})}/></label></div>
      <button className="primary-button wide" disabled={busy} onClick={()=>saveRoom('create')}>새 방 만들기</button>
    </div>}</div>

    <div className={`onboard-card ${step!==3?'dim':''}`}><h2><i>3</i> 프로필 완성</h2>{step===3&&<div className="form profile-complete">
      <div className="photo-picker"><i className="avatar huge">{profile.name?.[0]||<UserRound/>}</i></div>
      {result?.inviteCode&&<div className="invite-code">방 초대 코드 <b>{result.inviteCode}</b><button onClick={()=>navigator.clipboard?.writeText(result.inviteCode)}>복사</button></div>}
      <label>이름<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} placeholder="실명을 입력하세요"/></label>
      <label>역할<div className="role-options">{Object.entries(roleLabels).map(([key,label])=><button key={key} disabled={roomMode==='create'&&key!=='president'} className={profile.role===key?'active':''} onClick={()=>setProfile({...profile,role:key})}>{label}</button>)}</div></label>
      <button className="primary-button wide" disabled={busy} onClick={finish}>확인</button>
    </div>}</div>
    {error&&<p className="onboard-error">{error}</p>}
  </section></div>
}
