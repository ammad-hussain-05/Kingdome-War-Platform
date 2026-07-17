"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState12, Square12, PlayerColor, PieceType12, Piece12 } from "@/lib/game/rules-12x12";
import {
  createInitialGameState12, getLegalMoves12, executeMove12, advanceTurn,
  sq12Eq, pieceImagePath, findSorceress, findWizard,
  applySleepSpell, applyTeleportSpell, applyWizardTeleport,
  applyMageSacrifice, applyAxeSwing, getAxeSwingSquares,
  rollWishDice, cloneState12,
} from "@/lib/game/rules-12x12";
import Fireworks from "@/components/game/fireworks";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const EMOJI: Record<PieceType12, string> = {
  "mystic-king":"👑","super-queen":"🌟","dragon":"🐉","gargoyle":"👹","wizard":"🧙",
  "sorceress":"🔮","super-knight":"⚔️","assassin":"🗡️","executioner":"🪓",
  "cavalier":"🏇","mage":"✨","elvin-archer":"🏹","paladin":"🛡️",
};
const PIECE_INFO: Record<PieceType12,{name:string;move:string;special:string}> = {
  "mystic-king": {name:"Mystic King",move:"L-shape + 1 any dir",special:"Wizard can morph king if alive"},
  "super-queen": {name:"Super Queen",move:"Any direction, unlimited",special:"Double move if Sorceress alive"},
  "dragon":      {name:"Dragon",move:"Any dir unlimited + L capture",special:"Flies over own pieces for L-attack"},
  "gargoyle":    {name:"Gargoyle",move:"Any dir unlimited + L capture",special:"Same as Dragon"},
  "wizard":      {name:"Wizard",move:"Any dir (ethereal)",special:"Teleport any piece. Only kills Wizard/Sorceress"},
  "sorceress":   {name:"Sorceress",move:"Any direction unlimited",special:"3 spells: 😴 Sleep / 🌀 Teleport / ⭐ Wish (dice)"},
  "super-knight":{name:"Super Knight",move:"L-shape (can double jump)",special:"Two L-jumps possible in one turn"},
  "assassin":    {name:"Assassin",move:"Any dir + L-shape + 1 step",special:"Jumps over own pieces for L-move"},
  "executioner": {name:"Executioner",move:"Straight lines only (rook)",special:"After stopping: swing axe 1 adj square"},
  "cavalier":    {name:"Cavalier/Prince",move:"L-shape + 1 any dir",special:"Always lands opposite color square"},
  "mage":        {name:"Mage/Princess",move:"Any direction unlimited",special:"Sacrifice self to restore Super Queen"},
  "elvin-archer":{name:"Elvin Archer",move:"Any dir + L-shape + 1 step",special:"Sword/dagger = 1-square paladin move"},
  "paladin":     {name:"Paladin",move:"1 square any direction",special:"Super attack 2-3 squares ONCE only"},
};
const AC: Record<PlayerColor,string> = { white:"#e8dfc0", black:"#c8a96e" };
const GL: Record<PlayerColor,string> = { white:"rgba(232,223,192,0.4)", black:"rgba(200,169,110,0.4)" };
const ZONE: Record<string,string> = { white:"rgba(232,220,180,0.07)", black:"rgba(200,160,80,0.07)", grey:"rgba(138,157,181,0.07)" };
function getZone(r:number,c:number):string|null { 
  if(r>=10)return"white"; 
  if(r<=1)return"black"; 
  return null; 
}
// ─── SOUND ────────────────────────────────────────────────────────────────────
function snd(type:string){
  if(typeof window==="undefined")return;
  try{
    const ctx=new((window as any).AudioContext||(window as any).webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    const S:any={
      select:{freq:[520],dur:.07,wave:"sine"},move:{freq:[280,380],dur:.1,wave:"triangle"},
      great:{freq:[440,550,660],dur:.3,wave:"sine"},risky:{freq:[200,180],dur:.2,wave:"sawtooth"},
      capture:{freq:[220,160,100],dur:.25,wave:"sawtooth"},check:{freq:[520,640,520],dur:.4,wave:"square"},
      win:{freq:[400,500,640,880],dur:.9,wave:"sine"},eliminate:{freq:[150,100,80],dur:.6,wave:"sawtooth"},
      spell:{freq:[700,900,1100],dur:.4,wave:"sine"},axe:{freq:[140,90],dur:.3,wave:"sawtooth"},
      click:{freq:[600],dur:.05,wave:"sine"},
    };
    const s=S[type]||S.move; o.type=s.wave; const t=ctx.currentTime;
    s.freq.forEach((f:number,i:number)=>o.frequency.setValueAtTime(f,t+i*s.dur/s.freq.length));
    g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+s.dur);
    o.start(t);o.stop(t+s.dur);
  }catch{}
}


// ─── PIECE IMAGE ──────────────────────────────────────────────────────────────
function PieceImg({piece,sqSize,isAnim,isGreat,isRisky}:{piece:Piece12;sqSize:number;isAnim:boolean;isGreat?:boolean;isRisky?:boolean}){
  const [failed,setFailed]=useState(false);
  const glow=isGreat?"drop-shadow(0 0 8px #FFD700) drop-shadow(0 0 16px #FFD700)":isRisky?"drop-shadow(0 0 8px #FF4444)":"drop-shadow(0 3px 7px rgba(0,0,0,0.9))";
  if(failed)return <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sqSize*.46,userSelect:"none",pointerEvents:"none",zIndex:3,filter:glow}}>{EMOJI[piece.type]}</div>;
  return <img src={pieceImagePath(piece)} alt={piece.type} onError={()=>setFailed(true)}
    style={{position:"absolute",top:"4%",left:"4%",width:"92%",height:"92%",objectFit:"contain",pointerEvents:"none",zIndex:3,display:"block",
      filter:`${glow}${piece.sleepRoundsLeft>0?" grayscale(0.8) opacity(0.6)":""}`,
      animation:isAnim?"pieceIn .32s cubic-bezier(.22,1,.36,1) both":isGreat?"greatGlow .6s ease":isRisky?"riskyShake .4s ease":"none",
      transition:"filter .3s"}}/>;
}

