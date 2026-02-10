/**
 * Big Life: Ticket Match - main application
 */
import {
    CHARACTERS,
    TRANSITION_IMAGES,
    BONUS_CHARACTER_IMAGE,
    BONUS_POINTS,
    TILE_TYPES,
    TILE_VISUALS,
    LEVEL_CONFIG,
    getAllImageUrls,
} from './config.js';
import { locales } from './locales.js';
import { state, SHUFFLES_PER_LEVEL } from './state.js';

// --- TELEGRAM WEB APP ---
try {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    Telegram.WebApp.setHeaderColor('#0b0f1a');
    Telegram.WebApp.setBackgroundColor('#0b0f1a');
} catch (e) {
    console.warn("Telegram WebApp not found. Running in browser mode.");
}

// --- DOM ELEMENTS ---
const DOMElements = {
    loadingScreen: document.getElementById('loading-screen'),
    loadingBar: document.getElementById('loading-bar'),
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    characterPanel: document.getElementById('character-panel'),
    characterAvatar: document.getElementById('character-avatar'),
    characterImage: document.getElementById('character-image'),
    characterLine: document.getElementById('character-line'),
    scoreValue: document.getElementById('score-value'),
    movesTimeLabel: document.getElementById('moves-time-label'),
    movesTimeValue: document.getElementById('moves-time-value'),
    levelValue: document.getElementById('level-value'),
    grid: document.getElementById('game-grid'),
    gridContainer: document.getElementById('game-grid-container'),
    comboMultiplier: document.getElementById('combo-multiplier'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalButtons: document.getElementById('modal-buttons'),
    shuffleButton: document.getElementById('shuffle-button'),
    soundToggle: document.getElementById('sound-toggle'),
    closeButton: document.getElementById('close-button'),
    startButton: document.getElementById('start-button'),
    levelTransitionScreen: document.getElementById('level-transition-screen'),
    transitionImage: document.getElementById('transition-image'),
    transitionText: document.getElementById('transition-text'),
    winVideoContainer: document.getElementById('win-video-container'),
    winVideo: document.getElementById('win-video'),
    winAudio: document.getElementById('win-audio'),
};

// --- LOCALIZATION ---
function t(key, replacements = {}) {
    let translation = (locales[state.settings.lang] && locales[state.settings.lang][key]) || locales['en'][key] || key;
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return translation;
}

function applyLocalization() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.documentElement.dir = 'ltr';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('border-primary', btn.dataset.lang === state.settings.lang);
        btn.classList.toggle('border-slate-600', btn.dataset.lang !== state.settings.lang);
    });
}

// --- SOUNDS ---
const sounds = {};
function initSounds() {
    sounds.swap = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    sounds.match = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
    sounds.win = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.5 } }).toDestination();
    sounds.fail = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 } }).toDestination();
    sounds.unlock = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    sounds.bonus = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
}

function playSound(sound) {
    if (!state.settings.sound || !sounds[sound]) return;
    try {
        switch (sound) {
            case 'swap': sounds.swap.triggerAttackRelease('C5', '8n'); break;
            case 'match': sounds.match.triggerAttackRelease('G5', '8n', Tone.now() + state.comboCount * 0.05); break;
            case 'unlock': sounds.unlock.triggerAttackRelease('A4', '16n'); break;
            case 'bonus': sounds.bonus.triggerAttackRelease('C6', '8n'); break;
            case 'win':
                const now = Tone.now();
                sounds.win.triggerAttackRelease('C5', '8n', now);
                sounds.win.triggerAttackRelease('E5', '8n', now + 0.2);
                sounds.win.triggerAttackRelease('G5', '8n', now + 0.4);
                break;
            case 'fail': sounds.fail.triggerAttackRelease('C3', '4n'); break;
        }
    } catch (e) { console.error("Sound error:", e); }
}

