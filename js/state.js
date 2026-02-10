/* Mutable game state */
export let state = {
    gridSize: 6,
    board: [],
    selectedTile: null,
    score: 0,
    currentLevel: 0,
    movesLeft: 0,
    timeLeft: 0,
    isLocked: true,
    timerInterval: null,
    comboCount: 0,
    comboTimeout: null,
    bonus: { active: false, timer: null, element: null, hasAppeared: false },
    dragState: { active: false, startX: 0, startY: 0, startTile: null },
    settings: { sound: true, lang: 'en' },
    dynamicStyleSheet: null,
    shufflesLeft: 0,
};

export const SHUFFLES_PER_LEVEL = 2;
