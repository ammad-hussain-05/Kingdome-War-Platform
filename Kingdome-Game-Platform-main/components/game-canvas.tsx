"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RotateCcw, Flag, Info, X, AlertTriangle, Clock } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type PT = "king"|"queen"|"rook"|"bishop"|"knight"|"paladin"
type PC = "white"|"black"

interface Piece {
  type: PT; color: PC; id: string
  hasMoved?: boolean; superUsed?: boolean
}
interface Sq { piece: Piece|null; hi: boolean; cap: boolean; sel: boolean }
interface Log { n:number; color:PC; piece:PT; from:string; to:string; cap?:PT; note?:string }

// ── Symbols (swap these with <img> later) ────────────────────────────────────
// TO ADD YOUR IMAGES LATER: replace SYM[type][color] with an img path
// e.g. in renderPiece() use: <img src={`/pieces/${color}/${type}.png`} />
const SYM: Record<PT,Record<PC,string>> = {
  king:    {white:"♔",black:"♚"}, queen:  {white:"♕",black:"♛"},
  rook:    {white:"♖",black:"♜"}, bishop: {white:"♗",black:"♝"},
  knight:  {white:"♘",black:"♞"}, paladin:{white:"♙",black:"♟"},
}
const NAME: Record<PT,string> = {
  king:"King",queen:"Queen",rook:"Rook",bishop:"Bishop",knight:"Knight",paladin:"Paladin"
}

let _id=0; const uid=()=>`p${++_id}`
const NOTE=(r:number,c:number)=>`${"abcdefgh"[c]}${8-r}`

// ── Board Setup ───────────────────────────────────────────────────────────────
function initBoard(): Sq[][] {
  const b: Sq[][] = Array(8).fill(0).map(()=>Array(8).fill(0).map(()=>({piece:null,hi:false,cap:false,sel:false})))
  const back: PT[] = ["rook","knight","bishop","queen","king","bishop","knight","rook"]
  back.forEach((t,c)=>{
    b[0][c].piece={type:t,color:"black",id:uid()}
    b[7][c].piece={type:t,color:"white",id:uid()}
  })
  for(let c=0;c<8;c++){
    b[1][c].piece={type:"paladin",color:"black",id:uid()}
    b[6][c].piece={type:"paladin",color:"white",id:uid()}
  }
  return b
}

function clone(b: Sq[][]): Sq[][] {
  return b.map(r=>r.map(s=>({...s,piece:s.piece?{...s.piece}:null})))
}
function clearHL(b: Sq[][]): Sq[][] {
  return b.map(r=>r.map(s=>({...s,hi:false,cap:false,sel:false})))
}

// ── Move Generator ────────────────────────────────────────────────────────────
function moves(row:number,col:number,b:Sq[][]): [number,number][] {
  const p=b[row][col].piece; if(!p) return []
  const out:[number,number][]=[]
  const ok=(r:number,c:number)=>r>=0&&r<8&&c>=0&&c<8
  const enemy=(r:number,c:number)=>ok(r,c)&&!!b[r][c].piece&&b[r][c].piece!.color!==p.color
  const free=(r:number,c:number)=>ok(r,c)&&!b[r][c].piece
  const can=(r:number,c:number)=>ok(r,c)&&(!b[r][c].piece||enemy(r,c))

  const slide=(dirs:[number,number][])=>{
    for(const [dr,dc] of dirs){
      let r=row+dr,c=col+dc
      while(ok(r,c)){
        if(b[r][c].piece){if(enemy(r,c))out.push([r,c]);break}
        out.push([r,c]);r+=dr;c+=dc
      }
    }
  }
  const D8:[number,number][]=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]

  switch(p.type){
    case "king":   D8.forEach(([dr,dc])=>{if(can(row+dr,col+dc))out.push([row+dr,col+dc])}); break
    case "queen":  slide(D8); break
    case "rook":   slide([[-1,0],[1,0],[0,-1],[0,1]]); break
    case "bishop": slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break
    case "knight": [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>{if(can(row+dr,col+dc))out.push([row+dr,col+dc])}); break
    case "paladin":{
      // 1 square any direction (normal move)
      D8.forEach(([dr,dc])=>{if(can(row+dr,col+dc))out.push([row+dr,col+dc])})
      // super attack: 2 squares any direction (shown only if not used)
      if(!p.superUsed) D8.forEach(([dr,dc])=>{if(can(row+dr*2,col+dc*2))out.push([row+dr*2,col+dc*2])})
      break
    }
  }
  return out
}