// ─── MOVE TOAST ───────────────────────────────────────────────────────────────
function MoveToast({quality,onDone}:{quality:"great"|"risky"|"normal"|null;onDone:()=>void}){
  useEffect(()=>{if(quality){const t=setTimeout(onDone,2200);return()=>clearTimeout(t);}},[quality,onDone]);
  if(!quality)return null;
  const cfg={
    great:{icon:"🔥",text:"Great Move!",color:"#FFD700",bg:"rgba(255,215,0,.10)",border:"rgba(255,215,0,.30)"},
    risky:{icon:"⚠️",text:"Risky Move",color:"#ff8080",bg:"rgba(255,60,60,.10)",border:"rgba(255,80,80,.30)"},
    normal:{icon:"✅",text:"Safe Move",color:"#7dbd6e",bg:"rgba(125,189,110,.10)",border:"rgba(125,189,110,.30)"},
  }[quality];
  return(
    <div style={{width:"100%",minHeight:54,padding:"11px 13px",borderRadius:15,background:cfg.bg,border:`1px solid ${cfg.border}`,boxShadow:"0 8px 20px rgba(0,0,0,.45)",display:"flex",alignItems:"center",gap:10,backdropFilter:"blur(12px)",animation:"fadeInUp .25s ease both"}}>
      <span style={{width:32,height:32,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.28)",border:`1px solid ${cfg.border}`,fontSize:16,flexShrink:0}}>{cfg.icon}</span>
      <div>
        <p style={{margin:0,fontSize:11,fontWeight:800,color:cfg.color,letterSpacing:".09em",textTransform:"uppercase"}}>{cfg.text}</p>
        <p style={{margin:"3px 0 0",fontSize:10,color:"rgba(230,210,170,.38)"}}>Strategy feedback</p>
      </div>
    </div>
  );
}

// ─── ELIMINATION POPUP ────────────────────────────────────────────────────────
function EliminationPopup({eliminated,playerNames,onClose}:{eliminated:PlayerColor;playerNames:Record<PlayerColor,string>;onClose:()=>void}){
  useEffect(()=>{snd("eliminate");const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  const ac=AC[eliminated];
  return(
    <div style={{position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .3s ease"}} onClick={onClose}>
      <div style={{textAlign:"center",padding:"48px 64px",borderRadius:24,background:"linear-gradient(160deg,#1a0505,#2a0808)",border:`1px solid ${ac}40`,boxShadow:"0 0 60px rgba(255,50,50,.3),0 30px 80px rgba(0,0,0,.8)",animation:"slideUp .4s cubic-bezier(.22,1,.36,1)"}}>
        <div style={{fontSize:72,marginBottom:16,lineHeight:1}}>💀</div>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:32,color:"#ff8080",margin:"0 0 8px",fontWeight:700}}>Eliminated!</h2>
        <p style={{fontSize:18,color:`${ac}cc`,margin:"0 0 6px",fontWeight:600}}>{playerNames[eliminated]} ({eliminated})</p>
        <p style={{fontSize:14,color:"rgba(255,255,255,.4)",margin:"0 0 24px",fontStyle:"italic"}}>has been eliminated from the battlefield</p>
        <p style={{fontSize:13,color:"rgba(255,180,180,.5)"}}>The remaining kingdoms continue their battle...</p>
      </div>
    </div>
  );
}

// ─── SPELL PARTICLES ─────────────────────────────────────────────────────────
function SpellParticles({type,onDone}:{type:"sleep"|"teleport"|"wish"|"axe"|null;onDone:()=>void}){
  useEffect(()=>{if(type){const t=setTimeout(onDone,1200);return()=>clearTimeout(t);}else onDone();},[type]);
  if(!type)return null;
  const cfgs={sleep:{emoji:"💤",color:"#9090ff",label:"Sleep Spell!"},teleport:{emoji:"🌀",color:"#d080ff",label:"Teleport!"},wish:{emoji:"⭐",color:"#f0c040",label:"Wish Spell!"},axe:{emoji:"🪓",color:"#ff6030",label:"Axe Swing!"}};
  const cfg=cfgs[type];
  return(
    <div style={{position:"fixed",inset:0,zIndex:85,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {[...Array(12)].map((_,i)=>(
        <div key={i} style={{position:"absolute",top:"50%",left:"50%",fontSize:28,animation:`spellParticle${i%3} .9s ease-out both`,animationDelay:`${i*.05}s`,transform:`translate(-50%,-50%) rotate(${i*30}deg) translateY(-${60+Math.random()*60}px)`,opacity:0}}>{cfg.emoji}</div>
      ))}
      <div style={{padding:"14px 32px",borderRadius:50,background:`${cfg.color}22`,border:`1px solid ${cfg.color}60`,backdropFilter:"blur(12px)",animation:"toastIn .3s ease"}}>
        <span style={{fontSize:20,marginRight:10}}>{cfg.emoji}</span>
        <span style={{fontSize:15,fontWeight:700,color:cfg.color,letterSpacing:".1em"}}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
interface ChatMsg{sender:string;text:string;time:string}
function ChatPanel({myColor,messages,onSend}:{myColor:PlayerColor;messages:ChatMsg[];onSend:(t:string)=>void}){
  const [input,setInput]=useState(""); const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const send=()=>{if(!input.trim())return;onSend(input.trim());setInput("");};
  const ac=AC[myColor];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"rgba(8,5,2,.92)",borderRadius:16,border:`1px solid ${ac}20`,backdropFilter:"blur(20px)",overflow:"hidden",boxShadow:`0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 ${ac}10`}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${ac}12`,background:`${ac}06`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:ac,boxShadow:`0 0 8px ${GL[myColor]}`,display:"inline-block"}}/>
        <span style={{fontSize:11,color:`${ac}cc`,fontWeight:700,letterSpacing:".18em",textTransform:"uppercase"}}>Battle Chat</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {messages.length===0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:6}}><span style={{fontSize:22,opacity:.1}}>💬</span><p style={{fontSize:11,color:"rgba(255,255,255,.1)",textAlign:"center",fontStyle:"italic",margin:0}}>No messages yet</p></div>}
        {messages.map((msg,i)=>{const isMe=msg.sender===myColor;const mac=AC[msg.sender as PlayerColor]||ac;return(
          <div key={i} style={{padding:"7px 11px",borderRadius:isMe?"12px 12px 3px 12px":"12px 12px 12px 3px",background:isMe?`${mac}18`:"rgba(255,255,255,.04)",border:`1px solid ${isMe?mac+"22":"rgba(255,255,255,.05)"}`,alignSelf:isMe?"flex-end":"flex-start",maxWidth:"92%"}}>
            <p style={{fontSize:9,color:`${mac}80`,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:".08em"}}>{msg.sender}·{msg.time}</p>
            <p style={{fontSize:12,color:"#e8d8b0",margin:0,lineHeight:1.4}}>{msg.text}</p>
          </div>
        );})}
        <div ref={ref}/>
      </div>
      <div style={{padding:"8px 10px",borderTop:`1px solid ${ac}12`,display:"flex",gap:6}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message..." style={{flex:1,padding:"8px 12px",borderRadius:9,background:"rgba(0,0,0,.5)",border:`1px solid ${ac}20`,color:"#e8d8b0",fontSize:12,outline:"none"}}/>
        <button onClick={send} style={{width:34,height:34,borderRadius:9,background:`${ac}22`,border:`1px solid ${ac}38`,color:ac,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>→</button>
      </div>
    </div>
  );
}

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
function PlayerCard({name,color,isMe,isActive,isElim,captured,inCheck}:{name:string;color:PlayerColor;isMe:boolean;isActive:boolean;isElim:boolean;captured:Piece12[];inCheck:boolean}){
  const ac=AC[color];
  const sym=color==="white"?"♔":color==="black"?"♚":"♛";
  const cardBg=isElim?"linear-gradient(135deg,rgba(70,0,0,.55),rgba(20,0,0,.75))":color==="white"?"linear-gradient(135deg,rgba(255,255,255,0.95),rgba(245,245,245,0.9))":color==="black"?"linear-gradient(135deg,rgba(0,0,0,0.95),rgba(10,10,10,0.9))":"linear-gradient(135deg,rgba(130,145,165,.82),rgba(48,60,76,.78))";
  const cardBorder=isElim?"rgba(255,70,70,.35)":color==="white"?"rgba(255,255,255,.75)":color==="black"?"rgba(212,168,67,.35)":"rgba(185,210,240,.45)";
  const nameColor=isElim?"rgba(255,120,120,.65)":color==="white"?"#2b1b05":color==="black"?"#f0d28a":"#f2f6ff";
  const subColor=isElim?"rgba(255,120,120,.4)":color==="white"?"rgba(50,35,10,.55)":color==="black"?"rgba(240,210,138,.55)":"rgba(235,245,255,.55)";
  return(
    <div style={{borderRadius:16,padding:"12px 14px",background:cardBg,border:`1px solid ${cardBorder}`,backdropFilter:"blur(3px)",opacity:isElim?.5:1,transition:"all .3s",boxShadow:isActive&&!isElim?`0 0 24px ${GL[color]},0 8px 24px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.18)`:"0 8px 22px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:captured.length>0?8:0}}>
        <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:color==="white"?"radial-gradient(circle at 35% 35%,#fffdf2,#c8b070)":color==="black"?"radial-gradient(circle at 35% 35%,#4a3d28,#0a0704)":"radial-gradient(circle at 35% 35%,#b8c4d8,#4d5f75)",border:`2px solid ${cardBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,color:nameColor,boxShadow:isActive&&!isElim?`0 0 14px ${GL[color]}`:"none"}}>
          {isElim?"💀":sym}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:15,fontWeight:800,color:nameColor,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}{isMe?" (You)":""}</p>
          <p style={{margin:"2px 0 0",fontSize:10,color:subColor,textTransform:"uppercase",letterSpacing:".12em"}}>{isElim?"Eliminated":color}</p>
        </div>
        {!isElim&&inCheck&&<div style={{padding:"3px 7px",borderRadius:7,background:"rgba(255,80,80,.18)",border:"1px solid rgba(255,80,80,.45)",fontSize:10,color:"#ff8080",fontWeight:700,animation:"checkFlash 1s infinite",flexShrink:0}}>CHECK</div>}
        {!isElim&&isActive&&!inCheck&&<div style={{width:8,height:8,borderRadius:"50%",background:ac,boxShadow:`0 0 8px ${GL[color]}`,animation:"pulseDot 1.5s infinite",flexShrink:0}}/>}
      </div>
      {captured.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:3,maxHeight:32,overflow:"hidden"}}>
          {captured.slice(0,10).map((p,i)=><span key={i} style={{fontSize:11,filter:"drop-shadow(0 1px 2px rgba(0,0,0,.7))"}}>{EMOJI[p.type]}</span>)}
          {captured.length>10&&<span style={{fontSize:10,color:subColor}}>+{captured.length-10}</span>}
        </div>
      )}
    </div>
  );
}