// --- UI ---
function showScreen(screen) {
    DOMElements.loadingScreen.classList.add('hidden');
    DOMElements.startScreen.classList.add('hidden');
    DOMElements.gameScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

function updateCharacterPanel(status) {
    DOMElements.characterAvatar.classList.remove('breathe', 'shake', 'nod');
    if (status === 'idle') DOMElements.characterAvatar.classList.add('breathe');
    if (status === 'angry') DOMElements.characterAvatar.classList.add('shake');
    if (status === 'happy') DOMElements.characterAvatar.classList.add('nod');
}

function updateHUD() {
    const config = LEVEL_CONFIG[state.currentLevel];
    DOMElements.scoreValue.textContent = `${state.score} / ${config.target}`;
    DOMElements.levelValue.textContent = state.currentLevel + 1;
    if (config.moves) {
        DOMElements.movesTimeLabel.textContent = t('moves');
        DOMElements.movesTimeValue.textContent = state.movesLeft;
    } else {
        DOMElements.movesTimeLabel.textContent = t('time');
        DOMElements.movesTimeValue.textContent = state.timeLeft;
    }
    const target = config.target;
    const progress = state.score / target;
    const lineKeyPrefix = config.character.prefix;
    let status = 'idle';
    let lineKey;
    if (progress >= 1) {
        status = 'happy';
        lineKey = `${lineKeyPrefix}${state.currentLevel + 1}_ok`;
    } else if (progress >= 0.8) {
        status = 'happy';
        lineKey = `${lineKeyPrefix}${state.currentLevel + 1}_nearly`;
    } else if (progress >= 0.4) {
        status = 'idle';
        lineKey = `${lineKeyPrefix}${state.currentLevel + 1}_progress`;
    } else if (state.score > 0) {
        status = 'angry';
        lineKey = `${lineKeyPrefix}${state.currentLevel + 1}_low`;
    } else {
        status = 'idle';
        lineKey = `${lineKeyPrefix}${state.currentLevel + 1}_start`;
    }
    updateCharacterPanel(status);
    DOMElements.characterLine.textContent = t(lineKey);
    if (DOMElements.shuffleButton) {
        const label = t('shuffle');
        DOMElements.shuffleButton.textContent = state.shufflesLeft > 0 ? `${label} (${state.shufflesLeft})` : label;
        DOMElements.shuffleButton.disabled = state.shufflesLeft <= 0;
    }
}

function showModal({ titleKey, bodyKey, bodyParams, buttons }) {
    DOMElements.modalTitle.textContent = t(titleKey);
    DOMElements.modalBody.textContent = t(bodyKey, bodyParams);
    DOMElements.modalButtons.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = t(btn.textKey);
        button.className = 'px-6 py-2 text-lg font-bold rounded-lg bg-purple-600 text-white neon-button';
        button.onclick = () => {
            DOMElements.modal.classList.add('hidden');
            btn.action();
        };
        DOMElements.modalButtons.appendChild(button);
    });
    DOMElements.modal.classList.remove('hidden');
}

function showLevelTransition() {
    const transitionKey = `level${state.currentLevel + 1}`;
    DOMElements.transitionImage.src = TRANSITION_IMAGES[transitionKey];
    const textKey = LEVEL_CONFIG[state.currentLevel].character.prefix + (state.currentLevel + 1) + "_pass";
    DOMElements.transitionText.textContent = t(textKey);
    DOMElements.levelTransitionScreen.classList.remove('hidden');
    DOMElements.levelTransitionScreen.classList.add('fade-in');
    setTimeout(() => {
        DOMElements.levelTransitionScreen.classList.remove('fade-in');
        DOMElements.levelTransitionScreen.classList.add('fade-out');
        setTimeout(() => {
            DOMElements.levelTransitionScreen.classList.add('hidden');
            DOMElements.levelTransitionScreen.classList.remove('fade-out');
            startLevel(state.currentLevel + 1);
        }, 1000);
    }, 5000);
}

// --- GAME LOGIC ---
function startLevel(levelIndex) {
    clearBonusCharacter();
    state.bonus.hasAppeared = false;
    state.currentLevel = levelIndex;
    state.score = 0;
    const config = LEVEL_CONFIG[levelIndex];
    state.movesLeft = config.moves;
    state.timeLeft = config.timer;
    state.shufflesLeft = SHUFFLES_PER_LEVEL;
    DOMElements.characterImage.src = config.character.src;
    DOMElements.gameScreen.className = `w-full h-screen flex flex-col md:flex-row p-2 md:p-4 gap-4 ${config.background}`;
    setupGrid();
    updateHUD();
    showScreen(DOMElements.gameScreen);
    state.isLocked = false;
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (config.timer) {
        state.timeLeft = config.timer;
        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            updateHUD();
            if (state.timeLeft <= 0) {
                clearInterval(state.timerInterval);
                endLevel(false);
            }
        }, 1000);
    }
    scheduleBonusCharacter();
}

