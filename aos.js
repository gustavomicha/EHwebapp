// Primigenios del juego base y de las 4 expansiones chicas (datos leídos de sus hojas).
// mythos: [verdes, amarillas, azules] por etapa I, II y III.
// specials: mazos de Encuentro Especial del Primigenio (nombre tal como figura en las cartas).
window.EH_EXPANSIONS = [
  { id: 'base', name: 'Juego básico', fixed: true },
  { id: 'fl', name: 'Saber olvidado', en: 'Forsaken Lore' },
  { id: 'sr', name: 'Vestigios extraños', en: 'Strange Remnants' },
  { id: 'soc', name: 'Señales de Carcosa', en: 'Signs of Carcosa' },
  { id: 'cir', name: 'Ciudades en ruinas', en: 'Cities in Ruin' },
];

window.EH_AOS = [
  { id: 'azathoth', name: 'Azathoth', exp: 'base', doom: 15,
    mythos: [[1, 2, 1], [2, 3, 1], [2, 4, 0]], specials: [],
    notes: ["Coloca 1 ficha de Arcano en la casilla verde del medidor de Augurio."] },
  { id: 'cthulhu', name: 'Cthulhu', exp: 'base', doom: 12,
    mythos: [[0, 2, 2], [1, 3, 0], [3, 4, 0]], specials: ["El resurgir de R'lyeh"],
    notes: ["Pon aparte 1 Monstruo Profundo, 1 Monstruo Semilla estelar y todas las cartas de Encuentro Especial de Cthulhu."] },
  { id: 'shub', name: 'Shub-Niggurath', exp: 'base', doom: 13,
    mythos: [[1, 2, 1], [3, 2, 1], [2, 4, 0]], specials: [],
    notes: ["Pon aparte 2 Monstruos Gul, 2 Monstruos Engendro cabrío y 1 Monstruo Retoño oscuro."] },
  { id: 'yog', name: 'Yog-Sothoth', exp: 'base', doom: 14,
    mythos: [[0, 2, 1], [2, 3, 1], [3, 4, 0]], specials: ['El vacío entre los mundos', 'La llave y la puerta'],
    notes: ["Pon aparte todas las cartas de Encuentro Especial de Yog-Sothoth."] },
  { id: 'yig', name: 'Yig', exp: 'fl', doom: 10,
    mythos: [[1, 2, 1], [2, 3, 1], [2, 4, 0]], specials: ["K'n-Yan desenterrado"],
    notes: ["Deja aparte 6 Monstruos Sectario, 1 Monstruo Hombres serpiente y todas las cartas de Encuentro Especial de Yig."] },
  { id: 'syzygy', name: 'Sicigia', exp: 'sr', doom: 13,
    mythos: [[0, 2, 2], [3, 3, 0], [3, 5, 0]], specials: ['Sellar el portal', 'Fortalecer la barrera'],
    ruins: true,
    notes: ["Deja aparte todos los Encuentros Especiales de Sicigia. Prepara el mazo de Encuentros de Ruinas místicas (ya está en la app)."] },
  { id: 'hastur', name: 'Hastur', exp: 'soc', doom: 11,
    mythos: [[0, 2, 2], [2, 3, 0], [3, 5, 0]], specials: ['El Rey Amarillo', 'El innombrable', 'Las ciudades del lago'],
    notes: ["Deja aparte 1 Monstruo Byakhee y todos los Encuentros Especiales de Hastur."] },
  { id: 'shudde', name: "Shudde M'ell", exp: 'cir', doom: 15,
    mythos: [[0, 2, 2], [4, 2, 0], [2, 4, 0]], specials: ["Explorando G'harne"], devastated: ['Roma'],
    notes: ["Deja aparte todos los Encuentros Especiales de Shudde M'ell.", "Coloca 1 ficha de Arcano en las casillas 2, 5, 8 y 11 del medidor de Perdición.", "¡Roma queda devastada! (ya marcada en la app)"] },
];
