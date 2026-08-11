  "use client";
  import { useEffect, useRef, useState, useCallback } from "react";
  import type { GameState16, Square16, PlayerColor16, PieceType16, Piece16 } from "@/lib/game/rules-16x16";
  import {
    createInitialGameState16, getLegalMoves16, executeMove16, advanceTurn16,
    sq16Eq, pieceImagePath16, findSorceress16, findWizard16, findConjurer16,
    applySleepSpell16, applyTeleportSpell16, applyWizardTeleport16,
    applyMageSacrifice16, applyAxeSwing16, applyWarlockBind16, applyThiefSteal16,
    getAxeSwingSquares16, rollWishDice16, cloneState16,
    getThiefStealTargets16, applyTricksterTeleport16, getLegalPaladinSuperMoves16,
    getLegalBerserkerRampageTargets16, applyBerserkerRampage16, applyShadowSummon16,
    getLegalCastleMoves16, executeCastle16,
  } from "@/lib/game/rules-16x16";
  import Fireworks from "@/components/game/fireworks";

  // ─── CONSTANTS ────────────────────────────────────────────────────────────────
  const EMOJI: Record<PieceType16, string> = {
    "mystic-king":"👑","super-queen":"🌟","dragon":"🐉","gargoyle":"👹","wizard":"🧙",
    "sorceress":"🔮","conjurer":"✨","warlock":"🌑","trickster":"🃏","thief":"🗝️",
    "super-knight":"⚔️","assassin":"🗡️","executioner":"🪓","cavalier":"🏇",
    "mage":"💫","elvin-archer":"🏹","paladin":"🛡️","archer":"🎯","aerobat-assassin":"🦅",
    "berserker":"😈",
  };

  // Rules/guide icons use the single-portrait art in public/all-characters —
  // no color variant needed since these badges are purely illustrative.
  const GUIDE_ICON_FILE_16: Partial<Record<PieceType16,string>> = {
    "mystic-king":"Mystic King", "super-queen":"Super Queen", "dragon":"Dragon",
    "gargoyle":"Gargoyle", "wizard":"Wizard", "sorceress":"Sorceress",
    "conjurer":"Conjurer", "warlock":"Warlock", "trickster":"Trickster", "thief":"Thief",
    "super-knight":"Super Knight", "elvin-archer":"Elven Archer", "executioner":"Executioner",
    "assassin":"Assassin", "cavalier":"Cavalier Prince", "mage":"Mage-Princess", "archer":"Archer",
    "aerobat-assassin":"Acrobat Assassin", "paladin":"Paladin", "berserker":"Beserker",
  };
  function guideIconPath16(type: PieceType16): string {
    const nm = GUIDE_ICON_FILE_16[type];
    if (nm) return `/all-characters/${nm}.png`;
    return pieceImagePath16({ type, color:"white" } as Piece16);
  }
  function GuideIcon16({ type }: { type: PieceType16 }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <>{EMOJI[type]}</>;
    return <img src={guideIconPath16(type)} alt={type} onError={() => setFailed(true)}
      style={{ width:"82%", height:"82%", objectFit:"contain", pointerEvents:"none" }}/>;
  }

  // Spell chips reuse the Battle Guide's portrait art so each spell shows the
  // casting character instead of a bare emoji; falls back to the spell's own
  // emoji if the art is missing — no game logic involved, purely cosmetic.
  function SpellPieceIcon16({ pieceKey, fallback }: { pieceKey: PieceType16; fallback: string }) {
    const [failed, setFailed] = useState(false);
    const nm = GUIDE_ICON_FILE_16[pieceKey];
    if (failed || !nm) return <>{fallback}</>;
    return <img src={`/all-characters/${nm}.png`} alt={pieceKey} onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />;
  }

  const PIECE_INFO: Record<PieceType16,{name:string;move:string;special:string}> = {

    "mystic-king":    {name:"Mystic King",    move:"Moves in an L-shape, plus 1 square in any direction",            special:"Wizard Morph — the Wizard sacrifices itself so the King can be granted one last wish"},
    "super-queen":    {name:"Super Queen",    move:"Moves in any direction, unlimited distance",       special:"Gains a double move while the Sorceress is alive; sacrificing the Mage restores the Super Queen to full power"},
    "dragon":         {name:"Dragon",         move:"Moves in any direction, unlimited distance, plus a 1-square special attack",  special:"Can fly over its own pieces to make a kill"},
    "gargoyle":       {name:"Gargoyle",       move:"Wing and Tail Attack: 1 square in any direction",  special:"Fire Attack: 2 squares in any direction"},
    "wizard":         {name:"Wizard",         move:"Moves in any direction (ethereal — cannot kill non-ethereal pieces)",   special:"Teleports any piece by touching it"},
    "sorceress":      {name:"Sorceress",      move:"Moves in any direction (ethereal — cannot kill non-ethereal pieces)",        special:"Casts one of three spells: 😴 Sleep for 3 rounds, 🌀 Teleport, or ⭐ Wish Dice"},
    "conjurer":       {name:"Conjurer",       move:"Moves in any direction, unlimited distance (ethereal)",   special:"Brings back 1 of its own dead pieces"},
    "warlock":        {name:"Warlock",        move:"Moves in any direction, unlimited distance (ethereal)",   special:"After moving, binds all enemy pieces in place for 1 round"},
    "trickster":      {name:"Trickster",      move:"Moves in any direction, unlimited distance (ethereal), like a Queen",   special:"Teleports any character to a new position (a reposition, not a kill). If it becomes its owner's last remaining piece, the opponent has 10 rounds to capture it or the board resets"},
    "thief":          {name:"Thief",          move:"Moves in any direction, unlimited distance",              special:"Jumps over another piece once to steal an enemy piece, ending up on the square it stole"},
    "super-knight":   {name:"Super Knight",   move:"Moves in an L-shape, with a double jump",          special:"Can perform two L-shape moves in a single turn"},
    "elvin-archer":   {name:"Elvin Archer",   move:"Moves in any direction, unlimited distance",              special:"Also strikes with an L-shape kill plus 1 square in any direction (sword and dagger mode)"},
    "executioner":    {name:"Executioner",    move:"Moves in straight lines only",            special:"After stopping, swings an axe to kill 1 adjacent enemy"},
    "assassin":       {name:"Assassin",       move:"Moves in any direction, plus an L-shape move, plus 1 square",    special:"Moves in an L-shape like a Cavalier, plus a 1-square Paladin-style kill"},
    "aerobat-assassin":{name:"Acrobat Assassin",move:"Moves in any direction, plus an L-shape move, plus 1 square",        special:"Jumps over any piece, even enemies, to perform its L-shape move"},
    "cavalier":       {name:"Cavalier/Prince",move:"Moves in an L-shape, plus 1 square in any direction",           special:"Always lands on the opposite color square"},
    "mage":           {name:"Mage/Princess",  move:"Moves in any direction, unlimited distance",        special:"Sacrifices itself to restore the Super Queen's full power"},
    "paladin":        {name:"Paladin",        move:"Normal Movement: 1 square in any direction",         special:"Super Move: a one-time 3-square surprise attack in any direction; after use, the Paladin returns to normal 1-square movement · Reverse Castle: swap with an ally"},
    "archer":         {name:"Archer",         move:"Moves in any direction, unlimited distance",        special:"Ranged arrow attacks — no special ability"},
    "berserker":      {name:"Berserker",      move:"Special summoned character — moves in any direction, unlimited distance, once summoned by the Conjurer",   special:"Can kill BOTH mortal and immortal/ethereal characters (immortals cannot kill it back). One-time Rampage attack cleaves through 2 adjacent aligned enemies in a single strike"},
  };

  const AC: Record<PlayerColor16,string> = { white:"#e8dfc0", black:"#c8a96e" };
  const GL: Record<PlayerColor16,string> = { white:"rgba(232,223,192,0.4)", black:"rgba(200,169,110,0.4)" };

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
        bind:{freq:[300,200,150],dur:.5,wave:"square"},steal:{freq:[600,400,200],dur:.4,wave:"sawtooth"},
        click:{freq:[600],dur:.05,wave:"sine"},
      };
      const s=S[type]||S.move; o.type=s.wave; const t=ctx.currentTime;
      s.freq.forEach((f:number,i:number)=>o.frequency.setValueAtTime(f,t+i*s.dur/s.freq.length));
      g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+s.dur);
      o.start(t);o.stop(t+s.dur);
    }catch{}
  }


  // ─── PIECE IMAGE ──────────────────────────────────────────────────────────────
  function PieceImg({piece,sqSize,isAnim,isGreat,isRisky}:{piece:Piece16;sqSize:number;isAnim:boolean;isGreat?:boolean;isRisky?:boolean}){
    const [failed,setFailed]=useState(false);
    const glow=isGreat?"drop-shadow(0 0 8px #FFD700)":isRisky?"drop-shadow(0 0 8px #FF4444)":"drop-shadow(0 3px 7px rgba(0,0,0,0.9))";
    if(failed)return<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sqSize*.42,userSelect:"none",pointerEvents:"none",zIndex:3,filter:glow}}>{EMOJI[piece.type]}</div>;
    return<img src={pieceImagePath16(piece)} alt={piece.type} onError={()=>setFailed(true)}
      style={{position:"absolute",top:"4%",left:"4%",width:"92%",height:"92%",objectFit:"contain",pointerEvents:"none",zIndex:3,display:"block",
        filter:`${glow}${piece.sleepRoundsLeft>0?" grayscale(0.8) opacity(0.6)":""}${piece.boundRoundsLeft>0?" sepia(1) hue-rotate(220deg)":""}`,
        animation:isAnim?"pieceIn .32s cubic-bezier(.22,1,.36,1) both":"none",transition:"filter .3s"}}/>;
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
      <div style={{width:"100%",minHeight:52,padding:"10px 13px",borderRadius:14,background:cfg.bg,border:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",gap:10,backdropFilter:"blur(12px)",animation:"fadeInUp .25s ease both"}}>
        <span style={{width:30,height:30,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.28)",border:`1px solid ${cfg.border}`,fontSize:15,flexShrink:0}}>{cfg.icon}</span>
        <div>
          <p style={{margin:0,fontSize:10,fontWeight:800,color:cfg.color,letterSpacing:".09em",textTransform:"uppercase"}}>{cfg.text}</p>
          <p style={{margin:"2px 0 0",fontSize:9,color:"rgba(230,210,170,.38)"}}>Strategy feedback</p>
        </div>
      </div>
    );
  }

  // ─── SPELL PARTICLES ─────────────────────────────────────────────────────────
  function SpellEffect({type,onDone}:{type:string|null;onDone:()=>void}){
    useEffect(()=>{if(type){const t=setTimeout(onDone,1400);return()=>clearTimeout(t);}else onDone();},[type]);
    if(!type)return null;
    const cfgs:Record<string,{emoji:string;color:string;label:string}>={
      sleep:{emoji:"💤",color:"#9090ff",label:"Sleep Spell!"},
      teleport:{emoji:"🌀",color:"#d080ff",label:"Teleport!"},
      wish:{emoji:"⭐",color:"#f0c040",label:"Wish Spell!"},
      axe:{emoji:"🪓",color:"#ff6030",label:"Axe Swing!"},
      bind:{emoji:"⛓️",color:"#8080ff",label:"Warlock Bind!"},
      conjure:{emoji:"✨",color:"#80ffb0",label:"Conjured!"},
      steal:{emoji:"🗝️",color:"#ffb030",label:"Stolen!"},
      shadow:{emoji:"🌑",color:"#b060ff",label:"Shadow Summon!"},
      rampage:{emoji:"💥",color:"#ff3030",label:"Berserker Rampage!"},
    };
    const cfg=cfgs[type]||cfgs.teleport;
    return(
      <div style={{position:"fixed",inset:0,zIndex:85,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {[...Array(10)].map((_,i)=>(
          <div key={i} style={{position:"absolute",top:"50%",left:"50%",fontSize:24,animationDelay:`${i*.06}s`,transform:`translate(-50%,-50%) rotate(${i*36}deg) translateY(-${50+Math.random()*50}px)`,opacity:0,animation:"spellPop .9s ease-out both"}}>{cfg.emoji}</div>
        ))}
        <div style={{padding:"12px 28px",borderRadius:50,background:`${cfg.color}22`,border:`1px solid ${cfg.color}60`,backdropFilter:"blur(12px)"}}>
          <span style={{fontSize:18,marginRight:8}}>{cfg.emoji}</span>
          <span style={{fontSize:14,fontWeight:700,color:cfg.color,letterSpacing:".1em"}}>{cfg.label}</span>
        </div>
      </div>
    );
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────────
 interface ChatMsg{sender:string;text:string;time:string}

function ChatPanel({myColor,messages,onSend}:{myColor:PlayerColor16;messages:ChatMsg[];onSend:(t:string)=>void}){
  const [input,setInput]=useState("");
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const send=()=>{
    if(!input.trim())return;
    onSend(input.trim());
    setInput("");
  };

  const ac=AC[myColor];

  return(
    <div style={{
      display:"flex",
      flexDirection:"column",
      height:"100%",
      width:"100%",
      minWidth:0,
      background:"linear-gradient(145deg,rgba(0,0,0,.94),rgba(10,10,12,.92),rgba(0,0,0,.96))",
      borderRadius:18,
      border:"1px solid rgba(255,255,255,.10)",
      overflow:"hidden",
      boxShadow:"0 18px 44px rgba(0,0,0,.68), inset 0 1px 0 rgba(255,255,255,.10)",
      fontFamily:"'Cinzel',Georgia,serif"
    }}>
      {/* Header */}
      <div style={{
        padding:"12px 14px",
        borderBottom:"1px solid rgba(255,255,255,.09)",
        background:"linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))",
        display:"flex",
        alignItems:"center",
        gap:10,
        flexShrink:0
      }}>
        <span style={{
          width:30,
          height:30,
          borderRadius:11,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          background:"linear-gradient(145deg,#171717,#030303)",
          border:"1px solid rgba(255,255,255,.12)",
          boxShadow:`0 0 14px ${GL[myColor]}, inset 0 1px 0 rgba(255,255,255,.10)`,
          fontSize:15
        }}>
          💬
        </span>

        <div style={{minWidth:0,flex:1}}>
          <p style={{
            margin:0,
            fontSize:11,
            color:"#fff",
            fontWeight:900,
            letterSpacing:".16em",
            textTransform:"uppercase",
            whiteSpace:"nowrap",
            overflow:"hidden",
            textOverflow:"ellipsis"
          }}>
            Battle Chat
          </p>
          <p style={{
            margin:"3px 0 0",
            fontSize:9,
            color:"rgba(255,255,255,.42)",
            letterSpacing:".06em"
          }}>
            Kingdom communication
          </p>
        </div>

        <span style={{
          width:8,
          height:8,
          borderRadius:"50%",
          background:ac,
          boxShadow:`0 0 10px ${GL[myColor]}`,
          flexShrink:0
        }}/>
      </div>

      {/* Messages */}
      <div style={{
        flex:1,
        minHeight:0,
        overflowY:"auto",
        padding:"12px",
        display:"flex",
        flexDirection:"column",
        gap:8,
        background:"radial-gradient(circle at top,rgba(255,255,255,.035),transparent 45%)"
      }}>
        {messages.length===0&&(
          <div style={{
            display:"flex",
            flexDirection:"column",
            alignItems:"center",
            justifyContent:"center",
            height:"100%",
            gap:8,
            padding:"20px 8px"
          }}>
            <span style={{fontSize:26,opacity:.18}}>💬</span>
            <p style={{
              fontSize:11,
              color:"rgba(255,255,255,.24)",
              textAlign:"center",
              fontStyle:"italic",
              margin:0,
              lineHeight:1.5
            }}>
              No messages yet
            </p>
          </div>
        )}

        {messages.map((msg,i)=>{
          const isMe=msg.sender===myColor;
          const mac=AC[msg.sender as PlayerColor16]||ac;

          return(
            <div
              key={i}
              style={{
                padding:"8px 10px",
                borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",
                background:isMe
                  ? `linear-gradient(145deg,${mac}24,rgba(0,0,0,.45))`
                  : "linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.025))",
                border:`1px solid ${isMe?mac+"35":"rgba(255,255,255,.08)"}`,
                alignSelf:isMe?"flex-end":"flex-start",
                maxWidth:"92%",
                minWidth:0,
                boxShadow:"0 8px 18px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.06)"
              }}
            >
              <p style={{
                fontSize:8.5,
                color:isMe?`${mac}cc`:"rgba(255,255,255,.42)",
                margin:"0 0 4px",
                textTransform:"uppercase",
                letterSpacing:".08em",
                whiteSpace:"nowrap"
              }}>
                {msg.sender} · {msg.time}
              </p>

              <p style={{
                fontSize:11.5,
                color:"#fff",
                margin:0,
                lineHeight:1.45,
                wordBreak:"break-word",
                overflowWrap:"anywhere"
              }}>
                {msg.text}
              </p>
            </div>
          );
        })}

        <div ref={ref}/>
      </div>

      {/* Input */}
      <div style={{
        padding:"9px",
        borderTop:"1px solid rgba(255,255,255,.09)",
        display:"flex",
        gap:7,
        flexShrink:0,
        background:"linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.42))"
      }}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Type a message..."
          style={{
            flex:1,
            minWidth:0,
            padding:"10px 12px",
            borderRadius:12,
            background:"rgba(0,0,0,.72)",
            border:"1px solid rgba(255,255,255,.10)",
            color:"#fff",
            fontSize:11.5,
            outline:"none",
            fontFamily:"inherit",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,.05)"
          }}
        />

        <button
          onClick={send}
          style={{
            width:38,
            height:38,
            borderRadius:12,
            background:`linear-gradient(145deg,${ac}33,rgba(0,0,0,.65))`,
            border:`1px solid ${ac}45`,
            color:"#fff",
            fontSize:16,
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            flexShrink:0,
            boxShadow:`0 0 16px ${GL[myColor]}, inset 0 1px 0 rgba(255,255,255,.10)`,
            transition:"all .18s ease"
          }}
          onMouseEnter={e=>{
            e.currentTarget.style.transform="translateY(-1px) scale(1.04)";
            e.currentTarget.style.boxShadow=`0 0 24px ${GL[myColor]}, inset 0 1px 0 rgba(255,255,255,.14)`;
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.transform="";
            e.currentTarget.style.boxShadow=`0 0 16px ${GL[myColor]}, inset 0 1px 0 rgba(255,255,255,.10)`;
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

  // ─── PLAYER CARD ──────────────────────────────────────────────────────────────
  function PlayerCard16({name,color,isMe,isActive,captured,inCheck}:{name:string;color:PlayerColor16;isMe:boolean;isActive:boolean;captured:Piece16[];inCheck:boolean}){
    const ac=AC[color];
    const sym=color==="white"?"♔":"♚";
    return(
      <div style={{borderRadius:18,padding:"15px 20px",minHeight:92,background:color==="white"?"linear-gradient(135deg,rgba(255,255,255,0.92),rgba(245,245,245,0.85))":"linear-gradient(135deg,rgba(0,0,0,0.92),rgba(10,10,10,0.85))",border:`1px solid ${ac}55`,backdropFilter:"blur(3px)",transition:"all .3s",boxShadow:isActive?`0 0 22px ${GL[color]},0 8px 24px rgba(0,0,0,.45)`:"0 8px 22px rgba(0,0,0,.35)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:captured.length>0?7:0}}>
          <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,background:color==="white"?"radial-gradient(circle at 35% 35%,#fffdf2,#c8b070)":"radial-gradient(circle at 35% 35%,#4a3d28,#0a0704)",border:`2px solid ${ac}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:color==="white"?"#2b1b05":"#f0d28a",boxShadow:isActive?`0 0 14px ${GL[color]}`:"none"}}>
            {sym}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:800,color:color==="white"?"#2b1b05":"#f0d28a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}{isMe?" (You)":""}</p>
            <p style={{margin:"2px 0 0",fontSize:9,color:color==="white"?"rgba(50,35,10,.55)":"rgba(240,210,138,.55)",textTransform:"uppercase",letterSpacing:".1em"}}>{color}</p>
          </div>
          {inCheck&&<div style={{padding:"2px 6px",borderRadius:6,background:"rgba(255,80,80,.18)",border:"1px solid rgba(255,80,80,.45)",fontSize:9,color:"#ff8080",fontWeight:700,animation:"checkFlash 1s infinite",flexShrink:0}}>CHECK</div>}
          {isActive&&!inCheck&&<div style={{width:7,height:7,borderRadius:"50%",background:ac,boxShadow:`0 0 8px ${GL[color]}`,animation:"pulseDot 1.5s infinite",flexShrink:0}}/>}
        </div>
        {captured.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:3,maxHeight:36,overflow:"hidden"}}>
            {captured.slice(0,12).map((p,i)=>(
  <img
    key={i}
    src={pieceImagePath16(p)}
    alt={p.type}
    title={p.type}
    style={{
      width:22,
      height:22,
      objectFit:"contain",
      filter:"drop-shadow(0 2px 4px rgba(0,0,0,.85))",
      flexShrink:0
    }}
  />
))}
            {captured.length>12&&<span style={{fontSize:9,color:`${ac}80`}}>+{captured.length-12}</span>}
          </div>
        )}
      </div>
    );
  }

  // ─── GUIDE CARD — hover (desktop) or tap (mobile) highlights the piece's
  // abilities & spells, matching the interactive treatment on the 8x8 board.
  // The move/special text stays visible at all times (so mobile users who
  // can't hover never lose information); hovering just spotlights it.
  function GuideCard16({type,info,has}:{type:PieceType16;info:{name:string;move:string;special:string};has:boolean}){
    const [hot,setHot]=useState(false);
    return(
      <div
        onMouseEnter={()=>setHot(true)}
        onMouseLeave={()=>setHot(false)}
        onClick={()=>setHot(h=>!h)}
        style={{
          padding:"10px 11px",
          borderRadius:14,
          cursor:"pointer",
          WebkitTapHighlightColor:"transparent",
          transition:"all .2s ease",
          transform:hot?"translateY(-2px) scale(1.015)":"none",
          background:hot
            ? "linear-gradient(145deg,rgba(212,168,67,.18),rgba(255,255,255,.05))"
            : has
              ? "linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.035))"
              : "linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015))",
          border:`1px solid ${hot?"rgba(212,168,67,.65)":has?"rgba(255,255,255,.18)":"rgba(255,255,255,.07)"}`,
          opacity:has?1:.42,
          boxShadow:hot
            ? "0 14px 30px rgba(0,0,0,.65), 0 0 18px rgba(212,168,67,.25), inset 0 1px 0 rgba(255,255,255,.14)"
            : has
              ? "0 10px 24px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.10)"
              : "inset 0 1px 0 rgba(255,255,255,.04)"
        }}
      >
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}>
          <span style={{
            width:32,
            height:32,
            borderRadius:12,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            fontSize:18,
            flexShrink:0,
            background:"#050505",
            border:"1px solid rgba(255,255,255,.14)",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,.12),0 6px 14px rgba(0,0,0,.65)",
            overflow:"hidden",
          }}>
            <GuideIcon16 type={type}/>
          </span>

          <p style={{
            margin:0,
            fontSize:11.5,
            fontWeight:900,
            color:"#fff",
            textShadow:"0 2px 8px rgba(0,0,0,.85)",
            letterSpacing:".04em"
          }}>
            {info.name}{!has?" ✗":""}
          </p>
        </div>

        <p style={{
          margin:"0 0 3px",
          fontSize:9.5,
          color: hot ? "#fff" : "rgba(255,255,255,.82)",
          lineHeight:1.5
        }}>
          <span style={{color:"#78d7ff"}}>⚔ Ability:</span> {info.move}
        </p>

        <p style={{
          margin:0,
          fontSize:9.5,
          color: hot ? "#fff" : "rgba(255,255,255,.72)",
          lineHeight:1.5
        }}>
          <span style={{color:"#ffd15c"}}>✦ Spell/Special:</span> {info.special}
        </p>
      </div>
    );
  }

  // ─── STANDARD ACTION BUTTON ──────────────────────────────────────────────────
  // Shared visual treatment for the 4 core action buttons: Pass Turn, Battle
  // Guide, Game Rules, Quit Game. Deliberately uniform (not accent-colored
  // per action) — conditional ability buttons like Super Attack / Berserker
  // Rampage keep their own separate styling and don't use this component.
  function ActionButton16({icon,title,subtitle,onClick,disabled}:{icon:string;title:string;subtitle?:string;onClick:()=>void;disabled?:boolean}){
    return(
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width:"100%",
          display:"flex",
          alignItems:"center",
          gap:10,
          padding:"13px 14px",
          borderRadius:14,
          background:"linear-gradient(160deg, #5c3d1f 0%, #2a1a0a 100%)",
          border:"1px solid rgba(212,168,67,.35)",
          boxShadow:"0 8px 20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)",
          fontFamily:"'Cinzel', Georgia, serif",
          cursor:disabled?"default":"pointer",
          opacity:disabled?.5:1,
          transition:"all .18s ease",
        }}
        onMouseEnter={e=>{
          if(disabled)return;
          e.currentTarget.style.transform="translateY(-2px)";
          e.currentTarget.style.boxShadow="0 12px 26px rgba(0,0,0,.55)";
          e.currentTarget.style.background="linear-gradient(160deg, #6b4726 0%, #331f0d 100%)";
        }}
        onMouseLeave={e=>{
          if(disabled)return;
          e.currentTarget.style.transform="";
          e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)";
          e.currentTarget.style.background="linear-gradient(160deg, #5c3d1f 0%, #2a1a0a 100%)";
        }}
        onMouseDown={e=>{if(disabled)return;e.currentTarget.style.transform="translateY(0) scale(.98)";}}
        onMouseUp={e=>{if(disabled)return;e.currentTarget.style.transform="translateY(-2px)";}}
      >
        <span style={{
          width:38,height:38,borderRadius:10,flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(212,168,67,.18)",
          border:"1px solid rgba(212,168,67,.4)",
          fontSize:18
        }}>{icon}</span>
        <div style={{textAlign:"left",minWidth:0}}>
          <p style={{margin:0,fontSize:12,fontWeight:800,color:"#ffffff",textTransform:"uppercase",letterSpacing:".06em"}}>{title}</p>
          {subtitle&&<p style={{margin:"2px 0 0",fontSize:10.5,color:"rgba(255,255,255,.55)"}}>{subtitle}</p>}
        </div>
      </button>
    );
  }

  // ─── GUIDE PANEL ─────────────────────────────────────────────────────────────
 function GuidePanel16({myColor,gs}:{myColor:PlayerColor16;gs:GameState16}){
  const [open,setOpen]=useState(false);
  const myP=new Set<PieceType16>();

  for(let r=0;r<16;r++)for(let c=0;c<16;c++){
    const p=gs.board[r][c];
    if(p&&p.color===myColor)myP.add(p.type);
  }

  return(
    <div style={{position:"relative",width:"100%"}}>
      <ActionButton16
        icon={open?"✕":"🧿"}
        title={open?"Close Guide":"Battle Guide"}
        onClick={()=>{setOpen(o=>!o);snd("click");}}
      />

      {open&&(
        <div
          data-lenis-prevent
          style={{
            position:"absolute",
            bottom:"110%",
            right:0,
            zIndex:70,
            width:"290px",
            maxHeight:"440px",
            overflowY:"auto",
            padding:"16px",
            borderRadius:"20px",
            background:"#000",
            border:"1px solid rgba(255,255,255,.16)",
            boxShadow:"0 30px 90px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(212,168,67,.18)",
            color:"#fff"
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              position:"absolute",
              inset:0,
              width:"100%",
              height:"100%",
              objectFit:"cover",
              opacity:.22,
              zIndex:5,
              pointerEvents:"none"
            }}
          >
            <source src="https://www.pexels.com/download/video/34630451/" type="video/mp4"/>
          </video>

          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.72),rgba(0,0,0,.88))",zIndex:1,pointerEvents:"none"}}/>

          <div style={{position:"relative",zIndex:2}}>
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:10,
              marginBottom:14,
              paddingBottom:12,
              borderBottom:"1px solid rgba(255,255,255,.14)"
            }}>
              <span style={{
                width:36,
                height:36,
                borderRadius:13,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                background:"linear-gradient(145deg,#1b1b1b,#000)",
                border:"1px solid rgba(255,255,255,.18)",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,.14),0 8px 20px rgba(0,0,0,.75)",
                fontSize:18
              }}>
                🧿
              </span>

              <div>
                <p style={{
                  margin:0,
                  fontSize:13,
                  color:"#fff",
                  fontWeight:900,
                  textTransform:"uppercase",
                  letterSpacing:".14em"
                }}>
                  Battle Guide
                </p>
                <p style={{
                  margin:"4px 0 0",
                  fontSize:9,
                  color:"rgba(255,255,255,.58)",
                  letterSpacing:".07em",
                  textTransform:"uppercase"
                }}>
                  Units · Powers · Combat
                </p>
              </div>
            </div>

            <div style={{display:"grid",gap:8}}>
              {(Object.keys(PIECE_INFO) as PieceType16[]).map(type=>{
                const has=myP.has(type);
                const info=PIECE_INFO[type];
                return <GuideCard16 key={type} type={type} info={info} has={has}/>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  // Conjurer revive picker — real board sprite (own color, since a revived
  // piece always belongs to the caster) with the plain emoji as a fallback.
  function RevivePieceIcon16({piece}:{piece:Piece16}){
    const [failed,setFailed]=useState(false);
    if(failed)return <>{EMOJI[piece.type]}</>;
    return <img src={pieceImagePath16(piece)} alt={piece.type} onError={()=>setFailed(true)}
      style={{width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none"}}/>;
  }

  // ─── SPECIAL PANEL — MODERN ───────────────────────────────────────────────────
  function SpecialPanel16({gs,myColor,onAction,onCancel}:{gs:GameState16;myColor:PlayerColor16;onAction:(a:string,d?:any)=>void;onCancel:()=>void}){
    const ac=AC[myColor];
    if(gs.currentTurn!==myColor||gs.status==="finished")return null;

    const sorcSq=findSorceress16(gs.board,myColor);
    const spL=sorcSq?gs.board[sorcSq.row][sorcSq.col]?.sorceressSpellsLeft||0:0;
    const hasSorc=spL>0;
    const hasWiz=!!findWizard16(gs.board,myColor);
    const conjSq=findConjurer16(gs.board,myColor);
    const hasConj=conjSq?(gs.board[conjSq.row][conjSq.col]?.conjurerSpellsLeft||0)>0:false;
    const hasShadowSpell=conjSq?!gs.board[conjSq.row][conjSq.col]?.conjurerShadowSpellUsed:false;
    let hasWarlock=false;
    for(let r=0;r<16;r++)for(let c=0;c<16;c++){const p=gs.board[r][c];if(p&&p.type==="warlock"&&p.color===myColor){hasWarlock=true;break;}}
    let hasThief=false;
    for(let r=0;r<16;r++)for(let c=0;c<16;c++){if(getThiefStealTargets16(gs.board,r,c,myColor).length>0){hasThief=true;break;}}
    let hasTrickster=false;
    for(let r=0;r<16;r++)for(let c=0;c<16;c++){const p=gs.board[r][c];if(p&&p.type==="trickster"&&p.color===myColor&&p.sleepRoundsLeft===0&&p.boundRoundsLeft===0){hasTrickster=true;break;}}
    const findMageQueen=()=>{
      let q:Square16|null=null;
      for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(gs.board[r][c]?.type==="super-queen"&&gs.board[r][c]?.color===myColor)q={row:r,col:c};
      if(!q)return null;
      for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]as[number,number][]){
        const r=q.row+dr,c=q.col+dc;
        if(r>=0&&r<16&&c>=0&&c<16&&gs.board[r][c]?.type==="mage"&&gs.board[r][c]?.color===myColor)
          return{mageSq:{row:r,col:c},queenSq:q};
      }
      return null;
    };
    const mNQ=findMageQueen();
    const deadPieces=gs.capturedBy[myColor].filter(p=>p.type!=="mystic-king");
    if(!hasSorc&&!hasWiz&&!hasConj&&!hasShadowSpell&&!hasWarlock&&!hasThief&&!hasTrickster&&!mNQ&&gs.specialMode!=="warlock-bind-offer"&&!gs.spellMessage&&!gs.superMoveMode)return null;

    const spells=[
      hasSorc&&{id:"spell-sleep",icon:"😴",pieceKey:"sorceress" as PieceType16,label:`Sleep`,sub:`${spL} left`,color:"#9b7fff",bg:"rgba(100,60,255,.15)",border:"rgba(120,80,255,.4)"},
      hasSorc&&{id:"spell-teleport",icon:"🌀",pieceKey:"sorceress" as PieceType16,label:"Teleport",sub:"any piece",color:"#d080ff",bg:"rgba(180,60,220,.15)",border:"rgba(180,60,220,.4)"},
      hasSorc&&{id:"spell-wish",icon:"⭐",pieceKey:"sorceress" as PieceType16,label:"Wish",sub:"dice roll",color:"#f0c040",bg:"rgba(200,160,20,.15)",border:"rgba(200,160,20,.4)"},
      hasWiz&&{id:"wizard-teleport",icon:"🧙",pieceKey:"wizard" as PieceType16,label:"Wizard",sub:"teleport any piece",color:"#60c8ff",bg:"rgba(40,140,220,.15)",border:"rgba(40,140,220,.4)"},
      (hasConj&&deadPieces.length>0)&&{id:"conjurer-revive",icon:"✨",pieceKey:"conjurer" as PieceType16,label:"Conjure",sub:"revive 1 piece",color:"#80ffb0",bg:"rgba(60,200,100,.15)",border:"rgba(60,200,100,.4)"},
      hasShadowSpell&&{id:"conjurer-shadow-summon",icon:"🌑",pieceKey:"conjurer" as PieceType16,label:"Shadow",sub:"summon Berserker",color:"#b060ff",bg:"rgba(120,40,200,.15)",border:"rgba(140,60,220,.4)"},
      // Bind is never cast from here directly — the Warlock must move first,
      // which opens the "Cast Bind / Skip" prompt automatically. This chip
      // is a visibility/discoverability indicator, shown only to the player
      // who owns a Warlock, and is disabled until that prompt is live.
      hasWarlock&&{id:"warlock-bind-hint",icon:"⛓️",pieceKey:"warlock" as PieceType16,label:"Bind",sub:"move Warlock to activate",color:"#a080ff",bg:"rgba(100,60,200,.15)",border:"rgba(100,60,200,.4)",disabled:true},
      hasThief&&{id:"thief-steal",icon:"🗝️",pieceKey:"thief" as PieceType16,label:"Steal",sub:"triple jump",color:"#e0c080",bg:"rgba(160,120,20,.15)",border:"rgba(160,120,20,.4)"},
      hasTrickster&&{id:"trickster-teleport",icon:"🃏",pieceKey:"trickster" as PieceType16,label:"Teleport",sub:"reposition any piece",color:"#ff90d0",bg:"rgba(200,40,140,.15)",border:"rgba(200,40,140,.4)"},
      mNQ&&{id:"mage-sacrifice",icon:"💫",pieceKey:"mage" as PieceType16,label:"Mage",sub:"sacrifice",color:"#ff9090",bg:"rgba(200,60,60,.15)",border:"rgba(200,60,60,.4)"},
    ].filter(Boolean) as {id:string;icon:string;pieceKey:PieceType16;label:string;sub:string;color:string;bg:string;border:string;disabled?:boolean}[];

    return(
      <div style={{position:"relative",zIndex:20,margin:"1px auto 0",width:"min(560px,98vw)"}}>
        {/* Spell message */}
        {gs.spellMessage&&(
          <div style={{textAlign:"center",padding:"8px 16px",marginBottom:8,borderRadius:12,background:"rgba(0,0,0,.7)",border:`1px solid ${ac}30`,backdropFilter:"blur(12px)"}}>
            <p style={{margin:0,fontSize:12,color:ac,fontWeight:700}}>{gs.spellMessage}</p>
          </div>
        )}

        {/* Wish dice result */}
        {gs.wishDiceResult!==null&&gs.specialMode===null&&(
          <div style={{padding:"14px 20px",borderRadius:16,background:gs.wishDiceResult>5?"rgba(80,180,80,.1)":"rgba(200,60,60,.1)",border:`1px solid ${gs.wishDiceResult>5?"rgba(80,200,80,.3)":"rgba(200,60,60,.3)"}`,textAlign:"center",marginBottom:8,backdropFilter:"blur(16px)"}}>
            <p style={{margin:"0 0 4px",fontSize:32,fontWeight:900,color:gs.wishDiceResult>5?"#7dbd6e":"#ff8080",fontFamily:"'Cinzel',Georgia,serif"}}>🎲 {gs.wishDiceResult}<span style={{fontSize:16,opacity:.6}}>/10</span></p>
            <p style={{margin:"0 0 12px",fontSize:12,color:gs.wishDiceResult>5?"#7dbd6e":"#ff8080"}}>{gs.wishDiceResult>5?"✅ Wish Granted! Choose your move":"❌ Wish Failed — Turn Lost"}</p>
            {gs.wishDiceResult>5
              ?<button onClick={()=>onAction("wish-success")} style={{padding:"9px 24px",borderRadius:10,background:"rgba(80,200,80,.2)",border:"1px solid rgba(80,200,80,.4)",color:"#7dbd6e",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Cinzel',Georgia,serif"}}>Claim Wish →</button>
              :<button onClick={()=>onAction("wish-fail")} style={{padding:"9px 24px",borderRadius:10,background:"rgba(200,60,60,.1)",border:"1px solid rgba(200,60,60,.3)",color:"#ff8080",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Cinzel',Georgia,serif"}}>End Turn</button>}
          </div>
        )}

        {/* Warlock Bind offer — appears right after the Warlock moves */}
        {gs.specialMode==="warlock-bind-offer"&&(
          <div style={{padding:"14px 20px",borderRadius:16,background:"rgba(100,60,200,.1)",border:"1px solid rgba(140,100,255,.35)",textAlign:"center",marginBottom:8,backdropFilter:"blur(16px)"}}>
            <p style={{margin:"0 0 10px",fontSize:12,color:"#c0a0ff",fontWeight:700}}>⛓️ Cast Bind to freeze all enemy pieces for 1 round?</p>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={()=>onAction("warlock-bind-confirm")} style={{padding:"9px 20px",borderRadius:10,background:"rgba(140,100,255,.2)",border:"1px solid rgba(140,100,255,.5)",color:"#c0a0ff",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Cinzel',Georgia,serif"}}>⛓️ Cast Bind</button>
              <button onClick={()=>onAction("warlock-bind-skip")} style={{padding:"9px 20px",borderRadius:10,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.18)",color:"rgba(255,255,255,.7)",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Cinzel',Georgia,serif"}}>Skip</button>
            </div>
          </div>
        )}

        {/* Spell buttons — modern grid */}
        {!gs.specialMode&&!gs.wishDiceResult&&!gs.superMoveMode&&spells.length>0&&(
<div style={{
  display:"flex",
  gap:6,
  flexWrap:"wrap",
  justifyContent:"center",
  padding:"8px 9px",
  borderRadius:16,
  background:"rgba(4,2,8,.82)",
  border:`1px solid ${ac}16`,
  backdropFilter:"blur(18px)",
  boxShadow:`0 10px 28px rgba(0,0,0,.55), inset 0 1px 0 ${ac}10`,
}}>            {spells.map(sp=>(
              <button key={sp.id} onClick={()=>{if(!sp.disabled)onAction(sp.id);}} disabled={sp.disabled} style={{
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  gap:2,
  padding:"1px 15px",
  borderRadius:12,
  background: sp.disabled ? "linear-gradient(145deg, rgba(255,255,255,.04), rgba(0,0,0,.35))" : `linear-gradient(145deg, ${sp.bg}, rgba(0,0,0,.35))`,
  border:`1px solid ${sp.disabled ? "rgba(255,255,255,.12)" : sp.border}`,
  color: sp.disabled ? "rgba(255,255,255,.4)" : sp.color,
  cursor: sp.disabled ? "default" : "pointer",
  opacity: sp.disabled ? .6 : 1,
  transition:"all .18s ease",
  boxShadow:`0 5px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)`,
  minWidth:48,
  minHeight:48,
  fontFamily:"'Cinzel',Georgia,serif",
}}
                onMouseEnter={e=>{if(sp.disabled)return;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${sp.bg},inset 0 1px 0 rgba(255,255,255,.12)`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=`0 4px 16px ${sp.bg},inset 0 1px 0 rgba(255,255,255,.08)`;}}>
                <span style={{width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,filter:"drop-shadow(0 2px 6px rgba(0,0,0,.6))"}}><SpellPieceIcon16 pieceKey={sp.pieceKey} fallback={sp.icon}/></span>
                <span style={{fontSize:10,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase"}}>{sp.label}</span>
                <span style={{fontSize:8,opacity:.65,letterSpacing:".04em"}}>{sp.sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* Conjurer dead piece selection */}
        {gs.specialMode==="conjurer-revive-select"&&gs.specialData?.deadPieces&&(
          <div style={{padding:"12px 16px",borderRadius:16,background:"rgba(4,2,8,.9)",border:"1px solid rgba(80,200,100,.3)",backdropFilter:"blur(20px)"}}>
            <p style={{fontSize:11,color:"#80ffb0",margin:"0 0 10px",textAlign:"center",fontFamily:"'Cinzel',Georgia,serif",letterSpacing:".08em"}}>✨ Choose a piece to conjure back:</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
              {(gs.specialData.deadPieces as Piece16[]).map((p,i)=>(
                <button key={i} onClick={()=>onAction("conjurer-pick",{piece:p})} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:10,background:"rgba(80,200,100,.12)",border:"1px solid rgba(80,200,100,.3)",color:"#80ffb0",cursor:"pointer",fontSize:10,fontWeight:700}}>
                  <span style={{width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}><RevivePieceIcon16 piece={p}/></span><span>{p.type}</span>
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"center",marginTop:10}}>
              <button onClick={onCancel} style={{padding:"5px 14px",borderRadius:8,background:"rgba(255,80,80,.1)",border:"1px solid rgba(255,80,80,.25)",color:"#ff8080",fontSize:10,cursor:"pointer",fontWeight:700}}>✕ Cancel</button>
            </div>
          </div>
        )}

        {/* Paladin Super Move — choose a square 3 spaces away */}
        {gs.superMoveMode&&(
          <p style={{margin:"0 0 4px",fontSize:11,color:"#ffb347",textAlign:"center",fontWeight:700}}>⚔ Choose a square 3 spaces away to strike</p>
        )}

        {/* Cancel button for other special modes */}
        {(gs.specialMode&&gs.specialMode!=="conjurer-revive-select"&&gs.specialMode!=="warlock-bind-offer"&&!gs.wishDiceResult||gs.superMoveMode)&&(
          <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
            <button onClick={onCancel} style={{padding:"7px 20px",borderRadius:10,background:"rgba(255,60,60,.1)",border:"1px solid rgba(255,60,60,.3)",color:"#ff8080",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"'Cinzel',Georgia,serif"}}>✕ Cancel Spell</button>
          </div>
        )}
      </div>
    );
  }

  // ─── END SCREEN ───────────────────────────────────────────────────────────────
  function EndScreen16({showWin,myColor,playerNames,onLobby,onPlayAgain}:{showWin:PlayerColor16;myColor:PlayerColor16;playerNames:Record<PlayerColor16,string>;onLobby:()=>void;onPlayAgain:()=>void}){
    const isWinner=showWin===myColor;
    const ac=AC[showWin];
    return(
      <>
        {isWinner&&<Fireworks/>}
        <div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(22px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{textAlign:"center",padding:"48px 60px",borderRadius:28,position:"relative",overflow:"hidden",background:isWinner?"linear-gradient(160deg,#1a1400,#2e2000,#1a1400)":"linear-gradient(160deg,#0e0505,#1e0808,#0e0505)",border:`1px solid ${ac}45`,boxShadow:`0 0 80px ${GL[showWin]},0 40px 100px rgba(0,0,0,.95)`,fontFamily:"'Cinzel',Georgia,serif"}}>
            <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:200,height:1,background:`linear-gradient(90deg,transparent,${ac}80,transparent)`}}/>
            <img src={isWinner?"/game-over/victory.png":"/game-over/defeated.png"} alt="result"
              style={{width:160,height:160,objectFit:"contain",display:"block",margin:"0 auto 16px"}}
              onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none";}}/>
            <p style={{fontSize:9,letterSpacing:".28em",textTransform:"uppercase",color:`${ac}60`,margin:"0 0 8px"}}>— Empire of Kingdom —</p>
            <h1 style={{fontFamily:"'Cinzel',Georgia,serif",fontSize:48,color:isWinner?"#c8a84a":ac,margin:"0 0 8px",fontWeight:700,textShadow:isWinner?"0 0 40px rgba(200,168,74,0.6)":"0 0 40px rgba(255,80,80,0.5)"}}>
              {isWinner?"Victory!":"Defeated"}
            </h1>
            <p style={{fontSize:16,color:`${ac}aa`,margin:"0 0 4px",fontWeight:600}}>{playerNames[showWin]||showWin}</p>
            <p style={{fontSize:12,color:"rgba(212,168,67,.45)",margin:"0 0 10px",fontStyle:"italic"}}>({showWin} kingdom)</p>
            <div style={{height:1,background:`linear-gradient(90deg,transparent,${ac}40,transparent)`,margin:"14px auto",width:180}}/>
            <div style={{padding:"12px 24px",borderRadius:11,background:isWinner?"rgba(200,168,74,0.08)":"rgba(255,80,80,0.06)",border:`1px solid ${isWinner?"rgba(200,168,74,0.2)":"rgba(255,80,80,0.18)"}`,marginBottom:32,display:"inline-block"}}>
              <p style={{margin:0,fontSize:13,color:isWinner?"rgba(212,168,67,.85)":"rgba(255,140,140,.7)",fontStyle:"italic"}}>
                {isWinner?"🏆 The Empire Crown is claimed":"💀 Your Empire has fallen"}
              </p>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={onLobby} style={{padding:"13px 36px",borderRadius:13,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontSize:11,background:`linear-gradient(135deg,${ac},${ac}88)`,color:"#0a0d14",border:"none",cursor:"pointer",fontFamily:"'Cinzel',Georgia,serif",boxShadow:`0 8px 30px ${GL[showWin]}`}}>← Lobby</button>
              <button onClick={onPlayAgain} style={{padding:"13px 36px",borderRadius:13,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",fontSize:11,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.6)",border:"1px solid rgba(255,255,255,.12)",cursor:"pointer",fontFamily:"'Cinzel',Georgia,serif"}}>Play Again</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── MAIN ─────────────────────────────────────────────────────────────────────
  interface Props16{myColor:PlayerColor16;roomId:string;playerNames:Record<PlayerColor16,string>;socket?:any;onGameEnd?:(w:PlayerColor16)=>void;}

  export default function Board16x16({myColor,roomId,playerNames,socket,onGameEnd}:Props16){
    const [gs,setGs]=useState<GameState16>(createInitialGameState16());
    const [chat,setChat]=useState<ChatMsg[]>([]);
    const [animSq,setAnimSq]=useState<Square16|null>(null);
    const [showWin,setShowWin]=useState<PlayerColor16|null>(null);
    const [sqSize,setSqSize]=useState(38);
    const [moveToast,setMoveToast]=useState<"great"|"risky"|"normal"|null>(null);
    const [spellEffect,setSpellEffect]=useState<string|null>(null);
    const [greatSq,setGreatSq]=useState<Square16|null>(null);
    const [riskySq,setRiskySq]=useState<Square16|null>(null);
    const [showRules,setShowRules]=useState(false);
    const [showQuitConfirm,setShowQuitConfirm]=useState(false);
    const [isMobile,setIsMobile]=useState(false);

    const gsRef=useRef(gs);
    useEffect(()=>{gsRef.current=gs;},[gs]);

    useEffect(()=>{
      if(gs.status==="finished"&&gs.winner){setShowWin(gs.winner);snd("win");}
    },[gs]);

    useEffect(()=>{
      const calc=()=>{
        const mobile=window.innerWidth<=768;setIsMobile(mobile);
        // Subtracted amounts match the real chrome around the board (container
        // padding + row-label column + grid margin) so the final size is
        // clamped to what's actually available and can never overflow the
        // viewport, even on very narrow phones.
        const pad = mobile ? 22 : 28;
        const chrome = 30; // row-label column + inner grid margin
        const maxByWidth = window.innerWidth - pad * 2 - chrome;
        const a = mobile
          ? Math.min(maxByWidth, 400)
          : Math.min(window.innerWidth - 560, window.innerHeight - 110, 680, maxByWidth);
        const floor = mobile ? 14 : 28;
        setSqSize(Math.min(Math.max(Math.floor(a / 16), floor), Math.floor(maxByWidth / 16)));
      };
      calc();window.addEventListener("resize",calc);return()=>window.removeEventListener("resize",calc);
    },[]);

    const boardPx=sqSize*16;

    const showMoveFeedback=(ns:GameState16,to:Square16)=>{
      const q=ns.lastMoveQuality;
      if(q==="great"){setGreatSq(to);snd("great");setTimeout(()=>setGreatSq(null),1500);}
      else if(q==="risky"){setRiskySq(to);snd("risky");setTimeout(()=>setRiskySq(null),1500);}
      setMoveToast(q);
    };

    // ─── SOCKET ──────────────────────────────────────────────────────────────
    useEffect(()=>{
      if(!socket)return;
      socket.on("game:move",({newState}:{newState:GameState16})=>{
        const prev=gsRef.current;
        const pc=Object.values(prev.capturedBy).flat().length;
        const nc=Object.values(newState.capturedBy).flat().length;
        if(newState.specialMode==="executioner-axe-swing")snd("axe");
        else if(newState.spellMessage?.includes("Bind"))snd("bind");
        else if(newState.spellMessage?.includes("Conjur"))snd("spell");
        else snd(nc>pc?"capture":"move");
        if(newState.lastMove){setAnimSq(newState.lastMove.to);setTimeout(()=>setAnimSq(null),450);}
        setGs(newState);
        if(newState.status==="finished"&&newState.winner)setTimeout(()=>{setShowWin(newState.winner);snd("win");},400);
      });
      socket.on("game:chat",(msg:ChatMsg)=>setChat(p=>[...p,msg]));
      socket.on("game:quit",({winner,newState}:{winner:PlayerColor16;newState:GameState16})=>{
        setGs(newState);setShowQuitConfirm(false);
        setTimeout(()=>{setShowWin(winner);snd("win");},250);
      });
      return()=>{socket.off("game:move");socket.off("game:chat");socket.off("game:quit");};
    },[socket]);

    // ─── SPECIAL ACTIONS ─────────────────────────────────────────────────────
    const handleSpecial=useCallback((action:string,data?:any)=>{
      const state=gsRef.current;let ns:GameState16;
      if(action==="spell-sleep"){ns={...cloneState16(state),specialMode:"sorceress-sleep-select",spellMessage:"😴 Click any enemy piece to put to sleep (3 rounds)"};}
      else if(action==="spell-teleport"){ns={...cloneState16(state),specialMode:"sorceress-teleport-select",spellMessage:"🌀 Click any piece to teleport it"};}
      else if(action==="spell-wish"){
        const roll=rollWishDice16();ns=cloneState16(state);ns.wishDiceResult=roll;
        const sSq=findSorceress16(state.board,myColor);
        if(sSq){const s=ns.board[sSq.row][sSq.col]!;const nsp=s.sorceressSpellsLeft-1;if(nsp<=0)ns.board[sSq.row][sSq.col]=null;else ns.board[sSq.row][sSq.col]={...s,sorceressSpellsLeft:nsp};}
        setSpellEffect("wish");
      }
      else if(action==="wizard-teleport"){ns={...cloneState16(state),specialMode:"wizard-teleport-select-piece",spellMessage:"🧙 Click any piece to teleport via Wizard"};}
      else if(action==="thief-steal"){
        let pieceSq:Square16|null=null;
        for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(state.board[r][c]?.type==="thief"&&state.board[r][c]?.color===myColor)pieceSq={row:r,col:c};
        ns={...cloneState16(state),specialMode:"thief-steal-jump",specialData:{pieceSq},spellMessage:"🗝️ Click a piece within reach to steal it"};
      }
      else if(action==="trickster-teleport"){
        ns={...cloneState16(state),specialMode:"trickster-teleport-select-piece",spellMessage:"🃏 Click any piece (yours or theirs) to teleport it"};
      }
      else if(action==="conjurer-revive"){
        const dead=state.capturedBy[myColor].filter(p=>p.type!=="mystic-king");
        ns={...cloneState16(state),specialMode:"conjurer-revive-select",specialData:{deadPieces:dead},spellMessage:"✨ Select a piece to conjure back"};
      }
      else if(action==="conjurer-pick"&&data){
        ns={...cloneState16(state),specialData:{...state.specialData,selectedPiece:data.piece},spellMessage:"✨ Click an empty square to place the conjured piece"};
      }
      else if(action==="conjurer-shadow-summon"){
        let cSq:Square16|null=null;
        for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(state.board[r][c]?.type==="conjurer"&&state.board[r][c]?.color===myColor)cSq={row:r,col:c};
        if(!cSq)return;
        const board=applyShadowSummon16(state.board,cSq);
        ns=advanceTurn16({...cloneState16(state),board});
        snd("spell");setSpellEffect("shadow");
      }
      else if(action==="warlock-bind-confirm"){
        // Only reachable via the "warlock-bind-offer" mode, which is set
        // right after the Warlock moves — "he must make one move to do
        // the spell".
        ns=applyWarlockBind16(cloneState16(state),myColor);snd("bind");setSpellEffect("bind");
        ns=advanceTurn16(ns);
      }
      else if(action==="warlock-bind-skip"){
        ns=advanceTurn16(cloneState16(state));
      }
      else if(action==="mage-sacrifice"&&data){
        // Touch-triggered, guaranteed — no dice roll in the reference rules.
        const board=applyMageSacrifice16(state.board,data.mageSq,data.queenSq);
        ns=advanceTurn16({...cloneState16(state),board});
        snd("spell");setSpellEffect("conjure");
      }
      else if(action==="wish-success"){ns={...cloneState16(state),wishDiceResult:null,specialMode:"wizard-teleport-select-piece",spellMessage:"⭐ Wish granted! Move any piece anywhere"};}
      else if(action==="wish-fail"){ns=advanceTurn16(cloneState16(state));}
      else return;
      setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
      if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
    },[myColor,roomId,socket,onGameEnd]);

    const cancelSpecial=useCallback(()=>{
      const state=gsRef.current;
      const ns={...cloneState16(state),specialMode:null as any,specialData:null,spellMessage:null,wishDiceResult:null,selectedSquare:null,validMoves:[],superMoves:[],superMoveMode:false,castleMoves:[]};
      setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
    },[roomId,socket]);

    // ─── PALADIN SUPER MOVE (one-time 3-square surprise attack) ────────────────
    const handleSuperAttack16=useCallback(()=>{
      const state=gsRef.current;
      if(!state.selectedSquare)return;
      const {row,col}=state.selectedSquare;
      const piece=state.board[row][col];
      if(!piece||piece.type!=="paladin"||piece.color!==myColor||piece.paladanSuperUsed)return;
      const superMoves=getLegalPaladinSuperMoves16(state.board,row,col,state.turnOrder);
      snd("select");
      const ns={...cloneState16(state),superMoves,superMoveMode:true,validMoves:[]};
      setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
    },[myColor,roomId,socket]);

    // ─── BERSERKER RAMPAGE (one-time crowd/cleave attack) ──────────────────────
    const handleBerserkerRampage16=useCallback(()=>{
      const state=gsRef.current;
      if(!state.selectedSquare)return;
      const {row,col}=state.selectedSquare;
      const piece=state.board[row][col];
      if(!piece||piece.type!=="berserker"||piece.color!==myColor||piece.berserkerRampageUsed)return;
      const targets=getLegalBerserkerRampageTargets16(state.board,row,col,state.turnOrder);
      snd("select");
      const ns={...cloneState16(state),specialMode:"berserker-rampage-mode" as any,specialData:{targets,from:{row,col}},
        spellMessage:targets.length?"💥 Choose a target — cleave through 2 enemies in a line":"⚠️ No valid rampage targets right now",
        selectedSquare:{row,col},validMoves:[],superMoves:[],superMoveMode:false};
      setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
    },[myColor,roomId,socket]);

    // ─── CLICK ────────────────────────────────────────────────────────────────
    const handleClick=useCallback((row:number,col:number)=>{
      const state=gsRef.current;
      if(state.status==="finished"||state.currentTurn!==myColor)return;
      if(state.wishDiceResult!==null)return; // a dice roll is awaiting Confirm/End Turn — ignore board clicks
      if(state.specialMode==="warlock-bind-offer")return; // awaiting Cast Bind / Skip — ignore board clicks
      const {board,selectedSquare,validMoves,superMoves,superMoveMode,specialMode}=state;
      const cp=board[row][col];const sq:Square16={row,col};
      snd("click");

      // Paladin Super Move — wholly separate from normal validMoves.
      if(superMoveMode&&selectedSquare&&superMoves.some(m=>sq16Eq(m,sq))){
        const ns=executeMove16(state,selectedSquare,sq);
        setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);
        snd("super");
        showMoveFeedback(ns,sq);
        setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
        return;
      }

      // Berserker Rampage — wholly separate from normal validMoves, exactly
      // like the Paladin's Super Move. Clicking either the "mid" or "far"
      // square of a valid line confirms that direction's cleave attack.
      if(specialMode==="berserker-rampage-mode"){
        const targets=(state.specialData?.targets||[]) as {mid:Square16;far:Square16}[];
        const from=state.specialData?.from as Square16|undefined;
        const match=targets.find(t=>sq16Eq(t.far,sq)||sq16Eq(t.mid,sq));
        if(from&&match){
          const ns=applyBerserkerRampage16(state,from,match.mid,match.far);
          setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);
          snd("capture");setSpellEffect("rampage");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
          if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
        }
        return;
      }

      // Reverse Castle — swap the selected paladin with an adjacent ally.
      if(selectedSquare&&state.castleMoves.some(m=>sq16Eq(m,sq))){
        const ns=executeCastle16(state,selectedSquare,sq);
        setAnimSq(sq);setTimeout(()=>setAnimSq(null),420);
        snd("move");
        setGs(ns);socket?.emit("game:move",{roomId,newState:ns,action:"castle"});
        return;
      }

      if(specialMode==="sorceress-sleep-select"){
        // Sleep is guaranteed, per the reference — no dice roll.
        if(cp&&cp.color!==myColor){
          const sSq=findSorceress16(board,myColor)!;
          const nb=applySleepSpell16(board,sq,sSq);
          const ns=advanceTurn16({...cloneState16(state),board:nb});
          snd("spell");setSpellEffect("sleep");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="sorceress-teleport-select"){
        // Teleport (Sorceress) is guaranteed, per the reference — no dice roll.
        if(!state.specialData){if(cp)setGs({...cloneState16(state),specialData:{pieceSq:sq},spellMessage:"Now click destination square."});return;}
        if(!cp||cp.color!==myColor){
          const sSq=findSorceress16(board,myColor)!;
          const nb=applyTeleportSpell16(board,state.specialData.pieceSq,sq,sSq);
          const ns=advanceTurn16({...cloneState16(state),board:nb});
          snd("spell");setSpellEffect("teleport");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="wizard-teleport-select-piece"){if(cp)setGs({...cloneState16(state),specialMode:"wizard-teleport-select-dest",specialData:{pieceSq:sq},spellMessage:"Now click destination."});return;}
      if(specialMode==="wizard-teleport-select-dest"){
        // Wizard Teleport is guaranteed, per the reference — no dice roll.
        if(!cp){
          const nb=applyWizardTeleport16(board,state.specialData.pieceSq,sq);
          const ns=advanceTurn16({...cloneState16(state),board:nb});
          snd("spell");setSpellEffect("teleport");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="thief-steal-jump"){
        const pieceSq=state.specialData?.pieceSq;
        if(pieceSq&&getThiefStealTargets16(board,pieceSq.row,pieceSq.col,myColor).some(s=>sq16Eq(s,sq))){
          const ns=applyThiefSteal16(state,pieceSq,sq);snd("steal");setSpellEffect("steal");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="trickster-teleport-select-piece"){if(cp)setGs({...cloneState16(state),specialMode:"trickster-teleport-select-dest",specialData:{pieceSq:sq},spellMessage:"Now click destination."});return;}
      if(specialMode==="trickster-teleport-select-dest"){
        // Pure reposition — any piece, friend or foe, to any empty square. Not a kill.
        if(!cp){
          const nb=applyTricksterTeleport16(board,state.specialData.pieceSq,sq);
          const ns=advanceTurn16({...cloneState16(state),board:nb});
          snd("spell");setSpellEffect("teleport");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="conjurer-revive-select"&&state.specialData?.selectedPiece){
        // Guaranteed, per the reference — no dice roll.
        if(!cp){
          const conjSq=findConjurer16(board,myColor)!;
          const nb=cloneState16(state).board;
          nb[sq.row][sq.col]={...state.specialData.selectedPiece,id:`revived-${Date.now()}`};
          const conjurer=nb[conjSq.row][conjSq.col];
          if(conjurer)nb[conjSq.row][conjSq.col]={...conjurer,conjurerSpellsLeft:conjurer.conjurerSpellsLeft-1};
          const ns=advanceTurn16({...cloneState16(state),board:nb});
          snd("spell");setSpellEffect("conjure");
          setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        }return;
      }
      if(specialMode==="executioner-axe-swing"){
        const exSq=state.pendingAxeSquare!;const ax=getAxeSwingSquares16(board,exSq.row,exSq.col,myColor);
        if(ax.some(s=>sq16Eq(s,sq))){const ns=applyAxeSwing16(state,sq);setSpellEffect("axe");setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}
        else{const ns=advanceTurn16(cloneState16(state));setGs(ns);socket?.emit("game:move",{roomId,newState:ns});}
        return;
      }
      if(specialMode==="super-queen-second-move"){
        if(selectedSquare&&validMoves.some(m=>sq16Eq(m,sq))){
          const ns2=cloneState16(state);const p2=ns2.board[selectedSquare.row][selectedSquare.col]!;const t2=ns2.board[sq.row][sq.col];
          if(t2)ns2.capturedBy[p2.color].push(t2);ns2.board[sq.row][sq.col]=p2;ns2.board[selectedSquare.row][selectedSquare.col]=null;ns2.lastMove={from:selectedSquare,to:sq};
          const final=advanceTurn16(ns2);snd("move");setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);
          setGs(final);socket?.emit("game:move",{roomId,newState:final});
          if(final.status==="finished"&&final.winner){setTimeout(()=>{setShowWin(final.winner);snd("win");},400);onGameEnd?.(final.winner!);}
        }return;
      }
      if(selectedSquare&&validMoves.some(m=>sq16Eq(m,sq))){
        const ns=executeMove16(state,selectedSquare,sq);
        setAnimSq(sq);setTimeout(()=>setAnimSq(null),450);
        showMoveFeedback(ns,sq);
        setGs(ns);socket?.emit("game:move",{roomId,newState:ns});
        if(ns.status==="finished"&&ns.winner){setTimeout(()=>{setShowWin(ns.winner);snd("win");},400);onGameEnd?.(ns.winner!);}
        return;
      }
      if(cp&&cp.color===myColor&&cp.sleepRoundsLeft===0&&cp.boundRoundsLeft===0){
        snd("select");const moves=getLegalMoves16(board,row,col,state.turnOrder);
        setGs(prev=>({...prev,selectedSquare:sq,validMoves:moves,castleMoves:cp.type==="paladin"?getLegalCastleMoves16(board,row,col):[],superMoves:[],superMoveMode:false}));return;
      }
      setGs(prev=>({...prev,selectedSquare:null,validMoves:[],castleMoves:[],superMoves:[],superMoveMode:false}));
    },[myColor,roomId,socket,onGameEnd]);

    // ─── QUIT ────────────────────────────────────────────────────────────────
    const handleQuit=useCallback(()=>{
      const winner=(["white","black"] as PlayerColor16[]).find(c=>c!==myColor&&!gsRef.current.eliminatedPlayers.includes(c))||(myColor==="white"?"black":"white");
      const ns:GameState16={...cloneState16(gsRef.current),status:"finished",winner,check:null,selectedSquare:null,validMoves:[],specialMode:null as any,specialData:null,spellMessage:null,wishDiceResult:null};
      setShowQuitConfirm(false);setGs(ns);setShowWin(winner);snd("win");
      socket?.emit("game:quit",{roomId,quitter:myColor,winner,newState:ns});
      onGameEnd?.(winner);
    },[myColor,roomId,socket,onGameEnd]);

    const sendChat=(text:string)=>{const msg:ChatMsg={sender:myColor,text,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};setChat(p=>[...p,msg]);socket?.emit("game:chat",{roomId,msg});};

    const rows=myColor==="black"?[...Array(16)].map((_,i)=>15-i):[...Array(16)].map((_,i)=>i);
    const cols=[...Array(16)].map((_,i)=>i);
    const opponentColor:PlayerColor16=myColor==="white"?"black":"white";

    return(
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
          *{box-sizing:border-box;}
          @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
          @keyframes checkFlash{0%,100%{opacity:1}50%{opacity:.5}}
          @keyframes dotPop{0%{opacity:0;transform:scale(.2)}80%{transform:scale(1.2)}100%{opacity:1;transform:scale(1)}}
          @keyframes pieceIn{0%{opacity:.3;transform:scale(.65) translateY(-10px)}65%{transform:scale(1.08) translateY(1px)}100%{opacity:1;transform:scale(1) translateY(0)}}
          @keyframes winPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
          @keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes spellPop{0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--r,0deg)) translateY(-60px) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r,0deg)) translateY(-120px) scale(0)}}
          @keyframes rulesIn{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
          @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
          .sq16{position:relative;overflow:hidden;cursor:pointer;}
          .sq16:hover{filter:brightness(1.14);}
          .rules-scroll::-webkit-scrollbar{width:4px;}
          .rules-scroll::-webkit-scrollbar-track{background:transparent;}
          .rules-scroll::-webkit-scrollbar-thumb{background:rgba(212,168,67,.25);border-radius:4px;}
        `}</style>

        <video autoPlay loop muted playsInline style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",objectFit:"cover",zIndex:0,pointerEvents:"none"}}>
          <source src="https://www.pexels.com/download/video/33123413/" type="video/mp4"/>
        </video>

        <div style={{minHeight:"100vh",width:"100%",maxWidth:"100vw",overflowX:"hidden",boxSizing:"border-box",background:"radial-gradient(ellipse at 50% -5%,#1c1428 0%,#080510 50%,#020103 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"220px 22px 30px":"90px 28px 30px",gap:16,flexWrap:"wrap",fontFamily:"'Cinzel',Georgia,serif"}}>

          {/* ── LEFT PANEL ── */}
          <div style={{
  display:"flex",
  flexDirection:"column",
  gap:7,
  width:isMobile?"100%":200,
  minWidth:0,
  maxWidth:isMobile?boardPx+12+16:200,
  flexShrink:0,
  animation:"fadeInUp .4s ease",
  maxHeight:isMobile?undefined:"calc(100vh - 110px)",
  overflowY:isMobile?"visible":"auto",
  paddingRight:4,
}}>
            <PlayerCard16 name={playerNames[opponentColor]||opponentColor} color={opponentColor} isMe={false} isActive={gs.currentTurn===opponentColor} captured={gs.capturedBy[opponentColor]} inCheck={gs.check===opponentColor}/>
            <PlayerCard16 name={playerNames[myColor]||myColor} color={myColor} isMe={true} isActive={gs.currentTurn===myColor} captured={gs.capturedBy[myColor]} inCheck={gs.check===myColor}/>

            {/* Turn indicator */}
            <div style={{borderRadius:13,padding:"10px 13px",background:gs.check===myColor?"rgba(255,60,60,.1)":gs.currentTurn===myColor?`${AC[myColor]}0c`:"rgba(0,0,0,.35)",border:`1px solid ${gs.check===myColor?"rgba(255,80,80,.28)":gs.currentTurn===myColor?AC[myColor]+"28":"rgba(255,255,255,.05)"}`,display:"flex",alignItems:"center",gap:9,boxShadow:gs.currentTurn===myColor?`0 0 20px ${GL[myColor]}`:"none",transition:"all .3s"}}>
              <span style={{fontSize:16}}>{gs.check===myColor?"⚠️":gs.currentTurn===myColor?"⚔️":"⏳"}</span>
              <div>
                <p style={{margin:0,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:gs.check===myColor?"#ff8080":gs.currentTurn===myColor?AC[myColor]:"rgba(180,140,60,.45)"}}>{gs.check===myColor?"Check!":gs.currentTurn===myColor?"Your Move":`${gs.currentTurn}'s Turn`}</p>
              </div>
            </div>

            <MoveToast quality={moveToast} onDone={()=>setMoveToast(null)}/>



          {/* Buttons */}
<div style={{
  display:"flex",
  flexDirection:"column",
  gap:12,
  width:"100%",
  marginTop:10,
  zIndex:20,
  position:"relative"
}}>

  {/* PALADIN SUPER ATTACK */}
  {(()=>{
    const selSq=gs.selectedSquare;
    const selPiece=selSq?gs.board[selSq.row][selSq.col]:null;
    const selectedIsPaladin=!!selPiece&&selPiece.type==="paladin"&&selPiece.color===myColor;
    const isMyTurn=gs.currentTurn===myColor&&gs.status==="playing";
    if(!isMyTurn||!selectedIsPaladin)return null;
    const paladanSuperUsed=!!selPiece?.paladanSuperUsed;
    const superMoveMode=gs.superMoveMode;
    return(
      <button onClick={()=>{if(paladanSuperUsed)return;handleSuperAttack16();}}
        style={{width:"100%",minHeight:58,padding:"12px 14px",borderRadius:16,cursor:paladanSuperUsed?"default":"pointer",
          background:paladanSuperUsed?"linear-gradient(135deg, rgba(42,32,18,0.9), rgba(120,15,8,0.95))":superMoveMode?"linear-gradient(135deg, rgba(255,140,0,0.75), rgba(90,45,0,0.85))":"linear-gradient(135deg, rgba(255,160,35,0.65), rgba(80,42,8,0.75))",
          border:`1px solid ${paladanSuperUsed?"rgba(120,90,45,.20)":superMoveMode?"rgba(255,160,40,.75)":"rgba(255,170,60,.42)"}`,
          display:"flex",alignItems:"center",gap:12,transition:"all .2s",opacity:paladanSuperUsed?.62:1,position:"relative",overflow:"hidden"}}>
        <span style={{width:34,height:34,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:paladanSuperUsed?"rgba(255,255,255,.05)":"rgba(255,160,35,.16)",border:"1px solid rgba(255,200,120,.14)",flexShrink:0}}>⚡</span>
        <div style={{textAlign:"left",minWidth:0}}>
          <p style={{margin:0,fontSize:11,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:paladanSuperUsed?"rgba(170,130,70,.42)":superMoveMode?"#ffb347":"#ffc46b"}}>
            {paladanSuperUsed?"Super Used":superMoveMode?"Super Active":"Super Attack"}
          </p>
          <p style={{margin:"3px 0 0",fontSize:10,color:paladanSuperUsed?"rgba(170,130,70,.28)":"rgba(255,195,110,.50)"}}>
            {paladanSuperUsed?"One-time power spent":"Paladin 3-square strike"}
          </p>
        </div>
      </button>
    );
  })()}

  {/* BERSERKER RAMPAGE ATTACK */}
  {(()=>{
    const selSq=gs.selectedSquare;
    const selPiece=selSq?gs.board[selSq.row][selSq.col]:null;
    const selectedIsBerserker=!!selPiece&&selPiece.type==="berserker"&&selPiece.color===myColor;
    const isMyTurn=gs.currentTurn===myColor&&gs.status==="playing";
    if(!isMyTurn||!selectedIsBerserker)return null;
    const rampageUsed=!!selPiece?.berserkerRampageUsed;
    const rampageMode=gs.specialMode==="berserker-rampage-mode";
    return(
      <button onClick={()=>{if(rampageUsed)return;handleBerserkerRampage16();}}
        style={{width:"100%",minHeight:58,padding:"12px 14px",borderRadius:16,cursor:rampageUsed?"default":"pointer",
          background:rampageUsed?"linear-gradient(135deg, rgba(42,18,18,0.9), rgba(90,10,10,0.95))":rampageMode?"linear-gradient(135deg, rgba(255,40,40,0.75), rgba(90,0,0,0.85))":"linear-gradient(135deg, rgba(200,40,40,0.65), rgba(70,8,8,0.75))",
          border:`1px solid ${rampageUsed?"rgba(120,45,45,.20)":rampageMode?"rgba(255,60,60,.75)":"rgba(255,90,90,.42)"}`,
          display:"flex",alignItems:"center",gap:12,transition:"all .2s",opacity:rampageUsed?.62:1,position:"relative",overflow:"hidden"}}>
        <span style={{width:34,height:34,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:rampageUsed?"rgba(255,255,255,.05)":"rgba(255,40,40,.16)",border:"1px solid rgba(255,120,120,.14)",flexShrink:0}}>💥</span>
        <div style={{textAlign:"left",minWidth:0}}>
          <p style={{margin:0,fontSize:11,fontWeight:800,letterSpacing:".12em",textTransform:"uppercase",color:rampageUsed?"rgba(170,70,70,.42)":rampageMode?"#ff6b6b":"#ff9b9b"}}>
            {rampageUsed?"Rampage Used":rampageMode?"Rampage Active":"Rampage Attack"}
          </p>
          <p style={{margin:"3px 0 0",fontSize:10,color:rampageUsed?"rgba(170,70,70,.28)":"rgba(255,150,150,.50)"}}>
            {rampageUsed?"One-time power spent":"Cleave through 2 enemies in a line"}
          </p>
        </div>
      </button>
    );
  })()}


</div>
        </div>

          {/* ── BOARD ── */}
          <div style={{flexShrink:0,animation:"fadeInUp .5s ease",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{textAlign:"center",marginBottom:3,fontSize:9,color:`${AC.black}60`,letterSpacing:".1em",textTransform:"uppercase"}}>▼ {playerNames.black||"BLACK"}</div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              {/* Row numbers */}
              <div style={{display:"flex",flexDirection:"column"}}>
                {rows.map((r,i)=><div key={i} style={{height:sqSize,display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:8,color:"rgba(212,168,67,.3)",fontFamily:"monospace",width:12}}>{16-r}</div>)}
              </div>
              {/* Board */}
              <div style={{position:"relative",borderRadius:10,background:"linear-gradient(145deg,#2a1c08,#160e04,#0c0702,#160e04,#2a1c08)",boxShadow:["0 0 0 1px rgba(70,45,8,.9)","0 0 0 2px rgba(212,168,67,.3)","0 0 0 3px rgba(50,30,3,.95)","0 0 50px rgba(120,100,50,.06)","0 24px 70px rgba(0,0,0,.95)"].join(",")}}>
                <div style={{display:"grid",gridTemplateColumns:`repeat(16,${sqSize}px)`,gridTemplateRows:`repeat(16,${sqSize}px)`,borderRadius:6,overflow:"hidden",border:"1px solid rgba(0,0,0,.9)",boxShadow:"inset 0 0 40px rgba(0,0,0,.6)",margin:6}}>
                  {rows.map(row=>cols.map(col=>{
                    const piece=gs.board[row][col];const sq={row,col};
                    const isLight=(row+col)%2===0;
                    const isSel=!!gs.selectedSquare&&sq16Eq(gs.selectedSquare,sq);
                    const isValid=gs.validMoves.some(m=>sq16Eq(m,sq));
                    const isLF=!!gs.lastMove&&sq16Eq(gs.lastMove.from,sq);
                    const isLT=!!gs.lastMove&&sq16Eq(gs.lastMove.to,sq);
                    const isChk=piece?.type==="mystic-king"&&piece.color===gs.check;
                    const isAnim=!!animSq&&sq16Eq(animSq,sq);
                    const isGreat=!!greatSq&&sq16Eq(greatSq,sq);
                    const isRisky=!!riskySq&&sq16Eq(riskySq,sq);
                    const isAxeT=gs.specialMode==="executioner-axe-swing"&&gs.pendingAxeSquare&&getAxeSwingSquares16(gs.board,gs.pendingAxeSquare.row,gs.pendingAxeSquare.col,myColor).some(s=>sq16Eq(s,sq));
                    const isThiefT=gs.specialMode==="thief-steal-jump"&&gs.specialData?.pieceSq&&getThiefStealTargets16(gs.board,gs.specialData.pieceSq.row,gs.specialData.pieceSq.col,myColor).some(s=>sq16Eq(s,sq));
                    const isSuper=gs.superMoveMode&&gs.superMoves.some(m=>sq16Eq(m,sq));
                    const isCastleMove=gs.castleMoves.some(m=>sq16Eq(m,sq));
                    const rampTargets=(gs.specialMode==="berserker-rampage-mode"?gs.specialData?.targets:null) as {mid:Square16;far:Square16}[]|null;
                    const isRampFar=!!rampTargets&&rampTargets.some(t=>sq16Eq(t.far,sq));
                    const isRampMid=!!rampTargets&&rampTargets.some(t=>sq16Eq(t.mid,sq));
                    const baseBg=isLight?"#cdb088":"#553618";
                    let ov="";
                    if(isSel)ov="rgba(212,168,67,.55)";
                    else if(isChk)ov="rgba(220,40,40,.6)";
                    else if(isGreat)ov="rgba(255,215,0,.22)";
                    else if(isRisky)ov="rgba(255,60,60,.22)";
                    else if(isLF||isLT)ov="rgba(212,168,67,.2)";
                    else if(isCastleMove)ov="rgba(80,160,255,.18)";
                    else if(isAxeT)ov="rgba(255,80,0,.45)";
                    else if(isThiefT)ov="rgba(200,40,140,.4)";
                    else if(isRampFar)ov="rgba(255,20,20,.5)";
                    else if(isRampMid)ov="rgba(255,90,20,.35)";
                    if(gs.superMoveMode&&!isSel&&!isSuper)ov=ov||"rgba(0,0,0,.1)";
                    if(gs.specialMode==="berserker-rampage-mode"&&!isSel&&!isRampFar&&!isRampMid)ov=ov||"rgba(0,0,0,.1)";
                    return(
                      <div key={`${row}-${col}`} className="sq16" onClick={()=>handleClick(row,col)} style={{width:sqSize,height:sqSize,background:baseBg}}>
                        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",background:isLight?"linear-gradient(135deg,rgba(255,255,255,.1) 0%,transparent 55%)":"linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(0,0,0,.2) 100%)"}}/>
                        {ov&&<div style={{position:"absolute",inset:0,zIndex:1,background:ov,pointerEvents:"none"}}/>}
                        {piece&&piece.sleepRoundsLeft>0&&<div style={{position:"absolute",top:1,right:1,zIndex:5,fontSize:sqSize*.22,pointerEvents:"none"}}>💤</div>}
                        {piece&&piece.boundRoundsLeft>0&&<div style={{position:"absolute",top:1,left:1,zIndex:5,fontSize:sqSize*.22,pointerEvents:"none"}}>⛓️</div>}
                        {isValid&&!piece&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:sqSize*.28,height:sqSize*.28,borderRadius:"50%",background:"rgba(212,168,67,.68)",boxShadow:"0 0 12px rgba(212,168,67,.5)",animation:"dotPop .14s ease both",pointerEvents:"none",zIndex:4}}/>}
                        {isValid&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px solid rgba(212,168,67,.82)",borderRadius:3,pointerEvents:"none"}}/>}
                        {isAxeT&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px solid rgba(255,80,0,.85)",borderRadius:3,pointerEvents:"none"}}/>}
                        {isCastleMove&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px dashed rgba(80,160,255,.9)",borderRadius:3,pointerEvents:"none"}}/>}
                        {isThiefT&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px solid rgba(200,40,140,.9)",borderRadius:3,pointerEvents:"none"}}/>}
                        {isSuper&&!piece&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:sqSize*.3,height:sqSize*.3,borderRadius:"50%",background:"rgba(255,140,0,.82)",boxShadow:"0 0 14px rgba(255,140,0,.7)",animation:"dotPop .14s ease both",pointerEvents:"none",zIndex:4}}/>}
                        {isSuper&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px solid rgba(255,140,0,.9)",borderRadius:3,boxShadow:"inset 0 0 8px rgba(255,140,0,.3)",pointerEvents:"none"}}/>}
                        {isRampFar&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px solid rgba(255,20,20,.95)",borderRadius:3,boxShadow:"inset 0 0 8px rgba(255,20,20,.35)",pointerEvents:"none"}}/>}
                        {isRampMid&&piece&&<div style={{position:"absolute",inset:2,zIndex:4,border:"2px dashed rgba(255,90,20,.85)",borderRadius:3,pointerEvents:"none"}}/>}
                        {piece&&<PieceImg piece={piece} sqSize={sqSize} isAnim={isAnim} isGreat={isGreat} isRisky={isRisky}/>}
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>
            {/* Col labels */}
            <div style={{display:"flex",marginLeft:16,marginTop:2,width:boardPx}}>
              {cols.map((c,i)=><div key={i} style={{width:sqSize,textAlign:"center",fontSize:8,color:"rgba(212,168,67,.28)",fontFamily:"monospace"}}>{String.fromCharCode(65+c)}</div>)}
            </div>
            <div style={{textAlign:"center",marginTop:3,fontSize:9,color:`${AC.white}55`,letterSpacing:".1em",textTransform:"uppercase",marginLeft:16}}>▲ {playerNames.white||"WHITE"}</div>
            <SpecialPanel16 gs={gs} myColor={myColor} onAction={handleSpecial} onCancel={cancelSpecial}/>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{display:"flex",flexDirection:"column",gap:8,width:isMobile?"100%":220,minWidth:0,maxWidth:isMobile?boardPx+12+16:220,flexShrink:0,animation:"fadeInUp .4s ease",position:"relative",zIndex:20}}>
            <div style={{height:isMobile?200:240}}>
              <ChatPanel myColor={myColor} messages={chat} onSend={sendChat}/>
            </div>

            {/* Pass turn — unlimited */}
            <ActionButton16
              icon="⏭️"
              title={gs.currentTurn===myColor?"Pass Turn":"Opponent's Turn"}
              disabled={gs.currentTurn!==myColor||gs.status!=="playing"}
              onClick={()=>{
                if(gs.currentTurn!==myColor||gs.status!=="playing")return;
                const ns=advanceTurn16(cloneState16(gsRef.current));
                setGs(ns);socket?.emit("game:move",{roomId,newState:ns});snd("click");
              }}
            />

            <GuidePanel16 myColor={myColor} gs={gs}/>

            {/* GAME RULES */}
            <ActionButton16 icon="📜" title="Game Rules" onClick={()=>setShowRules(true)}/>

            {/* QUIT GAME */}
            <ActionButton16 icon="⚔️" title="Quit Game" onClick={()=>setShowQuitConfirm(true)}/>
          </div>

          {/* ── OVERLAYS ── */}
          <SpellEffect type={spellEffect} onDone={()=>setSpellEffect(null)}/>
{/* ── GAME RULES ── */}
{showRules&&(
  <div style={{
    position:"fixed",
    inset:0,
    zIndex:110,
    background:"radial-gradient(circle at center,rgba(35,25,10,.38),rgba(0,0,0,.94) 58%,#000 100%)",
    backdropFilter:"blur(18px)",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    animation:"rulesIn .3s ease",
    padding:18
  }}>
    <div
      className="rules-scroll"
      data-lenis-prevent
      style={{
        width:"min(720px,96vw)",
        maxHeight:"88vh",
        overflowY:"auto",
        borderRadius:30,
        padding:"26px 18px",
        background:"linear-gradient(145deg,#050505 0%,#101010 42%,#030303 72%,#1a1206 100%)",
        border:"1px solid rgba(255,215,120,.22)",
        boxShadow:"0 34px 110px rgba(0,0,0,.96), inset 0 1px 0 rgba(255,255,255,.12), inset 0 -24px 50px rgba(0,0,0,.75), 0 0 0 1px rgba(212,168,67,.12)",
        fontFamily:"'Cinzel',Georgia,serif",
        position:"relative",
        overflowX:"hidden"
      }}
    >
      <div style={{
        position:"absolute",
        top:0,
        left:"50%",
        transform:"translateX(-50%)",
        width:260,
        height:1,
        background:"linear-gradient(90deg,transparent,rgba(255,215,120,.8),transparent)"
      }}/>

      <div style={{
        position:"absolute",
        top:0,
        left:"50%",
        transform:"translateX(-50%)",
        width:190,
        height:55,
        background:"radial-gradient(ellipse,rgba(212,168,67,.16),transparent 70%)",
        pointerEvents:"none"
      }}/>

      <div style={{
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        marginBottom:22,
        padding:"12px 14px",
        borderRadius:18,
        background:"linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))",
        border:"1px solid rgba(255,255,255,.10)",
        boxShadow:"inset 0 1px 0 rgba(255,255,255,.10),0 12px 30px rgba(0,0,0,.5)"
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{
            width:42,
            height:42,
            borderRadius:15,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            background:"linear-gradient(145deg,#211707,#050505)",
            border:"1px solid rgba(255,215,120,.24)",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,.12),0 8px 22px rgba(0,0,0,.75)",
            fontSize:22
          }}>
            🛡️
          </span>
          <div>
            <h2 style={{
              margin:0,
              fontSize:22,
              fontWeight:900,
              color:"#fff",
              letterSpacing:".08em",
              textTransform:"uppercase",
              textShadow:"0 0 24px rgba(212,168,67,.35)"
            }}>
              Empire Rules
            </h2>
            <p style={{
              margin:"4px 0 0",
              fontSize:10,
              color:"rgba(255,255,255,.52)",
              letterSpacing:".16em",
              textTransform:"uppercase"
            }}>
              16x16 Battle Codex
            </p>
          </div>
        </div>

        <button
          onClick={()=>setShowRules(false)}
          style={{
            width:40,
            height:40,
            borderRadius:14,
            border:"1px solid rgba(255,255,255,.14)",
            background:"linear-gradient(145deg,#141414,#020202)",
            color:"rgba(255,255,255,.78)",
            cursor:"pointer",
            fontSize:15,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            boxShadow:"inset 0 1px 0 rgba(255,255,255,.10),0 8px 18px rgba(0,0,0,.6)"
          }}
        >
          ✕
        </button>
      </div>

      <div style={{display:"grid",gap:11}}>
        {[
          ["👑","Victory","Killing the Mystic King does NOT end the game. Win by eliminating ALL enemy pieces OR forcing surrender."],
          ["⚗️","Ethereal Pieces","Tricksters, Wizards, Sorceresses, Conjurers & Warlocks are ethereal — they cannot kill humans. Only a Wizard or Sorceress can kill a Wizard or Sorceress; Conjurers and Warlocks can kill other ethereals but never a Wizard or Sorceress."],
          ["🗝️","Thief","Jumps over anyone (triple jump) ONCE to steal any piece — the Thief ends up occupying the square it stole, and the stolen piece disappears."],
          ["🃏","Trickster","Moves like a Queen. Can also teleport ANY piece — friend or foe — to any empty square (a reposition, not a kill), unlimited uses. WARNING: once Trickster is its owner's LAST piece, the opponent has 10 rounds to kill it — fail and the whole board resets to the start!"],
          ["✨","Conjurer","Conjures 1 dead allied piece back onto any empty square. Also holds a separate, one-time Shadow Spell that summons a hidden Berserker onto a free square directly in front of itself."],
          ["😈","Berserker","A hidden special unit — not part of the starting formation. Summoned once by the Conjurer's Shadow Spell. Moves like a Queen (any direction, unlimited distance) and is the sole exception to the mortal/immortal combat rule: it can kill BOTH mortal and immortal/ethereal pieces. Immortal pieces cannot kill it back — only mortals or monsters can. Its one-time Rampage attack cleaves through two adjacent, in-line enemies in a single strike."],
          ["⛓️","Warlock","Must move first — right after, you may cast Bind to freeze ALL enemy pieces for 1 full round (they skip their next turn). Unlimited uses."],
          ["🔮","Sorceress Spells","3 spells total: 😴 Sleep any piece for 3 rounds / 🌀 Teleport any piece anywhere / ⭐ Wish (dice roll — above 5 succeeds, below 5 loses turn). Sleep and Teleport are guaranteed; only the Wish requires the dice roll."],
          ["🧙","Wizard","Ethereal. Teleports any piece by touch. Sacrifices himself to let the King morph into any character."],
          ["🎲","Spell Dice","Only the Sorceress's Wish spell requires a d10 roll above 5 to succeed — on a failed roll her charge is still spent but nothing happens and your turn ends. Every other spell/special ability is guaranteed."],
          ["🏳️","Forfeit","If any player quits — opponent is immediately declared winner. No exceptions."],
          ["🤝","Pass Turn","Mexican Standoff — you may pass your turn anytime, unlimited times."],
        ].map(([icon,title,desc])=>(
          <div
            key={title as string}
            style={{
              padding:"14px 16px",
              borderRadius:18,
              background:"linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.025),rgba(0,0,0,.22))",
              border:"1px solid rgba(255,255,255,.10)",
              display:"flex",
              gap:14,
              alignItems:"flex-start",
              boxShadow:"0 12px 28px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.08)"
            }}
          >
            <span style={{
              width:40,
              height:40,
              borderRadius:14,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              background:"linear-gradient(145deg,#151515,#030303)",
              border:"1px solid rgba(255,255,255,.13)",
              boxShadow:"inset 0 1px 0 rgba(255,255,255,.10),0 7px 18px rgba(0,0,0,.65)",
              fontSize:21,
              flexShrink:0
            }}>
              {icon}
            </span>

            <div>
              <h3 style={{
                margin:"0 0 5px",
                color:"#fff",
                fontSize:13.5,
                letterSpacing:".08em",
                textTransform:"uppercase",
                textShadow:"0 2px 10px rgba(0,0,0,.85)"
              }}>
                {title}
              </h3>
              <p style={{
                margin:0,
                color:"rgba(255,255,255,.72)",
                lineHeight:1.75,
                fontSize:12
              }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

          {/* ── QUIT CONFIRM ── */}
          {showQuitConfirm&&(
            <div style={{position:"fixed",inset:0,zIndex:115,background:"rgba(0,0,0,.88)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{width:"min(420px,92vw)",borderRadius:26,padding:"32px 24px",background:"linear-gradient(155deg,#120606 0%,#2a0e0e 45%,#120606 100%)",border:"1px solid rgba(255,100,100,.25)",textAlign:"center",fontFamily:"'Cinzel',Georgia,serif"}}>
                <div style={{fontSize:48,marginBottom:14}}>🏳️</div>
                <h2 style={{margin:"0 0 8px",color:"#ff9d9d",fontSize:24}}>Surrender?</h2>
                <p style={{margin:"0 0 22px",color:"rgba(255,220,220,.75)",lineHeight:1.7,fontSize:13}}>Your opponent will be declared the victor.</p>
                <div style={{display:"flex",justifyContent:"center",gap:10}}>
                  <button onClick={()=>setShowQuitConfirm(false)} style={{padding:"12px 22px",borderRadius:12,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",color:"#ddd",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"'Cinzel',Georgia,serif"}}>Stay</button>
                  <button onClick={handleQuit} style={{padding:"12px 22px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#d9534f,#8f1f1f)",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:11,fontFamily:"'Cinzel',Georgia,serif"}}>⚔️ Quit</button>
                </div>
              </div>
            </div>
          )}

          {/* ── WIN SCREEN ── */}
          {showWin&&(
            <EndScreen16 showWin={showWin} myColor={myColor} playerNames={playerNames} onLobby={()=>window.location.href="/lobby"} onPlayAgain={()=>{setGs(createInitialGameState16());setShowWin(null);}}/>
          )}
        </div>
      </>
    );
  }