function allMoves(b:Sq[][],color:PC){
  const out:{from:[number,number];to:[number,number]}[]=[]
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(b[r][c].piece?.color===color)
      moves(r,c,b).forEach(([tr,tc])=>out.push({from:[r,c],to:[tr,tc]}))
  return out
}

function applyMove(b:Sq[][],from:[number,number],to:[number,number],markSuper=false): Sq[][] {
  const nb=clone(b); const p=nb[from[0]][from[1]].piece; if(!p) return nb
  nb[to[0]][to[1]].piece={...p,hasMoved:true,superUsed:markSuper?true:p.superUsed}
  nb[from[0]][from[1]].piece=null
  return nb
}

function inCheck(b:Sq[][],color:PC): boolean {
  let kr=-1,kc=-1
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(b[r][c].piece?.type==="king"&&b[r][c].piece?.color===color){kr=r;kc=c}
  if(kr<0) return false
  const enemy=color==="white"?"black":"white"
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(b[r][c].piece?.color===enemy)
      if(moves(r,c,b).some(([mr,mc])=>mr===kr&&mc===kc)) return true
  return false
}

// ── AI (minimax depth 3) ──────────────────────────────────────────────────────
const VAL:Record<PT,number>={king:20000,queen:900,rook:500,bishop:330,knight:320,paladin:100}

function evaluate(b:Sq[][]): number {
  let s=0
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=b[r][c].piece; if(!p) continue
    s+=(p.color==="white"?1:-1)*VAL[p.type]
  }
  return s
}

function minimax(b:Sq[][],depth:number,alpha:number,beta:number,max:boolean): number {
  if(depth===0) return evaluate(b)
  const color:PC=max?"white":"black"
  const mv=allMoves(b,color)
  if(!mv.length) return max?-99999:99999
  if(max){
    let best=-Infinity
    for(const m of mv){const nb=applyMove(b,m.from,m.to);best=Math.max(best,minimax(nb,depth-1,alpha,beta,false));alpha=Math.max(alpha,best);if(beta<=alpha)break}
    return best
  } else {
    let best=Infinity
    for(const m of mv){const nb=applyMove(b,m.from,m.to);best=Math.min(best,minimax(nb,depth-1,alpha,beta,true));beta=Math.min(beta,best);if(beta<=alpha)break}
    return best
  }
}

