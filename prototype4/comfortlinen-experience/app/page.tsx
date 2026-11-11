'use client';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ArrowDown,ArrowRight,Plus,Minus,X,Play,Pause,Check,Copy,Volume2,VolumeX,MoveHorizontal} from 'lucide-react';
import {useAmbientSound} from './useAmbientSound';
import ServicesGallery from './ServicesGallery';
import OurCompany from './OurCompany';
import LandingIntro from './LandingIntro';
const ExperienceScene=lazy(()=>import('./ExperienceScene'));
const services=[
 {number:'01',name:'Hotels & hospitality',short:'For the art of a good night.',image:'hotel.webp',type:'Hotel & hospitality',description:'Beautifully fresh bedding and soft towels, ready for your next arrival. A dedicated linen supply that helps you make every stay feel special.',details:['Bed linen & pillowcases','Bath towels & hand towels','Dedicated linen stock','Scheduled collection & delivery']},
 {number:'02',name:'Restaurants & dining',short:'Set the scene. We’ll set the linen.',image:'restaurant.webp',type:'Restaurant linen',description:'From the first table setting to the last service, impeccably finished table linen creates an experience your guests can feel.',details:['Tablecloths & napkins','Restaurant linen hire','Professional laundering','Collection & delivery']},
 {number:'03',name:'Holiday stays',short:'A fresh start for every guest.',image:'towels.webp',type:'Holiday accommodation',description:'Fresh linen for life’s little escapes. Flexible linen hire and laundry for holiday parks, rentals, guest houses and B&Bs.',details:['Bedding & towel supply','Laundry for changeover days','Flexible service plans','Local collection & delivery']},
 {number:'04',name:'Garment care',short:'A little care goes a long way.',image:'garment.webp',type:'Dry cleaning & garment care',description:'Thoughtful attention for business wear and delicate fabrics. Professional dry cleaning and garment care, with a finish that feels as good as it looks.',details:['Business wear','Delicate fabric care','Professional finishing','Speak to us about your items']},
];
function Brand({onClick}:{onClick?:()=>void}){return <a href="#home" onClick={onClick} className="brand" aria-label="ComfortLinen home"><img src="/brand/comfortlinen-green.png" alt="ComfortLinen LTD" width={2172} height={724} decoding="async"/></a>}
export default function Home(){
 const [entered,setEntered]=useState(false),[ready,setReady]=useState(false),[supported,setSupported]=useState(true),[paused,setPaused]=useState(false),[holding,setHolding]=useState(false),[menu,setMenu]=useState(false),[quote,setQuote]=useState(false),[video,setVideo]=useState(false),[service,setService]=useState<number|null>(null),[emailDraft,setEmailDraft]=useState(''),[copied,setCopied]=useState(false),[faq,setFaq]=useState<number|null>(null);
 const {sound,playing,setEnabled}=useAmbientSound({defaultEnabled:true});
 const dialog=useRef<HTMLDialogElement>(null),videoRef=useRef<HTMLVideoElement>(null),reel=useRef<HTMLVideoElement>(null),world=useRef<HTMLDivElement>(null),heroLink=useRef<HTMLAnchorElement>(null),cursor=useRef<HTMLDivElement>(null);
 const modalOpen=menu||quote||video||service!==null;
 const readyCallback=useCallback((success:boolean)=>{setReady(true);setSupported(success)},[]);
 useEffect(()=>{
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const updatePreference=()=>setPaused(preference.matches);
  const initialFrame=requestAnimationFrame(updatePreference);
  preference.addEventListener('change',updatePreference);
  return()=>{cancelAnimationFrame(initialFrame);preference.removeEventListener('change',updatePreference)};
 },[]);
 useEffect(()=>{
  document.body.style.overflow=!entered||modalOpen?'hidden':'';
  const d=dialog.current;if(modalOpen)d?.showModal();else d?.close();
  return()=>{document.body.style.overflow=''};
 },[entered,modalOpen]);
 useEffect(()=>{
  document.body.dataset.motion=paused?'paused':'playing';
  const v=reel.current;if(!v)return;
  const observer=new IntersectionObserver(([e])=>{if(e.isIntersecting&&!paused&&entered)v.play().catch(()=>{});else v.pause()},{threshold:.1});observer.observe(v);if(paused)v.pause();return()=>observer.disconnect();
 },[paused,entered]);
 useEffect(()=>{
  const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('is-visible')}),{threshold:.1});
  document.querySelectorAll('[data-reveal]').forEach(el=>reveal.observe(el));
  const onScroll=()=>{
   const p=scrollY/innerHeight;const root=world.current;if(!root)return;
   root.style.setProperty('--scroll',String(p));root.style.setProperty('--dive',String(Math.max(0,1-Math.abs(p-.85)/.42)*.85));
   const stages=[...document.querySelectorAll<HTMLElement>('[data-scene]')];
   stages.forEach(el=>{const rect=el.getBoundingClientRect();const centre=rect.top+rect.height/2;const visible=1-Math.max(0,Math.abs(centre-innerHeight/2)-innerHeight*.18)/(innerHeight*.65);el.style.setProperty('--scene-visibility',String(Math.max(0,Math.min(1,visible))));});
   const active=p<.65?'home':p<3.2?'care':document.getElementById('contact')!.getBoundingClientRect().top<innerHeight*.5?'contact':document.getElementById('story')!.getBoundingClientRect().top<innerHeight*.5?'story':document.getElementById('about')!.getBoundingClientRect().top<innerHeight*.5?'about':'services';
   root.dataset.section=active;
  };
  const onPointer=(e:PointerEvent)=>{if(cursor.current){cursor.current.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;cursor.current.dataset.interactive=String(!!(e.target as HTMLElement).closest('a,button,input,select,textarea,dialog'))}};
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);window.addEventListener('pointermove',onPointer,{passive:true});onScroll();
  return()=>{reveal.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);window.removeEventListener('pointermove',onPointer)};
 },[entered]);
 const close=()=>{setMenu(false);setQuote(false);setVideo(false);setService(null);setEmailDraft('');setCopied(false);videoRef.current?.pause()};
 const requestQuote=(value?:string)=>{setMenu(false);setService(null);setQuote(true);setEmailDraft('');if(value)setTimeout(()=>{const select=document.getElementById('enquiry-service') as HTMLSelectElement|null;if(select)select.value=value},0)};
 const go=(id:string)=>{close();const target=document.getElementById(id);if(!target)return;if(id==='services')window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY,behavior:paused?'instant':'smooth'});else target.scrollIntoView({behavior:paused?'instant':'smooth'})};
 const toServices=(event:React.MouseEvent<HTMLAnchorElement>)=>{event.preventDefault();history.replaceState(null,'','#services');go('services')};
 const enter=useCallback(()=>{window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#home');setEntered(true);void setEnabled(true);requestAnimationFrame(()=>heroLink.current?.focus({preventScroll:true}))},[setEnabled]);
 const makeDraft=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const d=new FormData(event.currentTarget);setEmailDraft(`Hello ComfortLinen,\n\nI'd like to enquire about ${d.get('service')}.\n\nName: ${d.get('name')}\nBusiness: ${d.get('business')}\nEmail: ${d.get('email')}\nPostcode: ${d.get('postcode')}\n\n${d.get('message')||'Please contact me to discuss a tailored linen service.'}\n\nThank you.`)};
 const faqs=[['Where do you collect and deliver?','From our home in Axminster, we serve businesses across the South West. Share your postcode and we’ll confirm service availability and the right collection schedule.'],['Can you supply our linen too?','Yes. We offer linen hire and laundry for hotels, restaurants and holiday accommodation, including bedding, towels and table linen.'],['Can we have dedicated linen stock?','Yes. A dedicated stock system keeps linen reserved for your business. We’ll work with you on quantities, care and collection.']];
 return <div ref={world} className={`experience ${entered?'has-entered':''} ${supported?'':'world-fallback'} ${holding?'is-holding':''}`} data-section="home">
  <div className="scene-backdrop" aria-hidden="true"/>
  <Suspense fallback={null}><ExperienceScene entered={entered} paused={paused} holding={holding} onReady={readyCallback}/></Suspense>
  <div className="scene-grain" aria-hidden="true"/><div className="dive-wash" aria-hidden="true"/>
  {!entered&&<LandingIntro ready={ready} onComplete={enter}/>}
  <div className="site-content" inert={!entered}>
   <a className="skip-link" href="#services" onClick={toServices}>Skip to services</a>
   <header className="site-header"><Brand/><nav aria-label="Main navigation"><a href="#home">Index</a><a href="#care">Our care</a><a href="#services" onClick={toServices}>Services</a><a href="#about">About us</a><a href="#story">Our story</a><a href="#contact">Contact</a></nav><button className="menu-button" aria-label="Open menu" onClick={()=>setMenu(true)}><i/><i/></button></header>
   <main>
    <section id="home" className="world-hero" data-scene>
     <div className="world-touch" aria-hidden="true" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setHolding(true)}} onPointerUp={()=>setHolding(false)} onPointerCancel={()=>setHolding(false)}/>
     <div className="hero-copy"><p className="eyebrow">THOUGHTFUL LINEN. A LIGHTER FOOTPRINT.</p><h1><em>Comfort,</em><br/>by nature.</h1><a ref={heroLink} className="round-link" href="#care">Discover our care <ArrowDown size={18}/></a></div>
     <div className="hero-note"><span className="tiny-orbit"/><p>Exceptional linen hire & laundry.<br/>A little more care for our world.</p></div>
     <button className="hold-control" aria-label="Hold to create water ripples" aria-pressed={holding} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setHolding(true)}} onPointerUp={()=>setHolding(false)} onPointerCancel={()=>setHolding(false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();setHolding(true)}}} onKeyUp={()=>setHolding(false)} onBlur={()=>setHolding(false)}><span className="hold-ring"><Plus size={17}/></span><span>{holding?'Let it ripple.':'Click & hold'}<small>DRAG TO LOOK AROUND</small></span></button>
     <a className="scroll-invitation" href="#care"><span>SCROLL TO EXPLORE</span><ArrowDown size={15}/></a>
    </section>
    <section className="water-passage" aria-label="A journey through water"><span>Every little drop<br/><em>makes a difference.</em></span></section>
    <section id="care" className="care-scene" data-scene><div className="scene-copy align-right"><p className="eyebrow">01 / CARE FOR WATER</p><h2>A fresh start.<br/><em>Again & again.</em></h2><p>Water is too precious to use just once. We recycle a third of the water in our laundry, giving it another life in every cycle.</p><div className="quiet-stat"><strong>⅓</strong><span>OF OUR WATER<br/>RECYCLED</span></div><a className="underlined-link" href="https://comfortlinen.co.uk/commercial-laundry-services/" target="_blank" rel="noreferrer">Our approach to sustainability <ArrowUpRight size={15}/></a></div><span className="scene-side-note">LESS WASTE. MORE POSSIBILITY.</span></section>
    <section className="care-scene energy-scene" data-scene><div className="scene-copy align-left"><p className="eyebrow">02 / MAKE GOOD THINGS LAST</p><h2>Beautifully cared for.<br/><em>Thoughtfully renewed.</em></h2><p>Expert laundering. Careful finishing. Heat recovered instead of lost. Small details that make a meaningful difference, from our laundry to your guests.</p><div className="quiet-stat"><strong>40<span>%</span></strong><span>LESS GAS USED WITH<br/>OUR HEAT EXCHANGER</span></div><a className="round-link" href="#services" onClick={toServices}>Find your world <ArrowDown size={18}/></a></div></section>
    <ServicesGallery services={services} paused={paused} onSelect={setService} onEnquire={()=>requestQuote()}/>
    <OurCompany paused={paused}/>
    <section id="inside-comfortlinen" className="film-section"><video ref={reel} src="/media/loop.mp4" poster="/media/laundry.webp" muted loop playsInline preload="metadata"/><div className="film-shade"/><div className="film-copy" data-reveal><p className="eyebrow">BEHIND THE FEELING</p><h2>Real people.<br/><em>Remarkable care.</em></h2><button className="round-link" onClick={()=>{setVideo(true);void setEnabled(false)}}>A look inside ComfortLinen <Play size={16}/></button></div><span className="film-location">AXMINSTER, DEVON — OUR HOME</span></section>
    <section className="details-section"><div className="details-heading" data-reveal><p className="eyebrow">THE LITTLE DETAILS</p><h2>A few things<br/><em>worth knowing.</em></h2></div><div className="faq-list">{faqs.map(([q,a],i)=><div className="faq" key={q}><button aria-expanded={faq===i} aria-controls={`faq-${i}`} onClick={()=>setFaq(faq===i?null:i)}>{q}{faq===i?<Minus size={17}/>:<Plus size={17}/>}</button><div id={`faq-${i}`} hidden={faq!==i}><p>{a}</p></div></div>)}</div></section>
    <section id="contact" className="contact-scene"><p className="eyebrow">GOOD THINGS START WITH A CONVERSATION</p><h2><em>A fresh</em><br/>beginning.</h2><button className="round-link" onClick={()=>requestQuote()}>Let’s talk linen <ArrowUpRight size={18}/></button><div className="contact-address"><a href="mailto:hello@comfortlinen.co.uk">↳ hello@comfortlinen.co.uk</a><a href="tel:+44129732121">↳ 01297 32121</a><p>Unit 3 & 4, Whitty Court<br/>Waycroft Avenue, Axminster, EX13 5HU</p></div></section>
   </main>
   <footer><Brand/><p>Care in every fibre.<br/>Rooted in the South West.</p><a href="#home">BACK TO OUR WORLD <ArrowUpRight size={15}/></a><span>©{new Date().getFullYear()} TRADEX INNOVATIONS</span></footer>
   <div className="world-controls"><button data-sound-toggle data-playback={playing?'playing':sound?'waiting':'muted'} title={sound&&!playing?'Sound on · starts with your first interaction':sound?'Mute nature sounds':'Enable nature sounds'} className={`sound-toggle ${playing?'sound-on':''}`} onClick={()=>void setEnabled(!sound)} aria-label={sound?'Mute ambient sound':'Enable ambient sound'} aria-pressed={sound}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}<span className="sound-bars"><i/><i/><i/><i/></span></button><button className="motion-toggle" onClick={()=>setPaused(!paused)} aria-label={paused?'Resume animations':'Pause animations'}>{paused?<Play size={14}/>:<Pause size={14}/>}</button></div>
   <div className="world-position" aria-hidden="true"><span className="position-home">01 / OUR WORLD</span><span className="position-care">02 / OUR CARE</span><span className="position-services">03 / YOUR WORLD</span><span className="position-about">04 / ABOUT US</span><span className="position-story">05 / OUR STORY</span><span className="position-contact">06 / SAY HELLO</span><i/></div>
  </div>
  <div ref={cursor} className="world-cursor" aria-hidden="true"><MoveHorizontal size={12}/></div>
  <dialog ref={dialog} aria-label={menu?'Explore ComfortLinen':video?'Inside ComfortLinen video':quote?'Linen service enquiry':'Service details'} className={`modal ${menu?'menu-modal':''} ${video?'video-modal':''}`} onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close()}}><button className="close-modal" aria-label="Close dialog" onClick={close}><X size={24}/></button>
   {menu&&<div className="menu-content"><Brand onClick={()=>go('home')}/><span className="eyebrow">EXPLORE A SOFTER WORLD</span><nav aria-label="Expanded navigation">{[['The experience','home'],['Our care','care'],['Your world','services'],['About us','about'],['Our story','story'],['Let’s talk','contact']].map(([name,id],i)=><button key={id} onClick={()=>go(id)}><small>0{i+1}</small>{name}<ArrowUpRight/></button>)}</nav><a href="mailto:hello@comfortlinen.co.uk">hello@comfortlinen.co.uk</a></div>}
   {service!==null&&<div className="service-detail"><img src={`/media/${services[service].image}`} alt={services[service].name}/><div><span className="eyebrow">{services[service].number} / MADE FOR YOUR WORLD</span><h2>{services[service].name}</h2><p>{services[service].description}</p><ul>{services[service].details.map(d=><li key={d}><Check size={16}/>{d}</li>)}</ul><button className="pill-button dark-button" onClick={()=>requestQuote(services[service].type)}>Talk about your linen <ArrowUpRight size={18}/></button></div></div>}
   {video&&<div className="video-content"><span className="eyebrow">INSIDE COMFORTLINEN</span><video ref={videoRef} src="/media/film.mp4" poster="/media/laundry.webp" preload="metadata" controls autoPlay playsInline/><p>A little look at the care behind every fresh delivery.</p></div>}
   {quote&&<div className="quote-content"><span className="eyebrow">A BETTER KIND OF CLEAN</span><h2>Let’s talk linen.</h2><p>Tell us a little about your world. We’ll help take care of the rest.</p>{!emailDraft?<form onSubmit={makeDraft}><div className="form-row"><label>Your name<input name="name" autoComplete="name" required placeholder="Alex Smith"/></label><label>Business name<input name="business" autoComplete="organization" required placeholder="Your business"/></label></div><div className="form-row"><label>Email address<input type="email" name="email" autoComplete="email" required placeholder="you@business.co.uk"/></label><label>Business postcode<input name="postcode" autoComplete="postal-code" required placeholder="EX13 5HU"/></label></div><label>What can we help with?<select name="service" id="enquiry-service">{services.map(s=><option key={s.type}>{s.type}</option>)}<option>Something else</option></select></label><label>A little more about your requirements<textarea name="message" rows={3} placeholder="Linen quantities, collection frequency, or anything you’d like us to know…"/></label><p className="form-note">Prepare your enquiry, then open it in your email app to send to our team.</p><button className="pill-button dark-button" type="submit">Prepare my enquiry <ArrowRight size={18}/></button></form>:<div className="draft-confirmation"><span className="draft-check"><Check/></span><h3>Your enquiry is ready.</h3><p>Open your email app, review the message and send it to <strong>hello@comfortlinen.co.uk</strong>.</p><a className="pill-button dark-button" href={`mailto:hello@comfortlinen.co.uk?subject=${encodeURIComponent('Linen service enquiry')}&body=${encodeURIComponent(emailDraft)}`}>Open email enquiry <ArrowUpRight size={18}/></a><button className="copy-button" onClick={async()=>{try{await navigator.clipboard.writeText(emailDraft);setCopied(true)}catch{setCopied(false)}}}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copied to clipboard':'Copy message instead'}</button><details><summary>View your message</summary><pre>{emailDraft}</pre></details><button className="text-link" onClick={()=>setEmailDraft('')}>Start a new enquiry</button></div>}</div>}
  </dialog>
 </div>;
}
