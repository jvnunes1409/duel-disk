// Fundo animado com cartas que viram.
// ===== Fundo estilo Duel Links: cartas viram sozinhas =====
const BGN = {
    'Reis de Fogo': [
      'Fire King High Avatar Garunix',
      'Fire King Avatar Barong',
      'Fire King Avatar Arvata',
      'Fire King Avatar Yaksha',
      'Fire King Avatar Kirin',
      'Fire King Avatar Garuda',
      'Solar Flare Dragon',
      'Blaze Fenix, the Burning Bombardment Bird',
      'Fire Princess',
      'Inferno Fire Blast',
    ],
    'O Rei Carmesim': [
      'Red Dragon Archfiend',
      'Red Nova Dragon',
      'Red Wyvern',
      'Hot Red Dragon Archfiend Abyss',
      'Scarlight Red Dragon Archfiend',
      'Crimson Blader',
      'Dark Resonator',
      'Red Resonator',
      'Black-Winged Dragon',
    ],
    'Yusei Fudo': [
      'Stardust Dragon',
      'Junk Warrior',
      'Junk Synchron',
      'Road Warrior',
      'Quillbolt Hedgehog',
      'Nitro Warrior',
      'Turbo Warrior',
      'Speed Warrior',
      'Shooting Star Dragon',
      'Stardust Spark Dragon',
      'Formula Synchron',
    ],
    'Crow Hogan': [
      'Black-Winged Dragon',
      'Blackwing - Gale the Whirlwind',
      'Blackwing - Shura the Blue Flame',
      'Blackwing - Kalut the Moon Shadow',
      'Blackwing - Sirocco the Dawn',
      'Blackwing - Bora the Spear',
      'Blackwing - Blizzard the Far North',
      'Blackwing Armor Master',
      'Blackwing - Zephyros the Elite',
      'Black Whirlwind',
    ],
    'Horda Zumbi': [
      'Red-Eyes Zombie Necro Dragon',
      'Zombie World',
      'Mezuki',
      'Ryu Kokki',
      'Pyramid Turtle',
      'Vampire Lord',
      'Zombie Master',
      'Ghoul with an Appetite',
      'Doomkaiser Dragon',
      'Dark Necrofear',
    ],
    'Akiza Izinski': [
      'Black Rose Dragon',
      'Black Rose Moonlight Dragon',
      'Lonefire Blossom',
      'Twilight Rose Knight',
      'Rose Archer',
      'Dandylion',
      'Doppelganger',
      'Mind Crush',
      'Dark Verger',
    ],
    'Encantadoras Espirituais': [
      'Hiita the Fire Charmer',
      'Eria the Water Charmer',
      'Wynn the Wind Charmer',
      'Aussa the Earth Charmer',
      'Hiita the Fire Charmer, Ablaze',
      'Eria the Water Charmer, Gentle',
      'Wynn the Wind Charmer, Verdant',
      'Aussa the Earth Charmer, Immovable',
      'Lyna the Light Charmer',
      'Spiritual Water Art - Aoi',
      'Spiritual Fire Art - Kurenai',
      'Spiritual Earth Art - Kurogane',
      'Spiritual Wind Art - Miyabi',
    ],
    'Correntes Glaciais': [
      'Revealer of the Ice Barrier',
      'Ice Master',
      'Mobius the Frost Monarch',
      'Brionac, Dragon of the Ice Barrier',
      'Gungnir, Dragon of the Ice Barrier',
      'Cryomancer of the Ice Barrier',
      'Secret of the Ice Barrier',
      'Cold Wave',
      'Spirit of the Ice Barrier',
      'Mist Wurm',
    ],
    'Lenda das Feras Cristalinas': [
      'Crystal Beast Rainbow Dragon',
      'Crystal Beast Amethyst Cat',
      'Crystal Beast Ruby Carbuncle',
      'Crystal Beast Sapphire Pegasus',
      'Crystal Beast Topaz Tiger',
      'Crystal Beast Emerald Tortoise',
      'Crystal Beast Cobalt Eagle',
      'Crystal Beast Amber Mammoth',
      'Rare Value',
      'Crystal Release',
    ],
    'Bestas Sagradas': [
      'Raviel, Lord of Phantasms',
      'Hamon, Lord of Striking Thunder',
      'Uria, Lord of Searing Flames',
      'Armityle the Chaos Phantasm',
      'Phantasmal Fiend',
      'Phantom Skyblaster',
    ],
    'Kaiba (Blue-Eyes)': [
      'Blue-Eyes White Dragon',
      'Blue-Eyes Ultimate Dragon',
      'Blue-Eyes Alternative White Dragon',
      'Blue-Eyes Toon Dragon',
      'Dragon Master Knight',
      'Vorse Raider',
      'Battle Ox',
      'Lord of D.',
      'Melody of Awakening Dragon',
      'The White Stone of Legend',
      'Sage with Eyes of Blue',
      'Dragon Spirit of White',
    ],
    'Yugi (Decks Lendários 2)': [
      'Dark Magician',
      'Dark Magician Girl',
      'Exodia the Forbidden One',
      'Left Arm of the Forbidden One',
      'Obliterate!!!',
      'Celtic Guardian',
      'Summoned Skull',
      'Gaia the Fierce Knight',
      'Kuriboh',
      'Silent Magician LV4',
      'Magician of Black Chaos',
      'Breaker the Magical Warrior',
    ],
    'Onda de Luz': [
      'Airknight Parshath',
      'Shining Angel',
      'Honest',
      'Lumina, Lightsworn Summoner',
      'Mystical Shine Ball',
      'Sunlight Wolf',
      'Elemental HERO Shining Phoenix Enforcer',
      'Cyber Angel Benten',
      'Hysteric Fairy',
    ],
    'Revolução do Dragão Cibernético': [
      'Cyber Dragon',
      'Cyber Dragon Nova',
      'Cyber Dragon Core',
      'Cyber Dragon Drei',
      'Cyber Dragon Zwei',
      'Cyber Twin Dragon',
      'Cyber Phoenix',
      'Power Bond',
      'Cyber Repair Plant',
    ],
    'Loucura Mecanizada': [
      'Machina Citadel',
      'Machina Fortress',
      'Machina Gearframe',
      'Machina Air Raider',
      'Machina Peacekeeper',
      'Machina Cannon',
      'Machina Defender',
      'Machina Force',
      'Machina Megaform',
      'Machina Soldier',
      'Machina Sniper',
    ],
    'Ataque do Herói': [
      'Contrast HERO Chaos',
      'Masked HERO Dark Law',
      'Masked HERO Koga',
      'Masked HERO Divine Wind',
      'Elemental HERO Shadow Mist',
      'Elemental HERO Neos',
      'Elemental HERO Bladedge',
      'Elemental HERO Wildheart',
      'Elemental HERO Great Tornado',
      'Elemental HERO Necroshade',
      'Elemental HERO Bubbleman',
      'Winged Kuriboh',
    ],
    'Covil das Trevas': [
      'Darkest Diabolos, Lord of the Lair',
      'Dark Armed Dragon',
      'Dark Grepher',
      'Dark Dust Spirit',
      'Dark Hole',
      'Dark Sage',
      'Dark Necrofear',
      'Dark Magician of Chaos',
      'Dark Valkyria',
    ],
    'Fúria do Dinosmagador': [
      'Ultimate Conductor Tyranno',
      'Black Tyranno',
      'Gilasaurus',
      'Babycerasaurus',
      'Dark Driceratops',
      'Giant Rex',
      'Super Conductor Tyranno',
      'Miracle Jurassic Egg',
      'Sauropod Brachion',
      'Jurrac Guaiba',
    ],
    'Deuses: Obelisco': [
      'Obelisk the Tormentor',
      'Slifer the Sky Dragon',
      'The Winged Dragon of Ra',
      'Giant Soldier of Stone',
      'Soul of Fire',
      'Fist of Fate',
      'Kuriboh',
    ],
    'Deuses: Slifer': [
      'Slifer the Sky Dragon',
      'Obelisk the Tormentor',
      'The Winged Dragon of Ra',
      'Sangan',
      'Kuriboh',
      'Slifer the Sky Dragon (Ra)',
    ],
    'Joey (Red-Eyes e Gemini)': [
      'Red-Eyes Black Dragon',
      'Red-Eyes Black Flare Dragon',
      'Red-Eyes Archfiend of Lightning',
      'Archfiend Black Skull Dragon',
      'The Black Stone of Legend',
      'Baby Dragon',
      'Time Wizard',
      'Jinzo',
      'Gearfried the Iron Knight',
      'Rocket Warrior',
      'Blue Flame Swordsman',
      'Axe Raider',
      "Alligator's Sword",
      'Gemini Summoner',
      'Red-Eyes Fusion',
    ],
    'Yugi (Reino dos Duelistas)': [
      'Exodia the Forbidden One',
      'Left Leg of the Forbidden One',
      'Right Arm of the Forbidden One',
      'Dark Magician',
      'Summoned Skull',
      'Celtic Guardian',
      'Gaia the Fierce Knight',
      'Curse of Dragon',
      'Feral Imp',
      'Mystical Elf',
      'Giant Soldier of Stone',
    ],
    'Yugi (Dirigível Kaiba)': [
      'Green Gadget',
      'Red Gadget',
      'Yellow Gadget',
      'Silent Magician LV4',
      'Silent Magician LV8',
      'Silent Swordsman LV3',
      'Silent Swordsman LV5',
      'Magician of Faith',
      'Gadget Soldier',
    ],
    'Rugido do Dragão': [
      'Red-Eyes Darkness Dragon',
      'Luster Dragon',
      'Masked Dragon',
      'Spear Dragon',
      'Armed Dragon LV3',
      'Armed Dragon LV5',
      'Armed Dragon LV7',
      'Cave Dragon',
      'Dragon Treasure',
      'Level Up!',
    ],
  },
  POOL = [];