function removeAllLocks() {
    for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
            const tile = state.board[r][c];
            if (tile?.locked) {
                tile.locked = false;
                const overlay = tile.element.querySelector('.lock-overlay');
                if (overlay) overlay.remove();
            }
        }
    }
}

function placeLocks(count) {
    let placedLocks = 0;
    let attempts = 0;
    const maxAttempts = count * state.gridSize * state.gridSize;
    while (placedLocks < count && attempts < maxAttempts) {
        attempts++;
        const r = Math.floor(Math.random() * state.gridSize);
        const c = Math.floor(Math.random() * state.gridSize);
        if (!state.board[r][c].locked) {
            state.board[r][c].locked = true;
            const overlay = document.createElement('div');
            overlay.className = 'lock-overlay';
            overlay.textContent = '⛓️';
            state.board[r][c].element.appendChild(overlay);
            placedLocks++;
        }
    }
}

function setupGrid(reshuffleDepth = 0) {
    const MAX_RESHUFFLE_DEPTH = 12;
    state.gridSize = window.innerWidth < 768 ? 5 : 6;
    DOMElements.grid.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;
    state.board = [];
    DOMElements.grid.innerHTML = '';
    for (let r = 0; r < state.gridSize; r++) {
        state.board[r] = [];
        for (let c = 0; c < state.gridSize; c++) {
            let tileType;
            do {
                tileType = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
            } while (
                (c >= 2 && state.board[r][c - 1]?.type === tileType && state.board[r][c - 2]?.type === tileType) ||
                (r >= 2 && state.board[r - 1][c]?.type === tileType && state.board[r - 2][c]?.type === tileType)
            );
            createTile(r, c, tileType, false);
        }
    }
    let locksToPlace = LEVEL_CONFIG[state.currentLevel].locks;
    if (reshuffleDepth >= MAX_RESHUFFLE_DEPTH && locksToPlace > 2) locksToPlace = Math.min(2, locksToPlace);
    const LOCK_RETRIES = 30;
    let lockAttempt = 0;
    let hasMoves = false;
    do {
        if (lockAttempt > 0) removeAllLocks();
        placeLocks(locksToPlace);
        hasMoves = checkForPossibleMoves();
        lockAttempt++;
    } while (!hasMoves && lockAttempt < LOCK_RETRIES);
    if (!hasMoves && reshuffleDepth < MAX_RESHUFFLE_DEPTH) setupGrid(reshuffleDepth + 1);
}

function createTile(r, c, type, locked) {
    const tile = { type, locked, element: document.createElement('div') };
    tile.element.className = 'tile';
    tile.element.dataset.r = r;
    tile.element.dataset.c = c;
    const visual = TILE_VISUALS[type];
    if (visual.type === 'image') {
        const img = document.createElement('img');
        img.src = visual.value;
        tile.element.appendChild(img);
    } else {
        tile.element.textContent = visual.value;
    }
    DOMElements.grid.appendChild(tile.element);
    state.board[r][c] = tile;
}

