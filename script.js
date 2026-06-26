// Water Hero - game core

const TILE = { EMPTY:0, ROCK:1, MUD:2, VILLAGE:3, START:4, PENALTY:5 };

const levels = [
  // small sample levels; 7x7 grid
  {
    title: 'Village Path',
    width:7, height:7,
    moves: 30,
    tiles: [
      [0,0,0,0,0,0,0],
      [0,1,0,5,0,1,0],
      [0,1,0,5,0,1,0],
      [4,0,0,0,0,0,3],
      [0,1,0,5,0,1,0],
      [0,1,0,5,0,1,0],
      [0,0,0,0,0,0,0]
    ],
    player: { x:0, y:3 }
  },
  {
    title: 'Rocky Ridge',
    width:7,height:7,
    moves:24,
    // redesigned to ensure a winnable path (start at left center, village right center)
    tiles:[
      [0,0,0,1,0,0,0],
      [0,1,0,1,0,1,0],
      [0,1,0,1,0,1,0],
      [4,0,0,0,5,0,3],
      [0,1,0,1,0,1,0],
      [0,1,0,0,0,1,0],
      [0,0,0,1,0,0,0]
    ],
    player:{ x:0,y:3 }
  }
];

const state = {
  levelIndex: 0,
  grid: null,
  player: {x:0,y:0},
  movesLeft: 0,
  totalScore: 0,
  animating: false
};

// DOM refs
const $ = selector => document.querySelector(selector);
const gridContainer = $('#grid-container');
const playScreen = $('#play-screen');
const startScreen = $('#start-screen');

function saveProgress(){
  localStorage.setItem('waterHero.progress', JSON.stringify({ totalScore: state.totalScore, levelIndex: state.levelIndex }));
}
function loadProgress(){
  const raw = localStorage.getItem('waterHero.progress');
  if (!raw) return;
  try{ const obj = JSON.parse(raw); state.totalScore = obj.totalScore||0; state.levelIndex = obj.levelIndex||0; }catch(e){}
}

function startLevel(index){
  state.levelIndex = index%levels.length;
  const lvl = levels[state.levelIndex];
  state.movesLeft = lvl.moves;
  state.grid = lvl.tiles.map(r=>r.slice());
  state.player = { x: lvl.player.x, y: lvl.player.y };
  renderLevel();
  showScreen('play');
}

function renderLevel(){
  const lvl = levels[state.levelIndex];
  $('#level-title').textContent = lvl.title + ` (Level ${state.levelIndex+1})`;
  $('#moves-remaining').textContent = state.movesLeft;
  $('#total-score').textContent = state.totalScore;
  $('#level-score').textContent = 0;

  // grid element
  const cols = lvl.width;
  const rows = lvl.height;
  gridContainer.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'grid';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;

  for (let y=0;y<rows;y++){
    for (let x=0;x<cols;x++){
      const tileType = state.grid[y][x];
      const cell = document.createElement('div');
      cell.className = 'tile';
      cell.dataset.x = x; cell.dataset.y = y;
      if (x === state.player.x && y === state.player.y){
        cell.classList.add('player');
        cell.textContent = '💧';
      } else if (tileType === TILE.ROCK) { cell.classList.add('rock'); cell.textContent='⛰'; }
      else if (tileType === TILE.MUD) { cell.classList.add('mud'); cell.textContent='~'; }
      else if (tileType === TILE.VILLAGE){ cell.classList.add('village'); cell.textContent='🏠'; }
      else if (tileType === TILE.PENALTY){ cell.classList.add('mud'); cell.textContent='!'; }
      else { cell.classList.add('empty'); cell.textContent=''; }
      gridEl.appendChild(cell);
    }
  }
  gridContainer.appendChild(gridEl);
}

function showScreen(name){
  startScreen.classList.toggle('active', name==='start');
  playScreen.classList.toggle('active', name==='play');
}

function canMoveTo(x,y){
  const lvl = levels[state.levelIndex];
  if (x<0||y<0||x>=lvl.width||y>=lvl.height) return false;
  const t = state.grid[y][x];
  if (t===TILE.ROCK) return false;
  return true;
}

function movePlayer(dx,dy){
  if (state.animating) return;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  const lvl = levels[state.levelIndex];
  if (!canMoveTo(nx,ny)) return; // blocked
  const tile = state.grid[ny][nx];
  const cost = tile===TILE.MUD?2:1;
  if (state.movesLeft < cost) { state.movesLeft = 0; updateMoves(); checkLose(); return; }
  state.player.x = nx; state.player.y = ny; state.movesLeft -= cost; updateMoves(); renderLevel(); handleSpecialTile(); checkWin();
}

// handle special tiles after move
function handleSpecialTile(){
  const t = state.grid[state.player.y][state.player.x];
  if (t === TILE.PENALTY){
    // subtract 10 points from total score as a challenge
    state.totalScore = Math.max(0, state.totalScore - 10);
    // visual feedback: floating -10
    showPenaltyAt(state.player.x, state.player.y, -10);
    $('#total-score').textContent = state.totalScore;
    saveProgress();
  }
}