// ─── GUIDE PANEL ─────────────────────────────────────────────────────────────
function GuidePanel({myColor,gs}:{myColor:PlayerColor;gs:GameState12}){
  const [open,setOpen]=useState(false);
  const ac=AC[myColor];
  const myP=new Set<PieceType12>();
  for(let r=0;r<12;r++)for(let c=0;c<12;c++){const p=gs.board[r][c];if(p&&p.color===myColor)myP.add(p.type);}
  return(
    <div style={{position:"relative",width:"100%"}}>
      <button onClick={()=>{setOpen(o=>!o);snd("click");}} style={{width:"100%",minHeight:54,padding:"12px 15px",borderRadius:16,background:open?`linear-gradient(135deg,${ac}22,rgba(10,12,22,.96))`:"linear-gradient(135deg,rgba(8,12,22,.96),rgba(36,2,18,.92))",border:`1px solid ${open?ac+"70":ac+"35"}`,color:ac,fontSize:12,cursor:"pointer",fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",fontFamily:"'Cinzel',Georgia,serif",transition:"all .2s",boxShadow:open?`0 0 30px ${GL[myColor]},0 12px 26px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.16)`:`0 0 18px ${GL[myColor]},0 8px 20px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.10)`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,position:"relative",overflow:"hidden"}}>
        <span style={{width:30,height:30,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(145deg,${ac}24,rgba(0,0,0,.35))`,border:`1px solid ${ac}35`,boxShadow:`0 0 12px ${GL[myColor]},inset 0 1px 0 rgba(255,255,255,.12)`,fontSize:17,filter:"drop-shadow(0 3px 5px rgba(0,0,0,.7))"}}>{open?"✕":"📘"}</span>
        <span>{open?"Close Guide":"Battle Guide"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",bottom:"112%",right:0,zIndex:70,width:"300px",maxHeight:"460px",overflowY:"auto",padding:"18px",borderRadius:"22px",background:"linear-gradient(160deg,rgba(6,8,14,.98),rgba(18,22,36,.97),rgba(7,5,3,.98))",backdropFilter:"blur(26px)",border:`1px solid ${ac}35`,boxShadow:`0 0 55px ${GL[myColor]},0 30px 80px rgba(0,0,0,.92),inset 0 1px 0 rgba(255,255,255,.12)`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${ac}22`}}>
            <div style={{width:46,height:46,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:25,background:`linear-gradient(145deg,${ac}22,rgba(0,0,0,.35))`,border:`1px solid ${ac}35`,boxShadow:`0 0 18px ${GL[myColor]},inset 0 1px 0 rgba(255,255,255,.14)`}}>🧭</div>
            <div>
              <p style={{margin:0,fontSize:13,color:ac,fontWeight:900,textTransform:"uppercase",letterSpacing:".16em"}}>Your Battle Guide</p>
              <p style={{margin:"4px 0 0",fontSize:10,color:"rgba(220,210,185,.45)",letterSpacing:".05em"}}>Pieces, powers & victory rules</p>
            </div>
          </div>
          <div style={{display:"grid",gap:8}}>
            {(Object.keys(PIECE_INFO) as PieceType12[]).map(type=>{
              const has=myP.has(type); const info=PIECE_INFO[type];
              return(
                <div key={type} style={{padding:"11px 12px",borderRadius:15,background:has?"linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))":"rgba(255,255,255,.015)",border:`1px solid ${has?ac+"24":"rgba(255,255,255,.04)"}`,opacity:has?1:.34,transition:"all .2s",boxShadow:has?"0 8px 18px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.07)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                    <span style={{width:34,height:34,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,background:`linear-gradient(145deg,${ac}18,rgba(0,0,0,.38))`,border:`1px solid ${ac}22`,boxShadow:has?`0 0 12px ${GL[myColor]},inset 0 1px 0 rgba(255,255,255,.12)`:"none",filter:"drop-shadow(0 4px 6px rgba(0,0,0,.65))",flexShrink:0}}>{EMOJI[type]}</span>
                    <div style={{minWidth:0}}>
                      <p style={{margin:0,fontSize:12,fontWeight:900,color:has?ac:"rgba(180,140,60,.42)",letterSpacing:".05em"}}>{info.name}{!has?" ✗":""}</p>
                      <p style={{margin:"2px 0 0",fontSize:9,color:"rgba(210,200,175,.38)",textTransform:"uppercase",letterSpacing:".12em"}}>Unit Ability</p>
                    </div>
                  </div>
                  <p style={{margin:"0 0 4px",fontSize:10.5,color:"rgba(220,205,170,.72)",lineHeight:1.5}}><span style={{color:"#8fd3ff"}}>🏃 Move:</span> {info.move}</p>
                  <p style={{margin:0,fontSize:10.5,color:"rgba(165,205,255,.70)",lineHeight:1.5}}><span style={{color:"#f0c040"}}>✨ Special:</span> {info.special}</p>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:14,padding:"13px 14px",borderRadius:17,background:"linear-gradient(135deg,rgba(212,168,67,.08),rgba(120,80,20,.045))",border:"1px solid rgba(212,168,67,.20)",boxShadow:"0 10px 24px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,220,120,.08)"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
              <span style={{width:32,height:32,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:"rgba(212,168,67,.12)",border:"1px solid rgba(212,168,67,.25)",boxShadow:"0 0 12px rgba(212,168,67,.16)"}}>⚔️</span>
              <p style={{margin:0,fontSize:12,color:"#d4a843",fontWeight:900,letterSpacing:".14em",textTransform:"uppercase"}}>Rules</p>
            </div>
            {[["👑","Killing the king does not end the game"],["🏆","Eliminate every opponent piece to win"],["🏳️","Forfeit/Quit declares the opponent winner"],["🔮","Spell casters say spell name while moving"],["🧙","Wizard/Sorceress are ethereal — can't kill humans"],["✨","Only Wizard or Sorceress can kill each other"]].map(([emoji,r],i)=>(
              <p key={i} style={{margin:"0 0 6px",fontSize:10.5,color:"rgba(220,200,165,.68)",lineHeight:1.55}}><span style={{marginRight:6}}>{emoji}</span>{r}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SPECIAL PANEL ────────────────────────────────────────────────────────────
function SpecialPanel({gs,myColor,onAction,onCancel}:{gs:GameState12;myColor:PlayerColor;onAction:(a:string,d?:any)=>void;onCancel:()=>void}){
  const ac=AC[myColor];
  if(gs.currentTurn!==myColor||gs.status==="finished")return null;
  const sorcSq=findSorceress(gs.board,myColor);
  const wizSq=findWizard(gs.board,myColor);
  const spL=sorcSq&&gs.board[sorcSq.row][sorcSq.col]?gs.board[sorcSq.row][sorcSq.col]!.sorceressSpellsLeft:0;
  const hasSorc=spL>0; const hasWiz=!!wizSq;
  const findMNQ=()=>{
    let q:Square12|null=null;
    for(let r=0;r<12;r++)for(let c=0;c<12;c++)if(gs.board[r][c]?.type==="super-queen"&&gs.board[r][c]?.color===myColor)q={row:r,col:c};
    if(!q)return null;
    for(const[dr,dc] of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]as[number,number][]){
      const r=q.row+dr,c=q.col+dc;if(r>=0&&r<12&&c>=0&&c<12&&gs.board[r][c]?.type==="mage"&&gs.board[r][c]?.color===myColor)return{mageSq:{row:r,col:c},queenSq:q};
    }
    return null;
  };
  const mNQ=findMNQ();
  if(!hasSorc&&!hasWiz&&!mNQ&&!gs.spellMessage)return null;
  const btn=(bg:string,border:string,color:string)=>({padding:"8px 14px",borderRadius:10,background:bg,border:`1px solid ${border}`,color,fontSize:11,cursor:"pointer",fontWeight:700,transition:"all .2s",boxShadow:`0 4px 16px ${bg}80`});
  return(
    <div style={{position:"relative",zIndex:20,background:"rgba(4,2,0,.96)",backdropFilter:"blur(24px)",border:`1px solid ${ac}28`,borderRadius:20,padding:"14px 22px",width:"min(520px,95vw)",margin:"4px auto 0",boxShadow:`0 0 50px ${GL[myColor]},0 24px 60px rgba(0,0,0,.85)`}}>
      {gs.spellMessage&&<p style={{margin:"0 0 10px",fontSize:13,color:ac,fontWeight:700,textAlign:"center",letterSpacing:".04em"}}>✨ {gs.spellMessage}</p>}
      {gs.wishDiceResult!==null&&(
        <div style={{padding:"10px 18px",borderRadius:12,background:gs.wishDiceResult>5?"rgba(125,189,110,.12)":"rgba(255,80,80,.12)",border:`1px solid ${gs.wishDiceResult>5?"rgba(125,189,110,.3)":"rgba(255,80,80,.3)"}`,textAlign:"center",marginBottom:10}}>
          <p style={{margin:0,fontSize:24,fontWeight:700,color:gs.wishDiceResult>5?"#7dbd6e":"#ff8080"}}>🎲 {gs.wishDiceResult}/10</p>
          <p style={{margin:"4px 0 8px",fontSize:12,color:"rgba(180,140,60,.6)"}}>{gs.wishDiceResult>5?"✅ Wish Granted!":"❌ Wish Failed — Turn Lost"}</p>
          {gs.wishDiceResult>5?<button onClick={()=>onAction("wish-success")} style={btn("rgba(125,189,110,.2)","rgba(125,189,110,.4)","#7dbd6e")}>Claim Wish →</button>:<button onClick={()=>onAction("wish-fail")} style={btn("rgba(255,80,80,.1)","rgba(255,80,80,.3)","#ff8080")}>End Turn</button>}
        </div>
      )}
      {!gs.specialMode&&!gs.wishDiceResult&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          {hasSorc&&<><button onClick={()=>onAction("spell-sleep")} style={btn("rgba(80,60,200,.2)","rgba(80,60,200,.4)","#9090ff")}>😴 Sleep ({spL})</button><button onClick={()=>onAction("spell-teleport")} style={btn("rgba(180,60,200,.2)","rgba(180,60,200,.4)","#d080ff")}>🌀 Teleport</button><button onClick={()=>onAction("spell-wish")} style={btn("rgba(200,160,20,.2)","rgba(200,160,20,.4)","#f0c040")}>⭐ Wish</button></>}
          {hasWiz&&<button onClick={()=>onAction("wizard-teleport")} style={btn("rgba(60,150,200,.2)","rgba(60,150,200,.4)","#60c0f0")}>🧙 Wizard</button>}
          {mNQ&&<button onClick={()=>onAction("mage-sacrifice",mNQ)} style={btn("rgba(200,80,80,.2)","rgba(200,80,80,.4)","#ff9090")}>💫 Mage Sacrifice</button>}
        </div>
      )}
      {gs.specialMode&&<div style={{display:"flex",justifyContent:"center",marginTop:10}}><button onClick={onCancel} style={{padding:"6px 18px",borderRadius:9,background:"rgba(255,80,80,.1)",border:"1px solid rgba(255,80,80,.25)",color:"#ff8080",fontSize:12,cursor:"pointer",fontWeight:700}}>✕ Cancel</button></div>}
    </div>
  );
}

// ─── WIN / DEFEAT SCREEN ─────────────────────────────────────────────────────
function EndScreen({showWin,myColor,playerNames,onLobby,onPlayAgain}:{showWin:PlayerColor;myColor:PlayerColor;playerNames:Record<PlayerColor,string>;onLobby:()=>void;onPlayAgain:()=>void}){
  const isWinner=showWin===myColor;
  const ac=AC[showWin];
  const gl=GL[showWin];
  return(
    <>
      {/* Fireworks only for winner */}
      {isWinner&&<Fireworks/>}

      {/* Full-screen blurred overlay */}
      <div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .4s ease",padding:20}}>

        {/* Card */}
        <div style={{textAlign:"center",padding:"52px 68px",borderRadius:28,position:"relative",overflow:"hidden",background:isWinner?"linear-gradient(160deg,#1a1400,#2e2000,#1a1400)":"linear-gradient(160deg,#0e0505,#1e0808,#0e0505)",border:`1px solid ${ac}45`,boxShadow:`0 0 80px ${gl},0 0 160px ${isWinner?"rgba(212,168,67,0.15)":"rgba(255,50,50,0.1)"},0 40px 100px rgba(0,0,0,0.95),inset 0 1px 0 ${ac}18`,animation:"winPulse 2.5s ease-in-out infinite",fontFamily:"'Cinzel',Georgia,serif"}}>

          {/* Top glow line */}
          <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:200,height:1,background:`linear-gradient(90deg,transparent,${ac}80,transparent)`}}/>
          <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:140,height:32,background:`radial-gradient(ellipse,${ac}18,transparent 70%)`}}/>

          {/* Image */}
          <img src={isWinner?"/game-over/victory.png":"/game-over/defeated.png"} alt="result-icon"
            style={{width:200,height:200,objectFit:"contain",display:"block",margin:"0 auto 16px"}}/>

          {/* Eyebrow */}
          <p style={{fontSize:9,letterSpacing:"0.32em",textTransform:"uppercase",color:`${ac}60`,margin:"0 0 10px"}}>
            {isWinner?"— Kingdom Triumphant —":"— Kingdom Fallen —"}
          </p>

          {/* Title */}
          <h1 style={{fontFamily:"'Cinzel',Georgia,serif",fontSize:54,color:isWinner?"#c8a84a":ac,margin:"0 0 8px",fontWeight:700,letterSpacing:".04em",textShadow:isWinner?"0 0 40px rgba(200,168,74,0.6),0 0 80px rgba(200,168,74,0.2)":"0 0 40px rgba(255,80,80,0.5)"}}>
            {isWinner?"Victory!":"Defeated"}
          </h1>

          <p style={{fontSize:20,color:`${ac}aa`,margin:"0 0 6px",fontWeight:600}}>{playerNames[showWin]||showWin}</p>
          <p style={{fontSize:14,color:"rgba(212,168,67,.5)",margin:"0 0 12px",fontStyle:"italic"}}>({showWin} kingdom)</p>

          {/* Divider */}
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${ac}40,transparent)`,margin:"16px auto",width:200}}/>

          {/* Info box */}
          <div style={{padding:"14px 28px",borderRadius:12,background:isWinner?"rgba(200,168,74,0.08)":"rgba(255,80,80,0.06)",border:`1px solid ${isWinner?"rgba(200,168,74,0.2)":"rgba(255,80,80,0.18)"}`,marginBottom:36,display:"inline-block"}}>
            <p style={{margin:0,fontSize:15,color:isWinner?"rgba(212,168,67,.85)":"rgba(255,140,140,.7)",fontStyle:"italic"}}>
              {isWinner?"🏆 The Golden Crown has been claimed":"💀 Your Kingdom has fallen"}
            </p>
            <p style={{margin:"6px 0 0",fontSize:12,color:"rgba(180,160,120,.4)"}}>
              {isWinner?"Last Kingdom Standing":"All pieces eliminated"}
            </p>
          </div>

          {/* Buttons */}
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button onClick={onLobby} style={{padding:"14px 40px",borderRadius:14,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",fontSize:12,background:`linear-gradient(135deg,${ac},${ac}88)`,color:"#0a0d14",border:"none",cursor:"pointer",fontFamily:"'Cinzel',Georgia,serif",boxShadow:`0 8px 30px ${gl}`}}>← Return to Lobby</button>
            <button onClick={onPlayAgain} style={{padding:"14px 40px",borderRadius:14,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",fontSize:12,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)",border:"1px solid rgba(255,255,255,.12)",cursor:"pointer",fontFamily:"'Cinzel',Georgia,serif"}}>Play Again</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
interface Props{myColor:PlayerColor;roomId:string;playerNames:Record<PlayerColor,string>;socket?:any;onGameEnd?:(w:PlayerColor)=>void;}

export default function Board12x12({myColor,roomId,playerNames,socket,onGameEnd}:Props){
  const [gs,setGs]=useState<GameState12>(createInitialGameState12());
  const [chat,setChat]=useState<ChatMsg[]>([]);
  const [animSq,setAnimSq]=useState<Square12|null>(null);
  const [showWin,setShowWin]=useState<PlayerColor|null>(null);
  const [sqSize,setSqSize]=useState(44);
  const [moveToast,setMoveToast]=useState<"great"|"risky"|"normal"|null>(null);
  const [elimPopup,setElimPopup]=useState<PlayerColor|null>(null);
  const [spellEffect,setSpellEffect]=useState<"sleep"|"teleport"|"wish"|"axe"|null>(null);
  const [greatSq,setGreatSq]=useState<Square12|null>(null);
  const [riskySq,setRiskySq]=useState<Square12|null>(null);
  const [showRules,setShowRules]=useState(false);
  const [showQuitConfirm,setShowQuitConfirm]=useState(false);
  const [isMobile,setIsMobile]=useState(false);

  const gsRef=useRef(gs);
  useEffect(()=>{gsRef.current=gs;},[gs]);
  const isElim=gs.eliminatedPlayers.includes(myColor);

  // Winner check
  useEffect(()=>{
    if(gs.status==="finished"&&gs.winner){setShowWin(gs.winner);snd("win");}
  },[gs]);

  // Resize
  useEffect(()=>{
    const calc=()=>{
      const mobile=window.innerWidth<=768; setIsMobile(mobile);
      const a=mobile?Math.min(window.innerWidth-60,390):Math.min(window.innerWidth-520,window.innerHeight-200,600);
      setSqSize(Math.max(Math.floor(a/12),mobile?24:28));
    };
    calc(); window.addEventListener("resize",calc); return()=>window.removeEventListener("resize",calc);
  },[]);

  const boardPx=sqSize*12;

  const showMoveFeedback=(ns:GameState12,to:Square12)=>{
    const q=ns.lastMoveQuality;
    if(q==="great"){setGreatSq(to);snd("great");setTimeout(()=>setGreatSq(null),1500);}
    else if(q==="risky"){setRiskySq(to);snd("risky");setTimeout(()=>setRiskySq(null),1500);}
    setMoveToast(q);
    if(ns.justEliminated)setTimeout(()=>setElimPopup(ns.justEliminated),400);
  };

  // ─── SOCKET ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!socket)return;
    socket.on("game:move",({newState}:{newState:GameState12})=>{
      const prev=gsRef.current;
      const pc=Object.values(prev.capturedBy).flat().length;
      const nc=Object.values(newState.capturedBy).flat().length;
      if(newState.eliminatedPlayers.length>prev.eliminatedPlayers.length){snd("eliminate");if(newState.justEliminated)setTimeout(()=>setElimPopup(newState.justEliminated),400);}
      else if(newState.specialMode==="executioner-axe-swing")snd("axe");
      else if(newState.spellMessage)snd("spell");
      else snd(nc>pc?"capture":"move");
      if(newState.lastMove){setAnimSq(newState.lastMove.to);setTimeout(()=>setAnimSq(null),450);}
      setGs(newState);
      if(newState.status==="finished"&&newState.winner)setTimeout(()=>{setShowWin(newState.winner);snd("win");},400);
    });
    socket.on("game:chat",(msg:ChatMsg)=>setChat(p=>[...p,msg]));
    socket.on("game:quit",({winner,newState}:{winner:PlayerColor;newState:GameState12})=>{
      setGs(newState);
      setShowQuitConfirm(false);
      setTimeout(()=>{setShowWin(winner);snd("win");},250);
    });
    return()=>{socket.off("game:move");socket.off("game:chat");socket.off("game:quit");};
  },[socket]);

  // ─── SPECIAL ACTIONS ─────────────────────────────────────────────────────
  const handleSpecial=useCallback((action:string,data?:any)=>{
    const state=gsRef.current; let ns:GameState12;
    if(action==="spell-sleep"){ns={...cloneState12(state),specialMode:"sorceress-sleep-select",spellMessage:"Click any enemy piece to sleep (3 rounds)"};}
    else if(action==="spell-teleport"){ns={...cloneState12(state),specialMode:"sorceress-teleport-select",spellMessage:"Click any piece to teleport it"};}
    else if(action==="spell-wish"){
      const roll=rollWishDice();ns=cloneState12(state);ns.wishDiceResult=roll;
      const sSq=findSorceress(state.board,myColor);
      if(sSq){const s=ns.board[sSq.row][sSq.col]!;const nsp=s.sorceressSpellsLeft-1;if(nsp<=0)ns.board[sSq.row][sSq.col]=null;else ns.board[sSq.row][sSq.col]={...s,sorceressSpellsLeft:nsp};}
      setSpellEffect("wish");
    }else if(action==="wizard-teleport"){ns={...cloneState12(state),specialMode:"wizard-teleport-select-piece",spellMessage:"Click any piece to teleport via Wizard"};}
    else if(action==="mage-sacrifice"&&data){const b=applyMageSacrifice(state.board,data.mageSq,data.queenSq);ns=advanceTurn({...cloneState12(state),board:b});setSpellEffect("teleport");}
    else if(action==="wish-success"){ns={...cloneState12(state),wishDiceResult:null,specialMode:"wizard-teleport-select-piece",spellMessage:"Wish granted! Move any piece anywhere"};}
    else if(action==="wish-fail"){ns=advanceTurn(cloneState12(state));}
    else return;
    setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
    if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
  },[myColor,roomId,socket,onGameEnd]);

  const cancelSpecial=useCallback(()=>{
    const state=gsRef.current;
    const ns={...cloneState12(state),specialMode:null as any,specialData:null,spellMessage:null,wishDiceResult:null,selectedSquare:null,validMoves:[]};
    setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
  },[roomId,socket]);

  // ─── CLICK HANDLER ────────────────────────────────────────────────────────
  const handleClick=useCallback((row:number,col:number)=>{
    const state=gsRef.current;
    if(state.status==="finished"||state.currentTurn!==myColor||isElim)return;
    const {board,selectedSquare,validMoves,specialMode}=state;
    const cp=board[row][col]; const sq:Square12={row,col};
    snd("click");

    if(specialMode==="sorceress-sleep-select"){
      if(cp&&cp.color!==myColor){const sSq=findSorceress(board,myColor)!;const nb=applySleepSpell(board,sq,sSq);const ns=advanceTurn({...cloneState12(state),board:nb});setSpellEffect("sleep");setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}return;
    }
    if(specialMode==="sorceress-teleport-select"){
      if(!state.specialData){if(cp)setGs({...cloneState12(state),specialData:{pieceSq:sq},spellMessage:"Now click destination square."});return;}
      if(!cp||cp.color!==myColor){const sSq=findSorceress(board,myColor)!;const nb=applyTeleportSpell(board,state.specialData.pieceSq,sq,sSq);const ns=advanceTurn({...cloneState12(state),board:nb});setSpellEffect("teleport");setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}return;
    }
    if(specialMode==="wizard-teleport-select-piece"){if(cp)setGs({...cloneState12(state),specialMode:"wizard-teleport-select-dest",specialData:{pieceSq:sq},spellMessage:"Now click destination."});return;}
    if(specialMode==="wizard-teleport-select-dest"){
      if(!cp){const nb=applyWizardTeleport(board,state.specialData.pieceSq,sq);const ns=advanceTurn({...cloneState12(state),board:nb});setSpellEffect("teleport");setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}return;
    }
    if(specialMode==="executioner-axe-swing"){
      const exSq=state.pendingAxeSquare!; const ax=getAxeSwingSquares(board,exSq.row,exSq.col,myColor);
      if(ax.some(s=>sq12Eq(s,sq))){const ns=applyAxeSwing(state,sq);setSpellEffect("axe");setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}
      else{const ns=advanceTurn(cloneState12(state));setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}
      return;
    }
    if(specialMode==="super-queen-second-move"){
      if(selectedSquare&&validMoves.some(m=>sq12Eq(m,sq))){
        const ns2=cloneState12(state); const p2=ns2.board[selectedSquare.row][selectedSquare.col]!; const t2=ns2.board[sq.row][sq.col];
        if(t2)ns2.capturedBy[p2.color].push(t2); ns2.board[sq.row][sq.col]=p2; ns2.board[selectedSquare.row][selectedSquare.col]=null; ns2.lastMove={from:selectedSquare,to:sq};
        const final=advanceTurn(ns2);snd("move");setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);setGs(final);socket?.emit("game:move",{roomId,newState:final});
        if(final.status==="finished"&&final.winner){setTimeout(()=>{setShowWin(final.winner);snd("win");},400);onGameEnd?.(final.winner!);}
      }return;
    }
    if(selectedSquare&&validMoves.some(m=>sq12Eq(m,sq))){
      const ns=executeMove12(state,selectedSquare,sq);
      setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);
      showMoveFeedback(ns,sq);
      setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
      if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
      return;
    }
    if(cp&&cp.color===myColor&&cp.sleepRoundsLeft===0){snd("select");const moves=getLegalMoves12(board,row,col,state.turnOrder);setGs(prev=>({...prev,selectedSquare:sq,validMoves:moves}));return;}
    setGs(prev=>({...prev,selectedSquare:null,validMoves:[]}));
  },[myColor,roomId,socket,onGameEnd,isElim]);

  // ─── QUIT ────────────────────────────────────────────────────────────────
  const handleQuit=useCallback(()=>{
    const winner=(gsRef.current.currentTurn!==myColor&&!gsRef.current.eliminatedPlayers.includes(gsRef.current.currentTurn))
      ?gsRef.current.currentTurn
      :((["white","black","grey"] as PlayerColor[]).find(c=>c!==myColor&&!gsRef.current.eliminatedPlayers.includes(c))||(myColor==="white"?"black":"white"));
    const ns:GameState12={...cloneState12(gsRef.current),status:"finished",winner,check:null,selectedSquare:null,validMoves:[],specialMode:null as any,specialData:null,spellMessage:null,wishDiceResult:null};
    setShowQuitConfirm(false);
    setGs(ns);
    // Each player sees their own result: quitter sees defeat, others see their result via socket
    setShowWin(winner);
    snd("win");
    socket?.emit("game:quit",{roomId,quitter:myColor,winner,newState:ns});
    onGameEnd?.(winner);
  },[myColor,roomId,socket,onGameEnd]);

  const sendChat=(text:string)=>{const msg:ChatMsg={sender:myColor,text,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};setChat(p=>[...p,msg]);socket?.emit("game:chat",{roomId,msg});};

const rows=myColor==="black"?[...Array(12)].map((_,i)=>11-i):[...Array(12)].map((_,i)=>i);
const cols=[...Array(12)].map((_,i)=>i);

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
        @keyframes checkFlash{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes dotPop{0%{opacity:0;transform:scale(.2)}80%{transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}
        @keyframes pieceIn{0%{opacity:.3;transform:scale(.65) translateY(-10px)}65%{transform:scale(1.08) translateY(1px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes greatGlow{0%,100%{filter:drop-shadow(0 0 8px #FFD700)}50%{filter:drop-shadow(0 0 20px #FFD700) drop-shadow(0 0 40px #FFD700)}}
        @keyframes riskyShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes winPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spellParticle0{0%{opacity:1;transform:translate(-50%,-50%) rotate(0deg) translateY(-60px) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(0deg) translateY(-120px) scale(0)}}
        @keyframes spellParticle1{0%{opacity:1;transform:translate(-50%,-50%) rotate(120deg) translateY(-60px) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(120deg) translateY(-120px) scale(0)}}
        @keyframes spellParticle2{0%{opacity:1;transform:translate(-50%,-50%) rotate(240deg) translateY(-60px) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(240deg) translateY(-120px) scale(0)}}
        @keyframes sleepBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes rulesIn{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes float3d{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-4px) rotateY(12deg)}}
        .sq{position:relative;overflow:hidden;cursor:pointer;}
        .sq:hover{filter:brightness(1.15);}
        .piece-icon{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;font-size:28px;flex-shrink:0;position:relative;animation:float3d 3s ease-in-out infinite;user-select:none;}
        .rule-card{padding:16px 18px;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(212,168,67,.1);transition:border-color .2s,background .2s;display:flex;gap:16px;align-items:flex-start;}
        .rule-card:hover{background:rgba(212,168,67,.05);border-color:rgba(212,168,67,.22);}
        .rules-scroll::-webkit-scrollbar{width:4px;}
        .rules-scroll::-webkit-scrollbar-track{background:transparent;}
        .rules-scroll::-webkit-scrollbar-thumb{background:rgba(212,168,67,.25);border-radius:4px;}
      `}</style>

      <video autoPlay loop muted playsInline style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",objectFit:"cover",zIndex:0,pointerEvents:"none"}}>
        <source src="https://www.pexels.com/download/video/10586247/" type="video/mp4"/>
      </video>

      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% -5%,#141828 0%,#080b14 50%,#030407 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"190px 16px 24px":"16px 20px",gap:18,flexWrap:"wrap",fontFamily:"'Cinzel',Georgia,serif"}}>

        {/* ── LEFT PANEL ── */}
        <div style={{display:"flex",flexDirection:"column",gap:9,width:205,flexShrink:0,animation:"fadeInUp .4s ease"}}>
          {(["white","black"] as PlayerColor[]).map(c=>(
            <PlayerCard key={c} name={playerNames[c]||c} color={c} isMe={c===myColor} isActive={gs.currentTurn===c} isElim={gs.eliminatedPlayers.includes(c)} captured={gs.capturedBy[c]} inCheck={gs.check===c}/>
          ))}

          {/* Turn indicator */}
          <div style={{borderRadius:14,padding:"11px 15px",background:gs.check===myColor?"rgba(255,60,60,.1)":gs.currentTurn===myColor?`${AC[myColor]}0c`:"rgba(0,0,0,.35)",border:`1px solid ${gs.check===myColor?"rgba(255,80,80,.28)":gs.currentTurn===myColor?AC[myColor]+"28":"rgba(255,255,255,.05)"}`,display:"flex",alignItems:"center",gap:10,boxShadow:gs.currentTurn===myColor?`0 0 20px ${GL[myColor]}`:"none",transition:"all .3s"}}>
            <span style={{fontSize:18}}>{gs.check===myColor?"⚠️":gs.currentTurn===myColor?"⚔️":"⏳"}</span>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:gs.check===myColor?"#ff8080":gs.currentTurn===myColor?AC[myColor]:"rgba(180,140,60,.45)"}}>{gs.check===myColor?"Check!":gs.currentTurn===myColor?"Your Move":`${gs.currentTurn}'s Turn`}</p>
              <div style={{display:"flex",gap:5,marginTop:4}}>
                {(["white","black"] as PlayerColor[]).map(c=>(
                  <div key={c} title={c} style={{width:7,height:7,borderRadius:"50%",background:gs.eliminatedPlayers.includes(c)?"rgba(255,50,50,.2)":gs.currentTurn===c?AC[c]:`${AC[c]}30`,boxShadow:gs.currentTurn===c?`0 0 6px ${GL[c]}`:"none",transition:"all .3s"}}/>
                ))}
              </div>
            </div>
          </div>

          <MoveToast quality={moveToast} onDone={()=>setMoveToast(null)}/>

          {/* Buttons */}
          <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",marginTop:8,zIndex:20,position:"relative"}}>
            <button onClick={()=>setShowRules(true)} style={{width:"100%",height:50,background:"#080a08",color:"#4ade80",border:"1px solid rgba(74,222,128,.35)",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".1em",textTransform:"uppercase",fontFamily:"'Cinzel',Georgia,serif",boxShadow:"0 0 18px rgba(74,222,128,.25),0 4px 16px rgba(0,0,0,.7),inset 0 1px 0 rgba(74,222,128,.15)",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(74,222,128,.08)";e.currentTarget.style.borderColor="rgba(74,222,128,.6)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#080a08";e.currentTarget.style.borderColor="rgba(74,222,128,.35)";}}>
              Game Rules
            </button>
            <button onClick={()=>setShowQuitConfirm(true)} style={{width:"100%",height:50,background:"#080808",color:"#f87171",border:"1px solid rgba(248,113,113,.3)",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".1em",textTransform:"uppercase",fontFamily:"'Cinzel',Georgia,serif",boxShadow:"0 0 18px rgba(248,113,113,.2),0 4px 16px rgba(0,0,0,.7),inset 0 1px 0 rgba(248,113,113,.1)",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(248,113,113,.07)";e.currentTarget.style.borderColor="rgba(248,113,113,.55)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#080808";e.currentTarget.style.borderColor="rgba(248,113,113,.3)";}}>
              Quit Game
            </button>
          </div>
        </div>

        {/* ── BOARD ── */}
        <div style={{flexShrink:0,animation:"fadeInUp .5s ease",marginTop:82}}>
          <div style={{textAlign:"center",marginBottom:4,fontSize:10,color:`${AC.black}60`,letterSpacing:".12em",textTransform:"uppercase"}}>▼ {playerNames.black||"BLACK"}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{display:"flex",flexDirection:"column",gap:0,marginRight:2}}>
              {rows.map((r,i)=><div key={i} style={{height:sqSize,display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:9,color:"rgba(212,168,67,.35)",fontFamily:"monospace",width:14}}>{12-r}</div>)}
            </div>
            <div style={{position:"relative",borderRadius:12,background:"linear-gradient(145deg,#2a1c08,#160e04,#0c0702,#160e04,#2a1c08)",boxShadow:["0 0 0 1px rgba(70,45,8,.9)","0 0 0 2px rgba(212,168,67,.35)","0 0 0 3px rgba(50,30,3,.95)","0 0 50px rgba(120,100,50,.08)","0 24px 70px rgba(0,0,0,.95)","inset 0 1px 0 rgba(212,168,67,.18)"].join(",")}}>
              {[{top:5,left:5},{top:5,right:5},{bottom:5,left:5},{bottom:5,right:5}].map((p,i)=>(
                <div key={i} style={{position:"absolute",...p as any,width:11,height:11,background:"rgba(212,168,67,.12)",border:"1.5px solid rgba(212,168,67,.45)",borderRadius:2,transform:"rotate(45deg)"}}/>
              ))}
              <div style={{display:"grid",gridTemplateColumns:`repeat(12,${sqSize}px)`,gridTemplateRows:`repeat(12,${sqSize}px)`,borderRadius:6,overflow:"hidden",border:"1px solid rgba(0,0,0,.9)",boxShadow:"inset 0 0 40px rgba(0,0,0,.6)",margin:8}}>
                {rows.map(row=>cols.map(col=>{
                  const piece=gs.board[row][col]; const sq={row,col};
                  const isLight=(row+col)%2===0;
                  const isSel=!!gs.selectedSquare&&sq12Eq(gs.selectedSquare,sq);
                  const isValid=gs.validMoves.some(m=>sq12Eq(m,sq));
                  const isLF=!!gs.lastMove&&sq12Eq(gs.lastMove.from,sq);
                  const isLT=!!gs.lastMove&&sq12Eq(gs.lastMove.to,sq);
                  const isChk=piece?.type==="mystic-king"&&piece.color===gs.check;
                  const isAnim=!!animSq&&sq12Eq(animSq,sq);
                  const isGreat=!!greatSq&&sq12Eq(greatSq,sq);
                  const isRisky=!!riskySq&&sq12Eq(riskySq,sq);
                  const zone=getZone(row,col);
                  const isAxeT=gs.specialMode==="executioner-axe-swing"&&gs.pendingAxeSquare&&getAxeSwingSquares(gs.board,gs.pendingAxeSquare.row,gs.pendingAxeSquare.col,myColor).some(s=>sq12Eq(s,sq));
                  const baseBg=isLight?"#cdb088":"#553618";
                  let ov="";
                  if(isSel)ov="rgba(212,168,67,.55)";
                  else if(isChk)ov="rgba(220,40,40,.6)";
                  else if(isGreat)ov="rgba(255,215,0,.25)";
                  else if(isRisky)ov="rgba(255,60,60,.25)";
                  else if(isLF||isLT)ov="rgba(212,168,67,.2)";
                  else if(isAxeT)ov="rgba(255,80,0,.45)";
                  return(
                    <div key={`${row}-${col}`} className="sq" onClick={()=>handleClick(row,col)} style={{width:sqSize,height:sqSize,background:baseBg}}>
                      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",background:isLight?"linear-gradient(135deg,rgba(255,255,255,.1) 0%,transparent 55%)":"linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(0,0,0,.2) 100%)"}}/>
                      {zone&&!isSel&&!isChk&&!ov&&<div style={{position:"absolute",inset:0,zIndex:0,background:ZONE[zone],pointerEvents:"none"}}/>}
                      {ov&&<div style={{position:"absolute",inset:0,zIndex:1,background:ov,pointerEvents:"none"}}/>}
                      {piece&&piece.sleepRoundsLeft>0&&<div style={{position:"absolute",top:1,right:2,zIndex:5,fontSize:sqSize*.23,animation:"sleepBob 2s ease-in-out infinite",pointerEvents:"none"}}>💤</div>}
                      {isValid&&!piece&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:sqSize*.3,height:sqSize*.3,borderRadius:"50%",background:"rgba(212,168,67,.68)",boxShadow:"0 0 14px rgba(212,168,67,.5)",animation:"dotPop .14s ease both",pointerEvents:"none",zIndex:4}}/>}
                      {isValid&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"3px solid rgba(212,168,67,.82)",borderRadius:3,boxShadow:"inset 0 0 8px rgba(212,168,67,.25)",animation:"dotPop .14s ease both",pointerEvents:"none"}}/>}
                      {isAxeT&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"3px solid rgba(255,80,0,.85)",borderRadius:3,animation:"dotPop .14s ease both",pointerEvents:"none"}}/>}
                      {isGreat&&<div style={{position:"absolute",inset:0,zIndex:4,borderRadius:3,border:"2px solid rgba(255,215,0,.6)",boxShadow:"inset 0 0 16px rgba(255,215,0,.2)",pointerEvents:"none"}}/>}
                      {isRisky&&<div style={{position:"absolute",inset:0,zIndex:4,borderRadius:3,border:"2px solid rgba(255,60,60,.6)",boxShadow:"inset 0 0 16px rgba(255,60,60,.2)",pointerEvents:"none"}}/>}
                      {piece&&<PieceImg piece={piece} sqSize={sqSize} isAnim={isAnim} isGreat={isGreat} isRisky={isRisky}/>}
                    </div>
                  );
                }))}
              </div>
            </div>

          </div>
          <div style={{display:"flex",marginLeft:20,marginTop:4,width:boardPx}}>
            {cols.map((c,i)=><div key={i} style={{width:sqSize,textAlign:"center",fontSize:9,color:"rgba(212,168,67,.3)",fontFamily:"monospace"}}>{String.fromCharCode(65+c)}</div>)}
          </div>
          <div style={{textAlign:"center",marginTop:4,fontSize:10,color:`${AC.white}55`,letterSpacing:".12em",textTransform:"uppercase",marginLeft:20}}>▲ {playerNames.white||"WHITE"}</div>
          <SpecialPanel gs={gs} myColor={myColor} onAction={handleSpecial} onCancel={cancelSpecial}/>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{display:"flex",flexDirection:"column",gap:9,width:260,flexShrink:0,animation:"fadeInUp .4s ease",position:"relative",zIndex:20}}>
          <div style={{height:260}}>
            <ChatPanel myColor={myColor} messages={chat} onSend={sendChat}/>
          </div>
          <GuidePanel myColor={myColor} gs={gs}/>
          <button onClick={()=>{if(gs.currentTurn!==myColor||gs.status!=="playing")return;const ns=advanceTurn(cloneState12(gsRef.current));setGs(ns);socket?.emit("game:move",{roomId,newState:ns});snd("click");}}
            style={{width:"100%",minHeight:52,padding:"12px 14px",borderRadius:14,background:gs.currentTurn===myColor&&gs.status==="playing"?"linear-gradient(135deg,rgba(9,95,190,.28),rgba(35,35,90,.42))":"linear-gradient(135deg,rgba(4,40,48,.65),rgba(18,18,24,.78))",border:gs.currentTurn===myColor&&gs.status==="playing"?"1px solid rgba(150,150,255,.45)":"1px solid rgba(255,255,255,.12)",color:gs.currentTurn===myColor&&gs.status==="playing"?"#c7c9ff":"rgba(220,220,235,.42)",fontSize:12,cursor:gs.currentTurn===myColor&&gs.status==="playing"?"pointer":"default",fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"'Cinzel',Georgia,serif",boxShadow:gs.currentTurn===myColor&&gs.status==="playing"?"0 0 22px rgba(120,120,255,.24),0 8px 24px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12)":"0 8px 22px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.06)",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <span style={{fontSize:17}}>⏭️</span>
            <span>{gs.currentTurn===myColor&&gs.status==="playing"?"Pass Turn":"Wait Turn"}</span>
          </button>
        </div>

        {/* ── OVERLAYS ── */}
        {elimPopup&&<EliminationPopup eliminated={elimPopup} playerNames={playerNames} onClose={()=>setElimPopup(null)}/>}
        <SpellParticles type={spellEffect} onDone={()=>setSpellEffect(null)}/>

        {/* ── GAME RULES ── */}
        {showRules&&(
          <div style={{position:"fixed",inset:0,zIndex:110,background:"rgba(0,0,0,.88)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0px",animation:"rulesIn .3s cubic-bezier(.22,1,.36,1)"}}>
            <div className="rules-scroll" style={{width:"min(740px,96vw)",maxHeight:"88vh",overflowY:"auto",borderRadius:28,padding:"32px 18px 28px",background:"linear-gradient(155deg,#0e0902 0%,#1a1005 40%,#0e0902 100%)",border:"1px solid rgba(212,168,67,.22)",boxShadow:"0 0 0 1px rgba(212,168,67,.06),0 0 60px rgba(212,168,67,.1),0 40px 100px rgba(0,0,0,.9),inset 0 1px 0 rgba(212,168,67,.15)",fontFamily:"'Cinzel',Georgia,serif",position:"relative",overflowX:"hidden"}}>
              <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:260,height:1,background:"linear-gradient(90deg,transparent,rgba(212,168,67,.6),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:26}}>
                <div>
                  <div style={{fontSize:10,letterSpacing:".25em",textTransform:"uppercase",color:"rgba(212,168,67,.5)",marginBottom:4}}>Dominion of Kingdom</div>
                  <h2 style={{margin:0,fontSize:26,fontWeight:700,letterSpacing:".05em",background:"linear-gradient(135deg,#e8c96a 0%,#f5e09a 40%,#c8a030 100%)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite"}}>⚔️ 12x12 Game Rules</h2>
                </div>
                <button onClick={()=>setShowRules(false)} style={{width:42,height:42,borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>
              <div style={{display:"grid",gap:14}}>
                {[["👑","Victory Condition","Eliminating the King does NOT end the game. You win only when all of your opponent's pieces are completely eliminated from the board."],
                  ["⚔️","Core Objective","Your goal is to strategically capture every enemy piece while protecting your own. Focus on controlling space and removing threats gradually."],
                  ["🧠","Player Strategy","Develop your pieces early and control the center of the board. Use powerful units wisely and avoid exposing important characters too soon."],
                  ["🛡️","Defensive Play","If you are losing pieces, switch to defensive positioning. Protect key units and look for counter-attacks instead of direct engagement."],
                  ["🔥","Endgame Strategy","In the final phase, focus on trapping remaining enemy pieces. Coordinate your units to restrict movement and finish the game efficiently."],
                  ["🏳️","Forfeit Rule","If a player quits the match, the opponent is automatically declared the winner."],
                ].map(([icon,title,desc])=>(
                  <div key={title} className="rule-card">
                    <span className="piece-icon">{icon}</span>
                    <div>
                      <h3 style={{margin:"0 0 7px",color:"#e8dfc0",fontSize:16}}>{title}</h3>
                      <p style={{margin:0,color:"#d7c29a",lineHeight:1.7,fontSize:14}}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── QUIT CONFIRM ── */}
        {showQuitConfirm&&(
          <div style={{position:"fixed",inset:0,zIndex:115,background:"rgba(0,0,0,.88)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"rulesIn .25s cubic-bezier(.22,1,.36,1)"}}>
            <div style={{width:"min(460px,92vw)",borderRadius:28,padding:"34px 26px",background:"linear-gradient(155deg,#120606 0%,#2a0e0e 45%,#120606 100%)",border:"1px solid rgba(255,100,100,.25)",boxShadow:"0 0 0 1px rgba(255,80,80,.06),0 0 60px rgba(255,80,80,.12),0 40px 100px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.08)",textAlign:"center",fontFamily:"'Cinzel',Georgia,serif"}}>
              <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 18px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,background:"linear-gradient(135deg,rgba(255,80,80,.18),rgba(120,20,20,.25))",border:"1px solid rgba(255,120,120,.28)",boxShadow:"0 0 24px rgba(255,80,80,.16)",animation:"float3d 3s ease-in-out infinite"}}>🏳️</div>
              <h2 style={{margin:"0 0 10px",color:"#ff9d9d",fontSize:28,letterSpacing:".04em"}}>Surrender?</h2>
              <p style={{margin:"0 0 24px",color:"rgba(255,220,220,.78)",lineHeight:1.7,fontSize:14}}>Your opponent will be declared the victor if you leave now.</p>
              <div style={{display:"flex",justifyContent:"center",gap:12}}>
                <button onClick={()=>setShowQuitConfirm(false)} style={{padding:"13px 24px",borderRadius:14,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",color:"#ddd",cursor:"pointer",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",fontSize:11,fontFamily:"'Cinzel',Georgia,serif"}}>Stay</button>
                <button onClick={handleQuit} style={{padding:"13px 24px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#d9534f,#8f1f1f)",color:"#fff",cursor:"pointer",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",fontSize:11,fontFamily:"'Cinzel',Georgia,serif",boxShadow:"0 10px 30px rgba(217,83,79,.28)"}}>Yes, Quit</button>
              </div>
            </div>
          </div>
        )}

        {/* ── WIN / DEFEAT SCREEN ── */}
        {showWin&&(
          <EndScreen
            showWin={showWin}
            myColor={myColor}
            playerNames={playerNames}
            onLobby={()=>window.location.href="/lobby"}
            onPlayAgain={()=>{setGs(createInitialGameState12());setShowWin(null);}}
          />
        )}
      </div>
    </>
  );
}

function playSound(type:string){snd(type);}