function getCoords(e) {
    if (e.touches && e.touches.length >= 1) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length >= 1) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function handlePointerStart(e) {
    e.preventDefault();
    if (state.isLocked) return;
    const startTileEl = e.target.closest('.tile');
    if (!startTileEl) return;
    const r = parseInt(startTileEl.dataset.r);
    const c = parseInt(startTileEl.dataset.c);
    if (state.board[r][c].locked) return;
    const coords = getCoords(e);
    state.dragState = { active: true, startX: coords.x, startY: coords.y, startTile: { r, c, element: startTileEl } };
    const SWIPE_THRESHOLD = 28;

    const handlePointerMove = (moveEvent) => {
        if (!state.dragState.active) return;
        moveEvent.preventDefault();
        const pos = getCoords(moveEvent);
        const deltaX = pos.x - state.dragState.startX;
        const deltaY = pos.y - state.dragState.startY;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            let { r, c } = state.dragState.startTile;
            let nr = r, nc = c;
            if (Math.abs(deltaX) > Math.abs(deltaY)) nc = deltaX > 0 ? c + 1 : c - 1;
            else nr = deltaY > 0 ? r + 1 : r - 1;
            if (nr >= 0 && nr < state.gridSize && nc >= 0 && nc < state.gridSize) swapTiles(r, c, nr, nc);
            cleanupListeners();
        }
    };

    const handlePointerEnd = () => {
        if (state.dragState.active) handleTap(state.dragState.startTile);
        cleanupListeners();
    };

    function handleTouchMove(te) {
        if (!state.dragState.active || te.touches.length === 0) return;
        te.preventDefault();
        const pos = { x: te.touches[0].clientX, y: te.touches[0].clientY };
        const deltaX = pos.x - state.dragState.startX;
        const deltaY = pos.y - state.dragState.startY;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            let { r, c } = state.dragState.startTile;
            let nr = r, nc = c;
            if (Math.abs(deltaX) > Math.abs(deltaY)) nc = deltaX > 0 ? c + 1 : c - 1;
            else nr = deltaY > 0 ? r + 1 : r - 1;
            if (nr >= 0 && nr < state.gridSize && nc >= 0 && nc < state.gridSize) swapTiles(r, c, nr, nc);
            cleanupListeners();
        }
    }

    function handleTouchEnd() {
        if (state.dragState.active) handleTap(state.dragState.startTile);
        cleanupListeners();
    }

    const cleanupListeners = () => {
        state.dragState.active = false;
        document.removeEventListener('pointermove', handlePointerMove, true);
        document.removeEventListener('pointerup', handlePointerEnd, true);
        document.removeEventListener('pointercancel', handlePointerEnd, true);
        document.removeEventListener('touchmove', handleTouchMove, { passive: false });
        document.removeEventListener('touchend', handleTouchEnd, true);
        document.removeEventListener('touchcancel', handleTouchEnd, true);
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerEnd, true);
    document.addEventListener('pointercancel', handlePointerEnd, true);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('touchcancel', handleTouchEnd, true);
}

function handleTap({ r, c, element }) {
    if (!state.selectedTile) {
        state.selectedTile = { r, c, element };
        element.classList.add('selected');
        playSound('swap');
    } else {
        const prev = state.selectedTile;
        prev.element.classList.remove('selected');
        const isAdjacent = Math.abs(prev.r - r) + Math.abs(prev.c - c) === 1;
        if (isAdjacent && (prev.r !== r || prev.c !== c)) swapTiles(prev.r, prev.c, r, c);
        state.selectedTile = null;
    }
}

async function swapTiles(r1, c1, r2, c2) {
    if (state.isLocked) return;
    const tile1 = state.board[r1][c1];
    const tile2 = state.board[r2][c2];
    if (tile1.locked || tile2.locked) return;
    state.isLocked = true;
    playSound('swap');
    const el1 = tile1.element;
    const el2 = tile2.element;
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    el1.style.transition = 'transform 0.2s ease-in-out';
    el2.style.transition = 'transform 0.2s ease-in-out';
    el1.style.transform = `translate(${rect2.left - rect1.left}px, ${rect2.top - rect1.top}px)`;
    el2.style.transform = `translate(${rect1.left - rect2.left}px, ${rect1.top - rect2.top}px)`;
    await new Promise(res => setTimeout(res, 200));
    [state.board[r1][c1], state.board[r2][c2]] = [state.board[r2][c2], state.board[r1][c1]];
    [el1.dataset.r, el2.dataset.r] = [el2.dataset.r, el1.dataset.r];
    [el1.dataset.c, el2.dataset.c] = [el2.dataset.c, el1.dataset.c];
    el1.style.transform = '';
    el2.style.transform = '';
    el1.style.transition = '';
    el2.style.transition = '';
    const tempEl = document.createElement('div');
    el1.replaceWith(tempEl);
    el2.replaceWith(el1);
    tempEl.replaceWith(el2);
    const matches = findMatches();
    if (matches.size > 0) {
        if (LEVEL_CONFIG[state.currentLevel].moves !== null) state.movesLeft--;
        updateHUD();
        await resolveMatches(matches);
        if (LEVEL_CONFIG[state.currentLevel].moves !== null && state.movesLeft <= 0 && state.score < LEVEL_CONFIG[state.currentLevel].target) endLevel(false);
    } else {
        [state.board[r1][c1], state.board[r2][c2]] = [state.board[r2][c2], state.board[r1][c1]];
        [el1.dataset.r, el2.dataset.r] = [el2.dataset.r, el1.dataset.r];
        [el1.dataset.c, el2.dataset.c] = [el2.dataset.c, el1.dataset.c];
        const tempEl2 = document.createElement('div');
        el1.replaceWith(tempEl2);
        el2.replaceWith(el1);
        tempEl2.replaceWith(el2);
        DOMElements.grid.classList.add('shake');
        setTimeout(() => DOMElements.grid.classList.remove('shake'), 350);
    }
    if (!checkForPossibleMoves()) await reshuffleGrid();
    state.isLocked = false;
}