function bestMove(b:Sq[][]){
  const mv=allMoves(b,"black"); if(!mv.length) return null
  for(let i=mv.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[mv[i],mv[j]]=[mv[j],mv[i]]}
  let best=Infinity,bm=mv[0]
  for(const m of mv){const s=minimax(applyMove(b,m.from,m.to),2,-Infinity,Infinity,true);if(s<best){best=s;bm=m}}
  return bm
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GameCanvas() {
  const [board,setBoard]       = useState<Sq[][]>(initBoard)
  const [sel,setSel]           = useState<[number,number]|null>(null)
  const [turn,setTurn]         = useState<PC>("white")
  const [log,setLog]           = useState<Log[]>([])
  const [caps,setCaps]         = useState<{white:Piece[];black:Piece[]}>({white:[],black:[]})
  const [check,setCheck]       = useState(false)
  const [over,setOver]         = useState<string|null>(null)
  const [lastMv,setLastMv]     = useState<[[number,number],[number,number]]|null>(null)
  const [thinking,setThinking] = useState(false)
  const [showInfo,setShowInfo] = useState(false)
  const [passing,setPassing]   = useState(false)    // Mexican standoff
  const [superQ,setSuperQ]     = useState<{row:number;col:number;piece:Piece;to:[number,number]}|null>(null)
  const [capturedPool,setCapturedPool] = useState<Piece[]>([]) // for back-rank retrieval
  const [retrieveQ,setRetrieveQ]      = useState<{row:number;col:number}|null>(null)

  const logRef  = useRef<HTMLDivElement>(null)
  const boardRef = useRef<Sq[][]>(board)
  boardRef.current = board

  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight},[log])
  useEffect(()=>{if(check){const t=setTimeout(()=>setCheck(false),900);return()=>clearTimeout(t)}},[check])

  // ── AI turn ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(turn!=="black"||over||thinking) return
    setThinking(true)
    const delay=1200+Math.random()*1200
    const t=setTimeout(()=>{
      const b=boardRef.current
      const bm=bestMove(b); if(!bm){setOver("⬜ White wins! Black has no moves.");setThinking(false);return}
      doMove(bm.from[0],bm.from[1],bm.to[0],bm.to[1],b[bm.from[0]][bm.from[1]].piece!,false,"black",b)
      setThinking(false)
    },delay)
    return()=>clearTimeout(t)
  },[turn,over])

  // ── Core move executor ────────────────────────────────────────────────────
  function doMove(
    fr:number,fc:number,tr:number,tc:number,
    piece:Piece, isSuper:boolean, mover:PC, b:Sq[][]
  ){
    const cap=b[tr][tc].piece
    const nb=applyMove(clearHL(b),[fr,fc],[tr,tc],isSuper)

    if(cap){
      setCaps(prev=>({...prev,[cap.color]:[...prev[cap.color],cap]}))
      // Add to white's captured pool (pieces white can retrieve)
      if(cap.color==="white") setCapturedPool(prev=>[...prev,cap])
      if(cap.type==="king"){
        setOver(mover==="white"?"⬜ White wins the battle!":"⬛ Black wins the battle!")
        setBoard(nb);setLastMv([[fr,fc],[tr,tc]]);setSel(null);return
      }
    }

    // Paladin reaches back rank → white can retrieve a captured piece
    if(piece.type==="paladin"&&mover==="white"){
      const backRank=0
      if(tr===backRank){
        setRetrieveQ({row:tr,col:tc})
      }
    }

    const next:PC=mover==="white"?"black":"white"
    const chk=inCheck(nb,next)

    setLog(prev=>[...prev,{
      n:prev.length+1,color:mover,piece:piece.type,
      from:NOTE(fr,fc),to:NOTE(tr,tc),cap:cap?.type,
      note:isSuper?"⚡ Super!":chk?"⚠ Check!":undefined
    }])
    setLastMv([[fr,fc],[tr,tc]])
    setBoard(nb);setSel(null);setCheck(chk)
    if(!over) setTurn(next)
  }

  // ── Square click (human = white) ─────────────────────────────────────────
  const click=useCallback((r:number,c:number)=>{
    if(over||turn!=="white"||thinking||superQ||retrieveQ) return
    const sq=board[r][c]

    // Reverse castle: if selected is paladin and clicking a superpower piece behind it
    if(sel){
      const [sr,sc]=sel
      const selPiece=board[sr][sc].piece
      const clickPiece=board[r][c].piece

      // Check valid move first
      const vm=moves(sr,sc,board)
      if(vm.some(([mr,mc])=>mr===r&&mc===c)){
        const movingP=board[sr][sc].piece!
        const dist=Math.max(Math.abs(r-sr),Math.abs(c-sc))
        // Paladin super: moving 2 squares
        if(movingP.type==="paladin"&&dist===2&&!movingP.superUsed){
          setSuperQ({row:sr,col:sc,piece:movingP,to:[r,c]})
          return
        }
        doMove(sr,sc,r,c,movingP,false,"white",board)
        return
      }

      // Reverse castle: paladin + superpower same color adjacent
      if(selPiece?.type==="paladin"&&selPiece.color==="white"&&
         clickPiece?.color==="white"&&clickPiece.type!=="paladin"){
        // Swap positions
        const nb=clearHL(clone(board))
        nb[r][c].piece={...selPiece}
        nb[sr][sc].piece={...clickPiece}
        setBoard(nb);setSel(null)
        setLog(prev=>[...prev,{n:prev.length+1,color:"white",piece:"paladin",from:NOTE(sr,sc),to:NOTE(r,c),note:"🔄 Castle!"}])
        setTurn("black")
        return
      }
    }

    if(sq.piece?.color==="white"){
      const nb=clearHL(board).map(row=>[...row.map(s=>({...s}))])
      nb[r][c].sel=true
      moves(r,c,board).forEach(([mr,mc])=>{nb[mr][mc].hi=true;if(board[mr][mc].piece)nb[mr][mc].cap=true})
      setBoard(nb);setSel([r,c]);return
    }
    setBoard(clearHL(board));setSel(null)
  },[board,sel,turn,over,thinking,superQ,retrieveQ])

  // Mexican standoff: pass turn
  function passTurn(){
    if(over||turn!=="white"||thinking) return
    setPassing(true)
    setLog(prev=>[...prev,{n:prev.length+1,color:"white",piece:"paladin",from:"—",to:"—",note:"⏸ Pass"}])
    setTimeout(()=>setPassing(false),300)
    setTurn("black")
  }

  // Confirm paladin super
  function confirmSuper(yes:boolean){
    if(!superQ) return
    const {row,col,piece,to}=superQ; setSuperQ(null)
    if(yes) doMove(row,col,to[0],to[1],piece,true,"white",board)
    else { setBoard(clearHL(board));setSel(null) }
  }

  // Retrieve captured piece (back rank promotion)
  function retrievePiece(piece:Piece|null){
    if(!retrieveQ||!piece) { setRetrieveQ(null); return }
    const {row,col}=retrieveQ
    const nb=clone(board)
    nb[row][col].piece={...piece,color:"white",id:uid()}
    setCapturedPool(prev=>prev.filter((_,i)=>i!==capturedPool.indexOf(piece)))
    setBoard(nb);setRetrieveQ(null)
    setLog(prev=>[...prev,{n:prev.length+1,color:"white",piece:piece.type,from:"—",to:NOTE(row,col),note:"♻ Retrieved!"}])
  }

  function reset(){
    setBoard(initBoard());setSel(null);setTurn("white");setLog([])
    setCaps({white:[],black:[]});setCheck(false);setOver(null)
    setLastMv(null);setThinking(false);setSuperQ(null)
    setCapturedPool([]);setRetrieveQ(null)
  }

  const files=["a","b","c","d","e","f","g","h"]
  const ranks=["8","7","6","5","4","3","2","1"]

  return (
    <section id="play" className="relative min-h-screen py-12 overflow-hidden"
      style={{background:"#050508",fontFamily:"Georgia, serif"}}>

      {/* Video background */}
      <video autoPlay muted loop playsInline
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",pointerEvents:"none",opacity:0.7}}>
        <source src="/video/game-bg.mkv" type="video/mp4"/>
      </video>
      <div className="absolute inset-0 pointer-events-none" style={{zIndex:1,background:"rgba(5,5,8,0.55)"}}/>

      {/* Check flash */}
      {check&&<div className="fixed inset-0 pointer-events-none z-50"
        style={{background:"radial-gradient(ellipse at center,rgba(220,38,38,0.25) 0%,transparent 70%)",animation:"pulse 0.9s ease"}}/>}

      {/* Super attack confirm */}
      {superQ&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{background:"rgba(0,0,0,0.82)",backdropFilter:"blur(5px)"}}>
          <div className="rounded-xl p-8 text-center max-w-sm w-full mx-4"
            style={{background:"#0d0d14",border:"1px solid rgba(201,168,76,0.45)"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚡</div>
            <h3 style={{color:"#c9a84c",fontSize:20,marginBottom:8}}>Paladin Super Attack</h3>
            <p style={{color:"rgba(232,223,200,0.6)",fontSize:13,marginBottom:20}}>
              Use the one-time 2-square super strike? Cannot be used again.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={()=>confirmSuper(true)} style={{background:"linear-gradient(135deg,#8b6914,#c9a84c)",color:"#050508",padding:"10px 24px",borderRadius:8,fontWeight:700,border:"none",cursor:"pointer"}}>
                ⚡ Use It!
              </button>
              <button onClick={()=>confirmSuper(false)} style={{border:"1px solid rgba(201,168,76,0.3)",color:"#c9a84c",background:"transparent",padding:"10px 24px",borderRadius:8,cursor:"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retrieve captured piece modal */}
      {retrieveQ&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{background:"rgba(0,0,0,0.82)",backdropFilter:"blur(5px)"}}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4"
            style={{background:"#0d0d14",border:"1px solid rgba(201,168,76,0.45)"}}>
            <h3 style={{color:"#c9a84c",fontSize:18,marginBottom:6,textAlign:"center"}}>♻ Retrieve a Piece</h3>
            <p style={{color:"rgba(232,223,200,0.6)",fontSize:12,marginBottom:16,textAlign:"center"}}>
              Paladin reached back rank. Choose a captured piece to bring back.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {capturedPool.length===0
                ?<p style={{color:"rgba(201,168,76,0.4)",fontSize:13}}>No captured pieces.</p>
                :capturedPool.map((p,i)=>(
                  <button key={i} onClick={()=>retrievePiece(p)}
                    style={{fontSize:32,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:8,padding:"8px 12px",cursor:"pointer",color:"#f9f4e8"}}>
                    {SYM[p.type][p.color]}
                  </button>
                ))
              }
            </div>
            <button onClick={()=>retrieveQ&&setRetrieveQ(null)} style={{width:"100%",padding:"8px",border:"1px solid rgba(201,168,76,0.2)",color:"rgba(201,168,76,0.5)",background:"transparent",borderRadius:6,cursor:"pointer",fontSize:12}}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Game over */}
      {over&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{background:"rgba(0,0,0,0.88)",backdropFilter:"blur(8px)"}}>
          <div className="rounded-2xl p-10 text-center max-w-sm w-full mx-4"
            style={{background:"#0d0d14",border:"1px solid rgba(201,168,76,0.5)",boxShadow:"0 0 100px rgba(201,168,76,0.2)"}}>
            <div style={{fontSize:56,marginBottom:16}}>♛</div>
            <h2 style={{color:"#c9a84c",fontSize:26,marginBottom:10}}>{over}</h2>
            <p style={{color:"rgba(232,223,200,0.5)",fontSize:13,marginBottom:24}}>The battle is over.</p>
            <button onClick={reset} style={{background:"linear-gradient(135deg,#8b6914,#c9a84c,#8b6914)",color:"#050508",padding:"12px 32px",borderRadius:10,fontWeight:700,border:"none",cursor:"pointer",fontSize:14,letterSpacing:"1px"}}>
              ⚔ New Battle
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <p style={{color:"rgba(201,168,76,0.5)",fontSize:11,letterSpacing:"6px",marginBottom:8,fontFamily:"monospace"}}>◆ KINGDOM COME ◆</p>
          <h2 style={{color:"#c9a84c",fontSize:"clamp(28px,5vw,48px)",textShadow:"0 0 30px rgba(201,168,76,0.3)",marginBottom:4}}>
            8×8 Classic War
          </h2>
          <p style={{color:"rgba(201,168,76,0.4)",fontSize:12,fontFamily:"monospace"}}>YOU (White) vs AI (Black)</p>
          <div style={{width:70,height:1,background:"linear-gradient(90deg,transparent,#c9a84c,transparent)",margin:"12px auto 0"}}/>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">

          {/* ── BOARD ── */}
          <div className="flex flex-col items-center gap-4">

            {/* Turn bar */}
            <div className="flex gap-4">
              {(["white","black"] as PC[]).map(c=>(
                <div key={c} className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    border:turn===c?"1px solid rgba(201,168,76,0.6)":"1px solid rgba(201,168,76,0.12)",
                    background:turn===c?"rgba(201,168,76,0.1)":"transparent",
                    opacity:turn===c?1:0.35,
                    transition:"all 0.3s"
                  }}>
                  <span style={{fontSize:15}}>{c==="white"?"♔":"♚"}</span>
                  <span style={{color:"#c9a84c",fontSize:13}}>{c==="white"?"You":"AI"}</span>
                  {turn===c&&thinking&&c==="black"&&(
                    <div className="flex gap-0.5">
                      {[0,1,2].map(i=>(
                        <div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#60a5fa",animation:"bounce 0.8s infinite",animationDelay:`${i*0.15}s`}}/>
                      ))}
                    </div>
                  )}
                  {turn===c&&!thinking&&<span style={{color:"rgba(201,168,76,0.7)",fontSize:10}}>▶</span>}
                </div>
              ))}
            </div>

            {/* Board wrapper */}
            <div style={{
              padding:"clamp(10px,2vw,16px)",background:"#080810",borderRadius:10,
              boxShadow:"0 0 0 1px rgba(201,168,76,0.18), 0 8px 80px rgba(0,0,0,0.9)"
            }}>
              {/* Inner gold frame */}
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",inset:-4,border:"1px solid rgba(201,168,76,0.25)",borderRadius:4,pointerEvents:"none",zIndex:10}}/>

                {/* Rank + grid */}
                <div style={{display:"flex",alignItems:"stretch"}}>
                  {/* Left ranks */}
                  <div style={{display:"flex",flexDirection:"column",marginRight:4}}>
                    {ranks.map(r=><div key={r} style={{flex:1,display:"flex",alignItems:"center",fontSize:9,color:"rgba(201,168,76,0.3)",fontFamily:"monospace",minHeight:"clamp(44px,8vw,70px)"}}>{r}</div>)}
                  </div>

                  <div>
                    {/* Grid */}
                    <div style={{
                      display:"grid",gridTemplateColumns:"repeat(8,1fr)",
                      gap:1.5,background:"rgba(201,168,76,0.4)",padding:1.5,borderRadius:3
                    }}>
                      {board.map((row,rIdx)=>row.map((sq,cIdx)=>{
                        const gold=(rIdx+cIdx)%2===0
                        const isLF=lastMv?.[0][0]===rIdx&&lastMv?.[0][1]===cIdx
                        const isLT=lastMv?.[1][0]===rIdx&&lastMv?.[1][1]===cIdx
                        const p=sq.piece

                        let bg=gold?"#c9a84c":"#111116"
                        if(sq.sel)      bg="rgba(201,168,76,0.75)"
                        else if(sq.cap) bg=gold?"rgba(239,68,68,0.65)":"rgba(239,68,68,0.45)"
                        else if(isLT)   bg=gold?"rgba(234,197,8,0.85)":"rgba(201,168,76,0.35)"
                        else if(isLF)   bg=gold?"rgba(201,168,76,0.6)":"rgba(201,168,76,0.18)"

                        const sz="clamp(44px,8vw,70px)"
                        return(
                          <button key={`${rIdx}-${cIdx}`} onClick={()=>click(rIdx,cIdx)}
                            disabled={!!over||!!superQ||!!retrieveQ||thinking}
                            style={{
                              width:sz,height:sz,background:bg,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              position:"relative",cursor:"pointer",border:"none",
                              transition:"background 0.1s",
                            }}
                          >
                            {/* Move dot */}
                            {sq.hi&&!sq.cap&&(
                              <div style={{position:"absolute",width:"32%",height:"32%",borderRadius:"50%",background:"rgba(34,197,94,0.8)",boxShadow:"0 0 10px rgba(34,197,94,0.5)"}}/>
                            )}
                            {/* Capture ring */}
                            {sq.cap&&(
                              <div style={{position:"absolute",inset:3,borderRadius:2,border:"2px solid rgba(239,68,68,0.9)",boxShadow:"inset 0 0 10px rgba(239,68,68,0.3)"}}/>
                            )}
                            {/* Piece — REPLACE THIS SPAN WITH <img> WHEN YOUR PNGS ARE READY */}
                            {p&&(
                              // <span style={{
                              //   fontSize:"clamp(22px,4vw,38px)",lineHeight:1,userSelect:"none",
                              //   color:p.color==="white"?"#f9f4e8":"#16100a",
                              //   filter:p.color==="white"
                              //     ?"drop-shadow(0 2px 6px rgba(0,0,0,1))"
                              //     :"drop-shadow(0 2px 4px rgba(0,0,0,0.9))",
                              //   zIndex:2,display:"block",
                              // }}>
                              //   {SYM[p.type][p.color]}
                              // </span>

                              <img
src={`/pieces/${p.color}/${p.type.charAt(0).toUpperCase() + p.type.slice(1)}.png`}
    alt={p.type}
    style={{ width:"100%", height:"100%", objectFit:"contain" }}
  />
                            )}
                          </button>
                        )
                      }))}
                    </div>

                    {/* File labels */}
                    <div style={{display:"flex",paddingTop:4,gap:1.5}}>
                      {files.map(f=>(
                        <div key={f} style={{flex:1,textAlign:"center",fontSize:9,color:"rgba(201,168,76,0.3)",fontFamily:"monospace"}}>{f}</div>
                      ))}
                    </div>
                  </div>

                  {/* Right ranks */}
                  <div style={{display:"flex",flexDirection:"column",marginLeft:4}}>
                    {ranks.map(r=><div key={r} style={{flex:1,display:"flex",alignItems:"center",fontSize:9,color:"rgba(201,168,76,0.3)",fontFamily:"monospace",minHeight:"clamp(44px,8vw,70px)"}}>{r}</div>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                {label:"New Game",fn:reset,icon:"↺"},
                {label:"Pass Turn",fn:passTurn,icon:"⏸"},
                {label:"Resign",fn:()=>!over&&setOver("⬛ Black wins by resignation"),icon:"🏳"},
                {label:"Rules",fn:()=>setShowInfo(v=>!v),icon:"?"},
              ].map(b=>(
                <button key={b.label} onClick={b.fn}
                  style={{
                    display:"flex",alignItems:"center",gap:6,padding:"8px 14px",
                    border:"1px solid rgba(201,168,76,0.2)",color:"rgba(201,168,76,0.65)",
                    background:"rgba(201,168,76,0.02)",borderRadius:8,cursor:"pointer",
                    fontSize:12,fontFamily:"monospace",letterSpacing:"0.5px",transition:"all 0.2s"
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(201,168,76,0.1)";e.currentTarget.style.borderColor="rgba(201,168,76,0.5)"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(201,168,76,0.02)";e.currentTarget.style.borderColor="rgba(201,168,76,0.2)"}}>
                  {b.icon} {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── SIDE PANEL ── */}
          <div className="flex flex-col gap-4 w-full xl:w-72">

            {/* Status */}
            <div style={{background:"rgba(10,10,18,0.9)",border:"1px solid rgba(201,168,76,0.12)",borderRadius:12,padding:16}}>
              <p style={{color:"rgba(201,168,76,0.5)",fontSize:10,letterSpacing:"4px",marginBottom:8,fontFamily:"monospace"}}>STATUS</p>
              {thinking?(
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Clock size={14} style={{color:"#60a5fa"}}/>
                  <span style={{color:"#60a5fa",fontSize:13,fontFamily:"monospace"}}>AI is calculating...</span>
                </div>
              ):(
                <p style={{color:"rgba(232,223,200,0.7)",fontSize:13,fontFamily:"monospace"}}>
                  {check?"⚠ King in Check! Move the King.":turn==="white"?"Your turn (White)":"AI thinking..."}
                </p>
              )}
              {check&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}><AlertTriangle size={13} style={{color:"#ef4444"}}/><span style={{color:"#ef4444",fontSize:12,fontFamily:"monospace"}}>King in Check!</span></div>}
            </div>

            {/* Captured */}
            <div style={{background:"rgba(10,10,18,0.85)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:12,padding:16}}>
              <p style={{color:"rgba(201,168,76,0.5)",fontSize:10,letterSpacing:"4px",marginBottom:10,fontFamily:"monospace"}}>CAPTURED</p>
              {(["black","white"] as PC[]).map(c=>(
                <div key={c} style={{marginBottom:10}}>
                  <span style={{color:"rgba(201,168,76,0.4)",fontSize:11,fontFamily:"monospace",display:"block",marginBottom:4}}>
                    {c==="white"?"⬜ White's":"⬛ Black's"} losses:
                  </span>
                  <div style={{display:"flex",flexWrap:"wrap",gap:2,minHeight:20}}>
                    {caps[c].length===0
                      ?<span style={{color:"rgba(201,168,76,0.2)",fontSize:12}}>—</span>
                      :caps[c].map((p,i)=><span key={i} style={{fontSize:18,opacity:0.65,color:p.color==="white"?"#f9f4e8":"#16100a"}}>{SYM[p.type][p.color]}</span>)
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* Battle log */}
            <div style={{background:"rgba(10,10,18,0.85)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:12,padding:16}}>
              <p style={{color:"rgba(201,168,76,0.5)",fontSize:10,letterSpacing:"4px",marginBottom:10,fontFamily:"monospace"}}>BATTLE LOG</p>
              <div ref={logRef} style={{maxHeight:200,overflowY:"auto"}}>
                {log.length===0
                  ?<p style={{color:"rgba(201,168,76,0.2)",fontSize:12,fontFamily:"monospace"}}>No moves yet...</p>
                  :log.map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:6,alignItems:"center",fontSize:11,fontFamily:"monospace",borderBottom:"1px solid rgba(201,168,76,0.04)",padding:"3px 0",flexWrap:"wrap"}}>
                      <span style={{color:"rgba(201,168,76,0.25)",minWidth:18}}>{m.n}.</span>
                      <span style={{fontSize:15,color:m.color==="white"?"#f9f4e8":"rgba(201,168,76,0.55)"}}>{SYM[m.piece][m.color]}</span>
                      <span style={{color:"rgba(201,168,76,0.45)"}}>{m.from}→{m.to}</span>
                      {m.cap&&<span style={{color:"#ef4444"}}>×{NAME[m.cap]}</span>}
                      {m.note&&<span style={{color:"#f59e0b",fontSize:10}}>{m.note}</span>}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Rules panel */}
            {showInfo&&(
              <div style={{background:"rgba(10,10,18,0.9)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:12,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p style={{color:"rgba(201,168,76,0.5)",fontSize:10,letterSpacing:"4px",fontFamily:"monospace"}}>RULES</p>
                  <button onClick={()=>setShowInfo(false)} style={{color:"rgba(201,168,76,0.4)",background:"none",border:"none",cursor:"pointer"}}><X size={13}/></button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:12,fontFamily:"monospace",color:"rgba(232,223,200,0.55)"}}>
                  {[
                    ["♔ King","1 sq any direction"],
                    ["♕ Queen","Unlimited any direction"],
                    ["♖ Rook","Unlimited straight"],
                    ["♗ Bishop","Unlimited diagonal"],
                    ["♘ Knight","L-shape jump"],
                    ["♙ Paladin","1 sq any dir. Super: 2 sq (once). Swap with superpower (castle). Back rank = retrieve piece."],
                    ["⏸ Pass","Skip your turn (Mexican Standoff)"],
                    ["🏆 Win","Capture the King"],
                  ].map(([p,r])=>(
                    <div key={p} style={{display:"flex",gap:8}}>
                      <span style={{color:"#c9a84c",minWidth:72,flexShrink:0}}>{p}</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}