import { useState } from 'react';
import { CalendarDays, Compass, Heart, Menu, MessageCircle, Music2, Search, ShieldCheck, Users, UserRound, Sparkles, ArrowRight } from 'lucide-react';
import { hasSupabaseConfig, supabase } from './supabase';

const people = [
 { name:'Aarav', branch:'Electrical · 1st year', level:'Beginner', interests:'Classic Garba · Bollywood', initials:'A', color:'peach' },
 { name:'Mehak', branch:'IT · 2nd year', level:'Some experience', interests:'Dandiya · Traditional', initials:'M', color:'lilac' },
 { name:'Kabir', branch:'Mechanical · 1st year', level:'Beginner', interests:'Classic Garba · New friends', initials:'K', color:'mint' },
 { name:'Ishita', branch:'Computer · 3rd year', level:'Experienced', interests:'Dandiya · Choreography', initials:'I', color:'gold' }
];
const events = [
 {day:'18',month:'OCT',title:'Rangilo Raas Night',detail:'Campus event · 6:30 PM',tag:'Campus celebration'},
 {day:'20',month:'OCT',title:'Learn Garba Together',detail:'Open practice · 5:00 PM',tag:'Beginner friendly'}
];
type Tab = 'Discover'|'Invites'|'Groups'|'Events'|'Messages'|'Profile';
export default function App(){
 const [tab,setTab]=useState<Tab>('Discover');
 const [query,setQuery]=useState('');
 const [notice,setNotice]=useState('');
 const [authOpen,setAuthOpen]=useState(false);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [user,setUser]=useState<any>(null);
 const [sent,setSent]=useState<string[]>([]);
 const notify=(s:string)=>{setNotice(s);window.setTimeout(()=>setNotice(''),3200)};
 async function signIn(signUp:boolean){
  if(!hasSupabaseConfig||!supabase){notify('Backend setup pending — follow the README to connect Supabase.');return;}
  if(!email.trim()||password.length<8){notify('Enter your email and a password with at least 8 characters.');return;}
  setBusy(true);
  try{
   if(signUp){const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(error)throw error;notify('Check your email for the verification link.');}
   else {const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setUser(data.user);notify('Signed in successfully.');}
   setAuthOpen(false);
  }catch(e:any){notify(e.message??'Could not sign in.')}finally{setBusy(false)}
 }
 const nav:{label:Tab;icon:any}[]=[{label:'Discover',icon:Compass},{label:'Invites',icon:Heart},{label:'Groups',icon:Users},{label:'Events',icon:CalendarDays},{label:'Messages',icon:MessageCircle}];
 const filtered=people.filter(p=>(p.name+' '+p.branch+' '+p.interests).toLowerCase().includes(query.toLowerCase()));
 return <div className="app-shell">
  <header className="topbar"><a className="brand" href="#home" onClick={()=>setTab('Discover')}><span className="brand-mark"><Music2 size={21}/></span><span>garba<span className="brand-light">connect</span><small>NIT KURUKSHETRA</small></span></a>
   <nav className="desktop-nav">{nav.map(n=><button key={n.label} className={tab===n.label?'nav-link active':'nav-link'} onClick={()=>setTab(n.label)}><n.icon size={16}/>{n.label}</button>)}</nav>
   <div className="top-actions"><span className="safe-pill"><ShieldCheck size={14}/> Safer by design</span>{user?<button className="sign-in" onClick={async()=>{await supabase?.auth.signOut();setUser(null);notify('Signed out.')}}>Sign out</button>:<button className="sign-in" onClick={()=>setAuthOpen(true)}>Sign in <ArrowRight size={15}/></button>}</div>
  </header>
  <main>
   <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> YOUR CAMPUS, YOUR CREW</div><h1>Find your people.<br/><em>Feel the rhythm.</em></h1><p>Meet fellow NIT Kurukshetra students for Garba, Dandiya and unforgettable festive evenings.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>setAuthOpen(true)}>Find my Garba crew <ArrowRight size={17}/></button><span className="trust-note"><ShieldCheck size={16}/> Connect only when it’s mutual</span></div></div><div className="hero-art"><div className="sunburst">✳</div><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div><div className="dance-person person-one">✦</div><div className="dance-person person-two">✧</div><div className="art-caption"><Music2 size={17}/> Navratri nights, campus vibes</div></div><div className="hero-bottom"><span><b>01</b> Discover your vibe</span><span><b>02</b> Send an invite</span><span><b>03</b> Match mutually</span></div></section>
   <section className="section-head"><div><div className="eyebrow">THE CAMPUS COMMUNITY</div><h2>{tab==='Discover'?'Meet your Garba crew':tab==='Events'?'Festive plans':tab==='Invites'?'Your invitations':tab==='Groups'?'Find your group':tab==='Messages'?'Your conversations':'Your profile'}</h2><p>{tab==='Discover'?'A few friendly faces to get your festive plans started.':'Explore the community and keep your connections comfortable.'}</p></div>{tab==='Discover'&&<div className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names, interests…"/></div>}</section>
   {tab==='Discover'&&<div className="people-grid">{filtered.map((p,i)=><article className="person-card" key={p.name}><div className={'avatar '+p.color}>{p.initials}<span className="avatar-star">✦</span></div><div className="person-meta"><span className="level-pill">{p.level}</span><h3>{p.name}</h3><p>{p.branch}</p><div className="interest-line"><Sparkles size={14}/>{p.interests}</div><button className={sent.includes(p.name)?'invite-btn sent':'invite-btn'} onClick={()=>{if(!user){setAuthOpen(true);notify('Sign in to send an invitation.');return;}setSent([...sent,p.name]);notify('Invite request noted. Full matching requires backend setup.')}}>{sent.includes(p.name)?'Invite sent ✓':'Send an invite'} <Heart size={15}/></button></div></article>)}</div>}
   {tab==='Events'&&<div className="events-grid">{events.map(ev=><article className="event-card" key={ev.title}><div className="event-date"><b>{ev.day}</b><span>{ev.month}</span></div><div><span className="level-pill">{ev.tag}</span><h3>{ev.title}</h3><p>{ev.detail}</p><button className="text-btn" onClick={()=>notify('Please confirm official event details before publishing.')}>Event details <ArrowRight size={15}/></button></div></article>)}</div>}
   {tab==='Invites'&&<div className="empty-state"><Heart size={28}/><h3>Your invites will appear here</h3><p>When backend setup is complete, you’ll be able to accept or decline invitations here.</p><button className="secondary-btn" onClick={()=>setTab('Discover')}>Explore students</button></div>}
   {tab==='Groups'&&<div className="empty-state"><Users size={28}/><h3>Find your festive crew</h3><p>Group creation and join requests will be enabled after database setup.</p><button className="secondary-btn" onClick={()=>setAuthOpen(true)}>Get started</button></div>}
   {tab==='Messages'&&<div className="empty-state"><MessageCircle size={28}/><h3>Good conversations start with consent</h3><p>Private chat should unlock only after a mutual match. Messaging is not enabled in this starter yet.</p></div>}
   {tab==='Profile'&&<div className="empty-state"><UserRound size={28}/><h3>Your profile, your boundaries</h3><p>Sign in to start setting up your profile when the backend is connected.</p><button className="secondary-btn" onClick={()=>setAuthOpen(true)}>Sign in</button></div>}
   <section className="privacy-strip"><div className="privacy-icon"><ShieldCheck size={24}/></div><div><h3>Your comfort comes first.</h3><p>No public email addresses. No private chat before a mutual match. Block and report tools should be in place before launch.</p></div><span className="privacy-tag">PRIVACY-FIRST</span></section>
  </main>
  <footer><a className="brand footer-brand" href="#home"><span className="brand-mark"><Music2 size={18}/></span><span>garba<span className="brand-light">connect</span><small>NIT KURUKSHETRA</small></span></a><span>Made for campus connections, with care.</span><span>© 2026 Garba Connect</span></footer>
  <nav className="mobile-nav">{nav.map(n=><button key={n.label} className={tab===n.label?'mobile-tab active':'mobile-tab'} onClick={()=>setTab(n.label)}><n.icon size={19}/><span>{n.label}</span></button>)}</nav>
  {notice&&<div className="toast">{notice}</div>}
  {authOpen&&<div className="modal-backdrop" onClick={()=>setAuthOpen(false)}><form className="auth-modal" onSubmit={e=>{e.preventDefault();void signIn(false)}} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setAuthOpen(false)}>×</button><div className="brand-mark large"><Music2 size={24}/></div><div className="eyebrow">WELCOME TO YOUR CREW</div><h2>Let’s get you dancing.</h2><p>Use your student email to get started.</p><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@nitkkr.ac.in"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required placeholder="At least 8 characters"/></label><button className="primary-btn full" type="submit" disabled={busy}>{busy?'Please wait…':'Sign in'} <ArrowRight size={16}/></button><button type="button" className="text-btn" onClick={()=>void signIn(true)}>New here? Create account</button><small className="modal-foot">Email verification depends on the connected Supabase project.</small></form></div>}
 </div>;
}