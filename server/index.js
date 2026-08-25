import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';

mkdirSync('data',{recursive:true});
const db=new DatabaseSync('data/mialrim.db');
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, login_id TEXT UNIQUE, password_hash TEXT, name TEXT, email TEXT UNIQUE, profile_image TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY, school_name TEXT NOT NULL, school_code TEXT, office_code TEXT, grade INTEGER, class_number INTEGER, invite_code TEXT UNIQUE, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS class_members(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT CHECK(role IN('teacher','president','vice_president','member')), status TEXT CHECK(status IN('accepted','pending')) DEFAULT 'accepted', invited_at TEXT, joined_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(class_id,user_id));
CREATE TABLE IF NOT EXISTS meals(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, meal_date TEXT NOT NULL, menu TEXT NOT NULL, UNIQUE(class_id,meal_date));
CREATE TABLE IF NOT EXISTS timetables(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, class_date TEXT NOT NULL, period INTEGER NOT NULL, subject TEXT NOT NULL, UNIQUE(class_id,class_date,period));
CREATE TABLE IF NOT EXISTS schedules(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, title TEXT NOT NULL, schedule_date TEXT NOT NULL, schedule_time TEXT, type TEXT DEFAULT 'class');
CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, content TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS supplies(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL, supply_date TEXT NOT NULL, item TEXT NOT NULL);`);
const hash=p=>{const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(p,salt,32).toString('hex')}`};
const verify=(p,stored='')=>{const[salt,key]=stored.split(':');if(!salt||!key)return false;const a=Buffer.from(key,'hex'),b=scryptSync(p,salt,32);return a.length===b.length&&timingSafeEqual(a,b)};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const neisDate=value=>value.replaceAll('-','');
async function neisRows(service,params={}){
  const query=new URLSearchParams({Type:'json',pIndex:'1',pSize:'100',...params});
  if(process.env.NEIS_API_KEY)query.set('KEY',process.env.NEIS_API_KEY);
  const response=await fetch(`https://open.neis.go.kr/hub/${service}?${query}`);
  if(!response.ok)throw new Error(`나이스 API 요청 실패 (${response.status})`);
  const data=await response.json();
  const section=data[service];
  const result=section?.[0]?.head?.find(item=>item.RESULT)?.RESULT;
  if(result&&result.CODE!=='INFO-000'&&result.CODE!=='INFO-200')throw new Error(result.MESSAGE||'나이스 API 조회 실패');
  const rows=section?.[1]?.row||[];
  rows.totalCount=Number(section?.[0]?.head?.find(item=>item.list_total_count)?.list_total_count||rows.length);
  return rows;
}
async function findSchool(name){
  const rows=await neisRows('schoolInfo',{SCHUL_NM:name});
  return rows.find(row=>row.SCHUL_NM===name)||rows[0]||null;
}
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
const body=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}})});
const currentUser=req=>Number(req.headers['x-user-id']||0);
const membership=(classId,userId)=>db.prepare("SELECT * FROM class_members WHERE class_id=? AND user_id=? AND status='accepted'").get(classId,userId);
const memberJson=`SELECT cm.id, u.name, u.email, u.profile_image profileImage, cm.role, cm.status FROM class_members cm JOIN users u ON u.id=cm.user_id`;

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method,userId=currentUser(req);let m;
  if(method==='GET'&&path==='/api/auth/check-id'){return send(res,200,{available:!db.prepare('SELECT 1 FROM users WHERE login_id=?').get(url.searchParams.get('id'))})}
  if(method==='POST'&&path==='/api/auth/signup'){const d=await body(req),id=String(d.id||'').trim();if(!/^[A-Za-z0-9]{4,20}$/.test(id))return send(res,400,{error:'아이디는 공백 없이 영문 또는 숫자 4~20자로 입력해 주세요.'});if(String(d.password||'').length<8)return send(res,400,{error:'비밀번호는 8자 이상 입력해 주세요.'});if(d.password!==d.passwordConfirm)return send(res,400,{error:'비밀번호 확인이 일치하지 않습니다.'});try{const r=db.prepare('INSERT INTO users(login_id,password_hash,name,email) VALUES(?,?,?,?)').run(id,hash(d.password),id,`${id}@mirim.hs.kr`);return send(res,201,{userId:Number(r.lastInsertRowid)})}catch{return send(res,409,{error:'이미 사용 중인 아이디입니다.'})}}
  if(method==='POST'&&path==='/api/auth/login'){const d=await body(req),u=db.prepare('SELECT * FROM users WHERE login_id=?').get(d.id);if(!u||!verify(d.password,u.password_hash))return send(res,401,{error:'아이디 또는 비밀번호가 올바르지 않습니다.'});const member=db.prepare("SELECT class_id classId FROM class_members WHERE user_id=? AND status='accepted' ORDER BY joined_at DESC,id DESC LIMIT 1").get(u.id);return send(res,200,{userId:u.id,classId:member?.classId||null})}
  const publicDashboard=method==='GET'&&/^\/api\/classes\/1\/dashboard$/.test(path);
  if(!userId&&!publicDashboard)return send(res,401,{error:'방을 먼저 만들어야 합니다.'});
  if(method==='POST'&&path==='/api/classes'){const d=await body(req),school=await findSchool(String(d.schoolName||'').trim());if(!school)return send(res,404,{error:'나이스에서 학교를 찾을 수 없습니다. 정확한 학교명을 입력해 주세요.'});const code=randomBytes(3).toString('hex').toUpperCase();const r=db.prepare('INSERT INTO classes(school_name,school_code,office_code,grade,class_number,invite_code,created_by) VALUES(?,?,?,?,?,?,?)').run(school.SCHUL_NM,school.SD_SCHUL_CODE,school.ATPT_OFCDC_SC_CODE,d.grade,d.classNum,code,userId);db.prepare("INSERT OR REPLACE INTO class_members(class_id,user_id,role,status,joined_at) VALUES(?,?, 'president','accepted',CURRENT_TIMESTAMP)").run(r.lastInsertRowid,userId);return send(res,201,{classId:Number(r.lastInsertRowid),inviteCode:code,inviteLink:`/join/${code}`})}
  if(method==='POST'&&path==='/api/classes/join'){const d=await body(req),c=db.prepare('SELECT * FROM classes WHERE invite_code=?').get(d.inviteCode);if(!c)return send(res,404,{error:'일치하는 학급을 찾을 수 없어요.'});db.prepare("INSERT OR REPLACE INTO class_members(class_id,user_id,role,status,joined_at) VALUES(?,?, 'member','accepted',CURRENT_TIMESTAMP)").run(c.id,userId);return send(res,200,{classId:c.id,schoolName:c.school_name,grade:c.grade,classNum:c.class_number})}
  if(method==='POST'&&path==='/api/users/me/profile'){const d=await body(req);db.prepare('UPDATE users SET name=? WHERE id=?').run(d.name,userId);if(d.classId)db.prepare('UPDATE class_members SET role=? WHERE class_id=? AND user_id=?').run(d.role,d.classId,userId);return send(res,200,{ok:true})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/dashboard$/))&&method==='GET'){
    const cid=+m[1],date=url.searchParams.get('date')||today;
    if(userId&&!membership(cid,userId))return send(res,403,{error:'이 학급에 접근할 권한이 없습니다.'});
    const klass=db.prepare('SELECT id,school_name schoolName,school_code schoolCode,office_code officeCode,grade,class_number classNumber FROM classes WHERE id=?').get(cid);
    let meal=[],timetable=[],timetableLimited=false,timetableTotal=0;
    if(klass?.schoolCode&&klass?.officeCode){
      try{
        const common={ATPT_OFCDC_SC_CODE:klass.officeCode,SD_SCHUL_CODE:klass.schoolCode};
        const mealRequests=['1','2','3'].map(code=>neisRows('mealServiceDietInfo',{...common,MLSV_YMD:neisDate(date),MMEAL_SC_CODE:code}));
        const timeRequest=neisRows('hisTimetable',{...common,ALL_TI_YMD:neisDate(date),GRADE:String(klass.grade),CLASS_NM:String(klass.classNumber)});
        const[mealGroups,timeRows]=await Promise.all([Promise.all(mealRequests),timeRequest]);
        const cleanMenu=rows=>(rows[0]?.DDISH_NM||'').split(/<br\s*\/?>/i).map(item=>item.replace(/\s*\([\d.]+\)\s*$/,'').replace(/\(j\)/gi,'').replace(/\s{2,}/g,' ').trim()).filter(Boolean);
        meal={breakfast:cleanMenu(mealGroups[0]),lunch:cleanMenu(mealGroups[1]),dinner:cleanMenu(mealGroups[2])};
        timetable=timeRows.map(row=>({period:Number(row.PERIO),subject:String(row.ITRT_CNTNT||'').replace(/^\s*\*\s*/,'').trim()})).filter((row,index,all)=>row.subject&&index===all.findIndex(item=>item.period===row.period)).sort((a,b)=>a.period-b.period);
        timetableTotal=timeRows.totalCount||timetable.length;
        timetableLimited=timetableTotal>timetable.length;
      }catch(error){console.error('NEIS:',error.message)}
    }
    const schedules=db.prepare('SELECT id,title,schedule_date date,schedule_time time,type FROM schedules WHERE class_id=? ORDER BY schedule_date,schedule_time LIMIT 100').all(cid);
    const notices=db.prepare("SELECT id,title,content,substr(created_at,6,5) date FROM notices WHERE class_id=? AND category='class' ORDER BY created_at DESC LIMIT 4").all(cid);
    const supplies=db.prepare('SELECT id,item,supply_date date FROM supplies WHERE class_id=? AND supply_date>=? ORDER BY supply_date LIMIT 5').all(cid,date);
    return send(res,200,{class:klass,date,meal:Array.isArray(meal)?{breakfast:[],lunch:meal,dinner:[]}:meal,timetable,timetableTotal,timetableLimited,schedules,notices,supplies});
  }
  if((m=path.match(/^\/api\/classes\/(\d+)\/schedules$/))&&method==='POST'){const cid=+m[1],own=membership(cid,userId),d=await body(req);if(!own)return send(res,403,{error:'이 방에 참여한 사용자만 일정을 작성할 수 있습니다.'});if(!d.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))return send(res,400,{error:'일정 제목과 날짜를 확인해 주세요.'});const r=db.prepare('INSERT INTO schedules(class_id,title,schedule_date,schedule_time,type) VALUES(?,?,?,?,?)').run(cid,d.title.trim(),d.date,d.time||null,['class','exam','event'].includes(d.type)?d.type:'class');return send(res,201,{id:Number(r.lastInsertRowid)})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/schedules\/(\d+)$/))){const cid=+m[1],id=+m[2],own=membership(cid,userId);if(!own)return send(res,403,{error:'일정 관리 권한이 없습니다.'});if(method==='PATCH'){const d=await body(req);if(!d.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))return send(res,400,{error:'일정 제목과 날짜를 확인해 주세요.'});db.prepare('UPDATE schedules SET title=?,schedule_date=?,schedule_time=?,type=? WHERE id=? AND class_id=?').run(d.title.trim(),d.date,d.time||null,['class','exam','event'].includes(d.type)?d.type:'class',id,cid);return send(res,200,{ok:true})}if(method==='DELETE'){db.prepare('DELETE FROM schedules WHERE id=? AND class_id=?').run(id,cid);return send(res,200,{ok:true})}}
  if((m=path.match(/^\/api\/classes\/(\d+)\/notices$/))&&method==='POST'){const cid=+m[1],own=membership(cid,userId),d=await body(req);if(!own||!['teacher','president','vice_president'].includes(own.role))return send(res,403,{error:'공지 작성 권한이 없습니다.'});if(!d.title?.trim())return send(res,400,{error:'공지 제목을 입력해 주세요.'});const r=db.prepare("INSERT INTO notices(class_id,category,title,content) VALUES(?,'class',?,?)").run(cid,d.title.trim(),String(d.content||'').trim());return send(res,201,{id:Number(r.lastInsertRowid)})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/supplies$/))&&method==='POST'){const cid=+m[1],own=membership(cid,userId),d=await body(req);if(!own)return send(res,403,{error:'준비물 추가 권한이 없습니다.'});if(!d.item?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))return send(res,400,{error:'준비물과 날짜를 확인해 주세요.'});const r=db.prepare('INSERT INTO supplies(class_id,supply_date,item) VALUES(?,?,?)').run(cid,d.date,d.item.trim());return send(res,201,{id:Number(r.lastInsertRowid)})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/supplies\/(\d+)$/))){const cid=+m[1],id=+m[2],own=membership(cid,userId);if(!own)return send(res,403,{error:'준비물 관리 권한이 없습니다.'});if(method==='PATCH'){const d=await body(req);if(!d.item?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||''))return send(res,400,{error:'준비물과 날짜를 확인해 주세요.'});db.prepare('UPDATE supplies SET item=?,supply_date=? WHERE id=? AND class_id=?').run(d.item.trim(),d.date,id,cid);return send(res,200,{ok:true})}if(method==='DELETE'){db.prepare('DELETE FROM supplies WHERE id=? AND class_id=?').run(id,cid);return send(res,200,{ok:true})}}
  if((m=path.match(/^\/api\/classes\/(\d+)$/))){const cid=+m[1],own=membership(cid,userId);if(!own)return send(res,403,{error:'이 학급에 접근할 권한이 없습니다.'});if(method==='GET'){const c=db.prepare('SELECT id,school_name schoolName,grade,class_number classNumber,invite_code inviteCode FROM classes WHERE id=?').get(cid);return send(res,c?200:404,c||{error:'학급을 찾을 수 없습니다.'})}if(method==='PATCH'){if(own.role!=='teacher')return send(res,403,{error:'선생님만 학급 정보를 수정할 수 있습니다.'});const d=await body(req);db.prepare('UPDATE classes SET grade=?,class_number=? WHERE id=?').run(d.grade,d.classNumber,cid);return send(res,200,{ok:true})}}
  if((m=path.match(/^\/api\/classes\/(\d+)\/members$/))&&method==='GET'){const cid=+m[1];if(!membership(cid,userId))return send(res,403,{error:'이 학급에 접근할 권한이 없습니다.'});const q=`%${url.searchParams.get('search')||''}%`;return send(res,200,{members:db.prepare(`${memberJson} WHERE cm.class_id=? AND (u.name LIKE ? OR u.email LIKE ?) ORDER BY CASE cm.role WHEN 'teacher' THEN 1 WHEN 'president' THEN 2 WHEN 'vice_president' THEN 3 ELSE 4 END,u.name`).all(cid,q,q)})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/members\/invite$/))&&method==='POST'){const cid=+m[1],own=membership(cid,userId);if(!own||!['teacher','president'].includes(own.role))return send(res,403,{error:'초대 권한이 없습니다.'});const d=await body(req);if(!d.email?.endsWith('@mirim.hs.kr'))return send(res,400,{error:'올바른 학교 이메일을 입력해주세요.'});const u=db.prepare('SELECT * FROM users WHERE email=?').get(d.email);if(!u)return send(res,404,{error:'가입된 학생을 찾을 수 없습니다.'});if(db.prepare('SELECT 1 FROM class_members WHERE class_id=? AND user_id=?').get(cid,u.id))return send(res,409,{error:'이미 학급에 참여했거나 초대가 진행 중입니다.'});db.prepare("INSERT INTO class_members(class_id,user_id,role,status,invited_at) VALUES(?,?, 'member','pending',CURRENT_TIMESTAMP)").run(cid,u.id);return send(res,201,{ok:true})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/members\/(\d+)\/role$/))&&method==='PATCH'){const cid=+m[1],mid=+m[2],own=membership(cid,userId),d=await body(req);if(!own||!['teacher','president'].includes(own.role)||!['vice_president','member'].includes(d.role))return send(res,403,{error:'역할을 변경할 권한이 없습니다.'});db.prepare("UPDATE class_members SET role=? WHERE id=? AND class_id=? AND role NOT IN('teacher','president')").run(d.role,mid,cid);return send(res,200,{ok:true})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/members\/(\d+)$/))&&method==='DELETE'){const cid=+m[1],mid=+m[2],own=membership(cid,userId);if(!own||!['teacher','president'].includes(own.role))return send(res,403,{error:'멤버를 내보낼 권한이 없습니다.'});db.prepare("DELETE FROM class_members WHERE id=? AND class_id=? AND role NOT IN('teacher','president')").run(mid,cid);return send(res,200,{ok:true})}
  if((m=path.match(/^\/api\/classes\/(\d+)\/representatives$/))&&method==='GET'){const cid=+m[1];if(!membership(cid,userId))return send(res,403,{error:'접근 권한이 없습니다.'});const all=db.prepare(`${memberJson} WHERE cm.class_id=? AND cm.role IN('teacher','president','vice_president')`).all(cid),find=r=>all.find(x=>x.role===r)||null;return send(res,200,{teacher:find('teacher'),president:find('president'),vicePresident:find('vice_president')})}
  if(path==='/api/me'&&method==='GET'){const u=db.prepare('SELECT u.id,u.name,u.email,u.profile_image profileImage,cm.role FROM users u LEFT JOIN class_members cm ON cm.user_id=u.id AND cm.class_id=1 WHERE u.id=?').get(userId);return send(res,200,u)}
  if(path==='/api/me/profile'&&method==='PATCH'){const d=await body(req);if(!d.name?.trim())return send(res,400,{error:'이름을 입력해 주세요.'});db.prepare('UPDATE users SET name=? WHERE id=?').run(d.name.trim(),userId);return send(res,200,{ok:true})}
  if(path==='/api/me/password'&&method==='PATCH'){const d=await body(req),u=db.prepare('SELECT * FROM users WHERE id=?').get(userId);if(!verify(d.currentPassword,u.password_hash))return send(res,400,{error:'현재 비밀번호가 올바르지 않습니다.'});if(d.newPassword?.length<8||d.newPassword!==d.confirm)return send(res,400,{error:'새 비밀번호를 확인해 주세요.'});db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash(d.newPassword),userId);return send(res,200,{ok:true})}
  return send(res,404,{error:'API를 찾을 수 없습니다.'});
}catch(e){console.error(e);return send(res,500,{error:'서버 오류가 발생했습니다.'})}});
server.listen(3001,()=>console.log('MiAlrim API: http://localhost:3001'));
