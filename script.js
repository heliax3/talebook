const scenes = [...document.querySelectorAll('.scene')];
const dots = document.getElementById('pageDots');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const pageNumber = document.getElementById('pageNumber');
const liveRegion = document.getElementById('liveRegion');
let currentPage = 0;
let soundOn = false;
let audioContext;
const packed = new Set();
const built = new Set();
let selectedSupply = null;
let selectedPart = null;

const pageNames = ['Cover', 'Look up!', 'Pack up', 'Build it', 'Blast off', 'Hello, Mars!'];
scenes.forEach((_, i) => {
  const dot = document.createElement('span');
  dot.className = `page-dot${i === 0 ? ' active' : ''}`;
  dot.title = pageNames[i];
  dots.appendChild(dot);
});

function announce(text) { liveRegion.textContent = text; }
function showPage(index) {
  currentPage = Math.max(0, Math.min(scenes.length - 1, index));
  scenes.forEach((scene, i) => {
    const active = i === currentPage;
    scene.classList.toggle('is-active', active);
    scene.setAttribute('aria-hidden', String(!active));
  });
  [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === currentPage));
  prevButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage === scenes.length - 1;
  pageNumber.textContent = pageNames[currentPage];
  announce(`Now on ${pageNames[currentPage]}`);
  if (currentPage === 4) document.getElementById('countdown').textContent = 'Tap the rocket!';
}
function goNext() { if (currentPage < scenes.length - 1) showPage(currentPage + 1); }
function goPrev() { if (currentPage > 0) showPage(currentPage - 1); }

function sparkle(target, amount = 8) {
  const layer = document.getElementById('sparkleLayer');
  if (!layer) return;
  const rect = target.getBoundingClientRect(); const parent = layer.getBoundingClientRect();
  for (let i = 0; i < amount; i++) {
    const spark = document.createElement('span'); spark.className = 'sparkle'; spark.textContent = i % 2 ? '✦' : '✧';
    spark.style.left = `${rect.left - parent.left + rect.width / 2}px`; spark.style.top = `${rect.top - parent.top + rect.height / 2}px`;
    spark.style.setProperty('--dx', `${Math.cos(i * 0.8) * (35 + Math.random() * 35)}px`); spark.style.setProperty('--dy', `${Math.sin(i * 0.8) * (35 + Math.random() * 35)}px`);
    layer.appendChild(spark); setTimeout(() => spark.remove(), 1000);
  }
}
function beep(frequency = 440, duration = .12, type = 'sine') {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
  oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.045, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
function launchSound() { [220, 330, 440, 660].forEach((note, i) => setTimeout(() => beep(note, .18, 'sawtooth'), i * 100)); }

document.getElementById('startButton').addEventListener('click', () => { beep(660); showPage(1); });
prevButton.addEventListener('click', goPrev); nextButton.addEventListener('click', goNext);
document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') goNext(); if (e.key === 'ArrowLeft') goPrev(); if (e.key === 'Escape') closeHelp(); });

document.getElementById('marsTarget').addEventListener('click', e => {
  const target = e.currentTarget; target.classList.add('found');
  document.getElementById('spaceMessage').textContent = 'There it is! Mars is waiting!'; sparkle(target); beep(740); announce('You found Mars!');
});

function addSupply(supply) {
  const key = supply.dataset.supply; if (packed.has(key)) return;
  packed.add(key); supply.style.visibility = 'hidden'; supply.setAttribute('aria-hidden', 'true');
  const item = document.createElement('span'); item.textContent = supply.querySelector('span').textContent; item.title = key; document.getElementById('backpackItems').appendChild(item);
  document.getElementById('packCount').textContent = packed.size; document.getElementById('packProgress').style.width = `${packed.size * 25}%`;
  document.getElementById('packMessage').textContent = packed.size === 4 ? 'All packed! Johnny is ready!' : 'Great choice! Keep packing!';
  sparkle(document.getElementById('backpackDrop'), 5); beep(420 + packed.size * 80);
  if (packed.size === 4) announce('All supplies packed. Johnny is ready!');
}
document.querySelectorAll('.supply').forEach(supply => {
  supply.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', supply.dataset.supply); selectedSupply = supply; });
  supply.addEventListener('click', () => { if (packed.has(supply.dataset.supply)) return; document.querySelectorAll('.supply').forEach(s => s.classList.remove('selected')); supply.classList.add('selected'); selectedSupply = supply; });
  supply.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedSupply = supply; document.getElementById('backpackDrop').focus(); } });
});
const backpack = document.getElementById('backpackDrop');
backpack.addEventListener('dragover', e => e.preventDefault());
backpack.addEventListener('drop', e => { e.preventDefault(); const supply = [...document.querySelectorAll('.supply')].find(s => s.dataset.supply === e.dataTransfer.getData('text/plain')); if (supply) addSupply(supply); });
backpack.addEventListener('click', () => { if (selectedSupply) { addSupply(selectedSupply); selectedSupply = null; } });
backpack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backpack.click(); } });