function showPenaltyAt(x,y,amount){
  const rect = gridContainer.getBoundingClientRect();
  const cell = gridContainer.querySelector(`.tile[data-x='${x}'][data-y='${y}']`);
  if (!cell) return;
  const r = cell.getBoundingClientRect();
  const el = document.createElement('div');
  el.style.position='fixed'; el.style.left = (r.left + r.width/2) + 'px'; el.style.top = (r.top + r.height/2) + 'px';
  el.style.color = '#ffddde'; el.style.fontWeight='700'; el.style.transform='translate(-50%,-50%)'; el.textContent = `${amount}`;
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.transition='all 900ms ease'; el.style.transform='translate(-50%,-160%)'; el.style.opacity='0'; },20);
  setTimeout(()=>el.remove(),1200);
}

function updateMoves(){ $('#moves-remaining').textContent = state.movesLeft; }

function checkWin(){
  const t = state.grid[state.player.y][state.player.x];
  if (t===TILE.VILLAGE){
    const base = 100;
    const bonus = state.movesLeft * 10;
    const total = base + bonus;
    state.totalScore += total;
    $('#base-score').textContent = `+${base}`;
    $('#moves-bonus').textContent = `+${bonus}`;
    $('#win-total').textContent = `+${total}`;
    $('#level-score').textContent = total;
    $('#total-score').textContent = state.totalScore;
    saveProgress();
    showModal('win');
    celebrate();
  }
}

function checkLose(){
  if (state.movesLeft<=0){ showModal('lose'); }
}

function showModal(which){
  if (which==='lose'){
    $('#modal-lose').setAttribute('aria-hidden','false');
  } else {
    $('#modal-win').setAttribute('aria-hidden','false');
  }
}
function hideModals(){
  $('#modal-lose').setAttribute('aria-hidden','true');
  $('#modal-win').setAttribute('aria-hidden','true');
}

// Input handlers
window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if (['arrowup','w'].includes(e.key) || k==='w') { e.preventDefault(); movePlayer(0,-1); }
  else if (['arrowdown','s'].includes(e.key) || k==='s') { e.preventDefault(); movePlayer(0,1); }
  else if (['arrowleft','a'].includes(e.key) || k==='a') { e.preventDefault(); movePlayer(-1,0); }
  else if (['arrowright','d'].includes(e.key) || k==='d') { e.preventDefault(); movePlayer(1,0); }
});

// On-screen controls
document.addEventListener('click', e=>{
  const dir = e.target.closest('.dir');
  if (dir){ const d = dir.dataset.dir; if (d==='up') movePlayer(0,-1); if (d==='down') movePlayer(0,1); if (d==='left') movePlayer(-1,0); if (d==='right') movePlayer(1,0); }
});

// UI buttons
$('#play-btn').addEventListener('click', ()=>{ startLevel(state.levelIndex); });
$('#retry-btn').addEventListener('click', ()=>{ hideModals(); startLevel(state.levelIndex); });
$('#home-from-lose').addEventListener('click', ()=>{ hideModals(); showScreen('start'); });
$('#home-from-win').addEventListener('click', ()=>{ hideModals(); showScreen('start'); });
$('#next-level').addEventListener('click', ()=>{ hideModals(); startLevel(state.levelIndex+1); });
$('#reset-game').addEventListener('click', ()=>{ localStorage.removeItem('waterHero.progress'); state.totalScore=0; state.levelIndex=0; $('#total-score').textContent=0; renderLevelButtons(); showScreen('start'); });

// celebrate - simple confetti
function celebrate(){
  // play a short celebratory chime
  playWinSound();
  const colors = ['#FFD166','#EF476F','#06D6A0','#118AB2','#06AED5'];
  const count = 80;
  for (let i=0;i<count;i++){
    const el = document.createElement('div'); el.className='confetti-piece';
    el.style.left = Math.random()*100 + '%';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = (6+Math.random()*14)+'px'; el.style.height = (8+Math.random()*16)+'px';
    el.style.opacity = 0.95;
    const dur = 1800 + Math.floor(Math.random()*1600);
    el.style.animationDuration = dur + 'ms';
    el.style.transform = `translateY(-10vh) rotate(${Math.random()*360}deg)`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), dur + 200);
  }
}

// small WebAudio chime for the win celebration
function playWinSound(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle';
    o1.frequency.setValueAtTime(660, now);
    o2.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(now); o2.start(now);
    o1.stop(now + 1.4); o2.stop(now + 1.4);
  }catch(e){ /* ignore if Audio API not available or blocked */ }
}

// level buttons
function renderLevelButtons(){
  const wrap = $('#level-buttons'); wrap.innerHTML='';
  levels.forEach((l,i)=>{
    const b = document.createElement('button'); b.className='level-btn'; b.textContent = i+1; b.addEventListener('click', ()=> startLevel(i));
    wrap.appendChild(b);
  });
}

// init
loadProgress(); renderLevelButtons(); showScreen('start');