function findMatches() {
    const matches = new Set();
    for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize - 2; c++) {
            const tile1 = state.board[r][c];
            const tile2 = state.board[r][c + 1];
            const tile3 = state.board[r][c + 2];
            if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) matches.add(tile1).add(tile2).add(tile3);
        }
    }
    for (let c = 0; c < state.gridSize; c++) {
        for (let r = 0; r < state.gridSize - 2; r++) {
            const tile1 = state.board[r][c];
            const tile2 = state.board[r + 1][c];
            const tile3 = state.board[r + 2][c];
            if (tile1 && tile2 && tile3 && tile1.type === tile2.type && tile2.type === tile3.type) matches.add(tile1).add(tile2).add(tile3);
        }
    }
    return matches;
}

async function resolveMatches(matches) {
    state.isLocked = true;
    startCombo();
    let scoreToAdd = 0;
    const unlockedTiles = new Set();
    for (const tile of matches) {
        const r = parseInt(tile.element.dataset.r);
        const c = parseInt(tile.element.dataset.c);
        if (!state.board[r] || state.board[r][c] === null) continue;
        scoreToAdd += 10;
        createParticles(tile.element);
        tile.element.classList.add('matched');
        state.board[r][c] = null;
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
            if (nr >= 0 && nr < state.gridSize && nc >= 0 && nc < state.gridSize && state.board[nr][nc]?.locked) unlockedTiles.add(state.board[nr][nc]);
        });
    }
    if (matches.size >= 4) scoreToAdd += (matches.size - 3) * 8;
    if (matches.size > 0) playSound('match');
    if (unlockedTiles.size > 0) playSound('unlock');
    unlockedTiles.forEach(tile => {
        tile.locked = false;
        const overlay = tile.element.querySelector('.lock-overlay');
        if (overlay) {
            overlay.style.animation = 'unlock-pop 0.3s ease-out forwards';
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
        }
    });
    state.score += Math.floor(scoreToAdd * (1 + state.comboCount * 0.2));
    updateHUD();
    await new Promise(res => setTimeout(res, 200));
    await cascadeAndRefill();
    const newMatches = findMatches();
    if (newMatches.size > 0) await resolveMatches(newMatches);
    else {
        endCombo();
        state.isLocked = false;
        if (state.score >= LEVEL_CONFIG[state.currentLevel].target) endLevel(true);
    }
}

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const containerRect = DOMElements.grid.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 5 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        p.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
        const angle = Math.random() * 360;
        const distance = Math.random() * 40 + 20;
        const tx = Math.cos(angle * Math.PI / 180) * distance;
        const ty = Math.sin(angle * Math.PI / 180) * distance;
        const animationName = `particle-burst-${Date.now()}-${i}`;
        p.style.animationName = animationName;
        const keyframes = `@keyframes ${animationName} { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(${tx}px, ${ty}px) scale(0); opacity: 0; } }`;
        if (state.dynamicStyleSheet.cssRules.length > 50) state.dynamicStyleSheet.deleteRule(0);
        state.dynamicStyleSheet.insertRule(keyframes, state.dynamicStyleSheet.cssRules.length);
        element.parentElement.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}