function addPart(part) {
  const key = part.dataset.part; if (built.has(key)) return;
  built.add(key); part.classList.add('selected'); part.draggable = false; part.style.opacity = '.35';
  document.getElementById('buildStatus').textContent = `${built.size} of 4 pieces in place`;
  const rocket = document.getElementById('builtRocket'); rocket.classList.add('ready'); sparkle(rocket, 4); beep(320 + built.size * 100);
  if (built.size === 4) { document.getElementById('buildStatus').textContent = 'Rocket complete! Tap Next to launch!'; announce('Rocket complete!'); }
}
document.querySelectorAll('.rocket-part').forEach(part => {
  part.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', part.dataset.part); selectedPart = part; });
  part.addEventListener('click', () => { selectedPart = part; addPart(part); });
  part.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addPart(part); } });
});
const builtRocket = document.getElementById('builtRocket');
builtRocket.addEventListener('dragover', e => e.preventDefault());
builtRocket.addEventListener('drop', e => { e.preventDefault(); const part = [...document.querySelectorAll('.rocket-part')].find(p => p.dataset.part === e.dataTransfer.getData('text/plain')); if (part) addPart(part); });

document.getElementById('launchRocket').addEventListener('click', e => {
  const rocket = e.currentTarget; if (rocket.classList.contains('launched')) return;
  rocket.classList.add('launched'); document.getElementById('countdown').textContent = '3... 2... 1... WHOOSH!'; launchSound(); sparkle(rocket, 12); announce('Johnny is blasting off!');
  setTimeout(() => { showPage(5); document.getElementById('countdown').textContent = 'Tap the rocket!'; }, 2350);
});

document.querySelectorAll('.mars-object').forEach(object => object.addEventListener('click', () => {
  const messages = { 'rock rock-a': 'A shiny space rock!', 'mars-object rover': 'The rover says beep beep!', 'mars-object flag-object': 'Johnny planted a flag!' };
  document.getElementById('marsMessage').textContent = messages[object.className] || 'What a discovery!'; sparkle(object, 5); beep(560);
  if (object.classList.contains('flag-object')) document.getElementById('snackAlert').classList.add('show');
}));

const helpModal = document.getElementById('helpModal');
function closeHelp() { helpModal.hidden = true; }
document.getElementById('helpButton').addEventListener('click', () => { helpModal.hidden = false; document.getElementById('gotItButton').focus(); });
document.getElementById('closeHelp').addEventListener('click', closeHelp); document.getElementById('gotItButton').addEventListener('click', closeHelp);
document.getElementById('soundToggle').addEventListener('click', e => { soundOn = !soundOn; e.currentTarget.textContent = soundOn ? '🔊' : '🔈'; e.currentTarget.setAttribute('aria-pressed', String(soundOn)); e.currentTarget.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on'); if (soundOn) beep(660); });
showPage(0);