function mkBg() {
  const w = $('#bgart');
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div'),
      z = 8 + Math.random() * 26;
    s.className = 'sq';
    s.style.cssText = `left:${Math.random() * 95}%;top:${Math.random() * 60}%;width:${z}px;height:${z}px;animation-delay:${-Math.random() * 5}s`;
    w.appendChild(s);
  }
  const cols = 3,
    rows = 4;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const e = document.createElement('div'),
        W = 58 + Math.random() * 26;
      e.className = 'bc';
      e.style.cssText = `--w:${W}px;left:${((c + 0.1 + Math.random() * 0.4) * 100) / cols}%;top:${((r + 0.05 + Math.random() * 0.4) * 100) / rows}%;--r:${Math.round(Math.random() * 70 - 35)}deg;--rr:${Math.round(Math.random() * 24 - 12)}deg;--x:${Math.round(Math.random() * 24 - 12)}px;--y:${Math.round(Math.random() * 30 - 15)}px;--d:${(7 + Math.random() * 7).toFixed(1)}s`;
      e.innerHTML = '<div class="cd"><div class="bk2"></div><div class="fc"></div></div>';
      w.appendChild(e);
    }
}
function flipTick() {
  if (!POOL.length) return;
  const all = [...document.querySelectorAll('#bgart .bc')],
    on = all.filter(e => e.classList.contains('f'));
  if (on.length >= 4) return;
  const off = all.filter(e => !e.classList.contains('f'));
  if (!off.length) return;
  const e = off[Math.floor(Math.random() * off.length)];
  e.querySelector('.fc').style.backgroundImage = `url('${POOL[Math.floor(Math.random() * POOL.length)]}')`;
  e.classList.add('f');
  setTimeout(() => e.classList.remove('f'), 3500 + Math.random() * 3000);
}
async function loadBg() {
  for (const n of Object.keys(BGN)) {
    let a = await KV.get('bgc:' + n);
    if (!a) {
      a = [];
      try {
        const j = await (
          await fetch(
            'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=' + encodeURIComponent(BGN[n].join('|'))
          )
        ).json();
        for (const c of j.data.slice(0, 10)) {
          const u = c.card_images[0].image_url_small,
            d = await toData(u);
          a.push(d || u);
        }
        if (a.length && a.every(x => x.startsWith('data:'))) KV.set('bgc:' + n, a);
      } catch (e) {}
      await new Promise(r => setTimeout(r, 150));
    }
    a.forEach(x => POOL.push(x));
  }
}