async function cascadeAndRefill() {
    for (let c = 0; c < state.gridSize; c++) {
        let emptyRow = state.gridSize - 1;
        for (let r = state.gridSize - 1; r >= 0; r--) {
            if (state.board[r][c] !== null) {
                if (r !== emptyRow) {
                    state.board[emptyRow][c] = state.board[r][c];
                    state.board[r][c] = null;
                    state.board[emptyRow][c].element.dataset.r = emptyRow;
                }
                emptyRow--;
            }
        }
    }
    for (let c = 0; c < state.gridSize; c++) {
        for (let r = 0; r < state.gridSize; r++) {
            if (state.board[r][c] === null) {
                const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
                createTile(r, c, type, false);
            }
        }
    }
    DOMElements.grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) fragment.appendChild(state.board[r][c].element);
    }
    DOMElements.grid.appendChild(fragment);
    await new Promise(res => setTimeout(res, 100));
}

function checkForPossibleMoves() {
    for (let r = 0; r < state.gridSize; r++) {
        for (let c = 0; c < state.gridSize; c++) {
            if (state.board[r][c]?.locked) continue;
            if (c < state.gridSize - 1 && !state.board[r][c + 1]?.locked) {
                [state.board[r][c], state.board[r][c + 1]] = [state.board[r][c + 1], state.board[r][c]];
                if (findMatches().size > 0) {
                    [state.board[r][c], state.board[r][c + 1]] = [state.board[r][c + 1], state.board[r][c]];
                    return true;
                }
                [state.board[r][c], state.board[r][c + 1]] = [state.board[r][c + 1], state.board[r][c]];
            }
            if (r < state.gridSize - 1 && !state.board[r + 1][c]?.locked) {
                [state.board[r][c], state.board[r + 1][c]] = [state.board[r + 1][c], state.board[r][c]];
                if (findMatches().size > 0) {
                    [state.board[r][c], state.board[r + 1][c]] = [state.board[r + 1][c], state.board[r][c]];
                    return true;
                }
                [state.board[r][c], state.board[r + 1][c]] = [state.board[r + 1][c], state.board[r][c]];
            }
        }
    }
    return false;
}

async function reshuffleGrid() {
    state.isLocked = true;
    DOMElements.grid.classList.add('shake');
    await new Promise(res => setTimeout(res, 500));
    DOMElements.grid.classList.remove('shake');
    setupGrid();
    state.isLocked = false;
}

function startCombo() {
    clearTimeout(state.comboTimeout);
    state.comboCount++;
    DOMElements.comboMultiplier.textContent = `x${(1 + state.comboCount * 0.2).toFixed(1)}`;
    DOMElements.comboMultiplier.style.display = 'block';
    state.comboTimeout = setTimeout(endCombo, 1200);
}

function endCombo() {
    state.comboCount = 0;
    DOMElements.comboMultiplier.style.display = 'none';
}

function scheduleBonusCharacter() {
    if (state.bonus.hasAppeared) return;
    state.bonus.timer = setTimeout(showBonusCharacter, Math.random() * 10000 + 10000);
}

function showBonusCharacter() {
    if (state.isLocked || state.bonus.active || state.bonus.hasAppeared) return;
    state.bonus.active = true;
    state.bonus.hasAppeared = true;
    const bonusEl = document.createElement('img');
    bonusEl.src = BONUS_CHARACTER_IMAGE;
    bonusEl.id = 'bonus-character';
    const tileSize = DOMElements.grid.clientWidth / state.gridSize;
    bonusEl.style.width = `${tileSize}px`;
    bonusEl.style.height = `${tileSize}px`;
    const r = Math.floor(Math.random() * state.gridSize);
    const c = Math.floor(Math.random() * state.gridSize);
    bonusEl.style.top = `${r * tileSize}px`;
    bonusEl.style.left = `${c * tileSize}px`;
    bonusEl.style.animation = 'bonus-in 0.3s ease-out forwards';
    bonusEl.onclick = onBonusClick;
    state.bonus.element = bonusEl;
    DOMElements.gridContainer.appendChild(bonusEl);
    state.bonus.timer = setTimeout(clearBonusCharacter, 4000);
}

function onBonusClick() {
    if (!state.bonus.active) return;
    playSound('bonus');
    const points = BONUS_POINTS[state.currentLevel];
    state.score += points;
    updateHUD();
    const notification = document.createElement('div');
    notification.id = 'bonus-notification';
    notification.textContent = t('bonus_points', { points: `+${points}` });
    DOMElements.gridContainer.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
    clearBonusCharacter();
}

