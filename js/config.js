/* Game assets and level config */
export const CHARACTERS = {
    security: { src: 'https://files.catbox.moe/c2srvj.png', prefix: 'sec_l' },
    operator: { src: 'https://files.catbox.moe/5aelf0.png', prefix: 'op_l' },
    producer: { src: 'https://files.catbox.moe/rr9dt2.png', prefix: 'prod_l' }
};

export const TRANSITION_IMAGES = {
    level1: 'https://files.catbox.moe/2thq5e.png',
    level2: 'https://files.catbox.moe/2dk3q4.png',
    final: 'https://files.catbox.moe/nlz0wc.png'
};

export const BONUS_CHARACTER_IMAGE = 'https://files.catbox.moe/u0s6lo.png';
export const BONUS_POINTS = [250, 350, 500];

export const TILE_TYPES = ['ticket', 'headphones', 'mic', 'note', 'gem'];
export const TILE_VISUALS = {
    ticket: { type: 'image', value: 'https://files.catbox.moe/dtccy6.png' },
    headphones: { type: 'image', value: 'https://files.catbox.moe/qsgdnu.png' },
    mic: { type: 'image', value: 'https://files.catbox.moe/o6twbs.png' },
    note: { type: 'image', value: 'https://files.catbox.moe/zqfc46.png' },
    gem: { type: 'image', value: 'https://files.catbox.moe/i8d1gt.png' },
};

export const LEVEL_CONFIG = [
    { target: 1000, moves: 25, timer: null, background: 'level-1', character: CHARACTERS.security, locks: 0 },
    { target: 1500, moves: 30, timer: null, background: 'level-2', character: CHARACTERS.operator, locks: 4 },
    { target: 3000, moves: null, timer: 150, background: 'level-3', character: CHARACTERS.producer, locks: 8 },
];

export function getAllImageUrls() {
    const urls = new Set(['https://files.catbox.moe/fd893h.png']);
    Object.values(CHARACTERS).forEach(ch => urls.add(ch.src));
    Object.values(TRANSITION_IMAGES).forEach(url => urls.add(url));
    urls.add(BONUS_CHARACTER_IMAGE);
    Object.values(TILE_VISUALS).forEach(v => { if (v.type === 'image') urls.add(v.value); });
    return Array.from(urls);
}