function clearBonusCharacter() {
    clearTimeout(state.bonus.timer);
    const bonusToRemove = state.bonus.element;
    if (bonusToRemove) {
        bonusToRemove.style.animation = 'bonus-out 0.3s ease-in forwards';
        setTimeout(() => { if (bonusToRemove.parentNode) bonusToRemove.remove(); }, 300);
    }
    state.bonus.active = false;
    state.bonus.element = null;
}

function endLevel(isWin) {
    state.isLocked = true;
    clearBonusCharacter();
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (isWin) {
        playSound('win');
        if (state.currentLevel < LEVEL_CONFIG.length - 1) showLevelTransition();
        else {
            DOMElements.transitionImage.src = TRANSITION_IMAGES.final;
            DOMElements.transitionText.textContent = t('prod_l3_pass');
            DOMElements.levelTransitionScreen.classList.remove('hidden');
            DOMElements.levelTransitionScreen.classList.add('fade-in');
            setTimeout(() => {
                DOMElements.levelTransitionScreen.classList.add('hidden');
                DOMElements.winVideoContainer.classList.remove('hidden');
                DOMElements.winVideo.play();
                if (state.settings.sound) DOMElements.winAudio.play();
                DOMElements.winVideo.onended = () => { window.location.href = 'https://big-life.org/'; };
            }, 5000);
        }
    } else {
        playSound('fail');
        const config = LEVEL_CONFIG[state.currentLevel];
        const bodyParams = config.moves ? { target: config.target, moves: config.moves } : { target: config.target, time: config.timer };
        showModal({
            titleKey: 'level_fail',
            bodyKey: config.moves ? 'fail_moves' : 'fail_time',
            bodyParams,
            buttons: [{ textKey: 'replay', action: () => startLevel(state.currentLevel) }]
        });
    }
}

function updateSoundButton() {
    DOMElements.soundToggle.textContent = state.settings.sound ? '🔊' : '🔇';
}

// --- INIT ---
function init() {
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    state.dynamicStyleSheet = styleEl.sheet;

    const savedSettings = localStorage.getItem('biglife_settings');
    if (savedSettings) state.settings = JSON.parse(savedSettings);
    else {
        try {
            const userLang = Telegram.WebApp.initDataUnsafe.user.language_code;
            if (locales[userLang]) state.settings.lang = userLang;
        } catch (e) { /* ignore */ }
    }

    const MIN_LOAD_MS = 800;
    const loadStart = Date.now();
    const urls = getAllImageUrls();
    let loaded = 0;
    const total = urls.length;

    function setLoadProgress(pct) {
        DOMElements.loadingBar.style.width = Math.min(100, Math.round(pct)) + '%';
    }

    function tryFinish() {
        if (loaded < total) return;
        const elapsed = Date.now() - loadStart;
        const wait = Math.max(0, MIN_LOAD_MS - elapsed);
        setTimeout(() => {
            setLoadProgress(100);
            setTimeout(() => showScreen(DOMElements.startScreen), 200);
        }, wait);
    }

    if (total === 0) tryFinish();
    else {
        urls.forEach(url => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loaded++;
                setLoadProgress((loaded / total) * 98);
                tryFinish();
            };
            img.src = url;
        });
    }

    initSounds();
    applyLocalization();
    updateSoundButton();

    DOMElements.startButton.onclick = () => {
        Tone.start();
        startLevel(0);
    };

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = () => {
            state.settings.lang = btn.dataset.lang;
            localStorage.setItem('biglife_settings', JSON.stringify(state.settings));
            applyLocalization();
        };
    });

    const gridOpt = { passive: false };
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        DOMElements.grid.addEventListener('touchstart', handlePointerStart, gridOpt);
    } else {
        DOMElements.grid.addEventListener('pointerdown', handlePointerStart, gridOpt);
    }

    DOMElements.shuffleButton.onclick = async () => {
        if (state.shufflesLeft <= 0 || state.isLocked) return;
        state.shufflesLeft--;
        await reshuffleGrid();
        updateHUD();
    };

    DOMElements.soundToggle.onclick = () => {
        state.settings.sound = !state.settings.sound;
        updateSoundButton();
        localStorage.setItem('biglife_settings', JSON.stringify(state.settings));
    };

    DOMElements.closeButton.onclick = () => {
        try { Telegram.WebApp.close(); } catch (e) { alert('Closing...'); }
    };
}

window.addEventListener('load', init);
