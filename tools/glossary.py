"""Glosario español -> inglés de Eldritch Horror.

TRAITS: rasgos que en las cartas aparecen en VERSALITAS («obtén 1 Estado AYUDA», «Apoyo único RELIQUIA»).
        Revisados con work/traits_seen.json (rasgo leído en la carta en español vs. rasgos del mod en inglés).
TERMS:  términos de reglas.
PRELUDE_FX: efectos de los Preludios sobre los mazos (clave = título sin tildes, en minúsculas).
"""

TRAITS = {
    # Estados
    'AYUDA': 'Boon', 'RUINA': 'Bane', 'HERIDA': 'Injury', 'LOCURA': 'Madness', 'TRATO': 'Deal',
    'ENFERMEDAD': 'Illness', 'RESTRICCIÓN': 'Restriction', 'PERSECUCIÓN': 'Pursuit', 'TALENTO': 'Talent',
    'CONGELACIÓN': 'Exposure',
    # Apoyos, Artefactos y Apoyos únicos
    'OBJETO': 'Item', 'TOMO': 'Tome', 'ARMA': 'Weapon', 'BARATIJA': 'Trinket', 'SERVICIO': 'Service',
    'ALIADO': 'Ally', 'MÁGICO': 'Magical', 'RELIQUIA': 'Relic', 'PERSONAJE': 'Character', 'TAREA': 'Task',
    # Hechizos
    'ENSALMO': 'Incantation', 'RITUAL': 'Ritual', 'ENCANTO': 'Glamour', 'ELIXIR': 'Elixir',
}

TERMS = {
    'Perdición': 'Doom', 'Augurio': 'Omen', 'ficha de Arcano': 'Eldritch token', 'Retribución': 'Reckoning',
    'Monstruo épico': 'Epic Monster', 'Concentración': 'Focus', 'Billete de tren': 'Train Ticket',
    'Billete de barco': 'Ship Ticket', 'Billete de viaje': 'Travel Ticket', 'ficha de Mejora': 'Improvement token',
    'Discapacidad': 'Impairment', 'Expedición activa': 'Active Expedition', 'Ruinas místicas': 'Mystic Ruins',
    'Apoyo único': 'Unique Asset', 'Artefacto': 'Artifact', 'Retrasado': 'Delayed', 'Investigador jefe': 'Lead Investigator',
    'Investigador derrotado': 'Defeated Investigator', 'Devastación': 'Devastation', 'Desastre': 'Disaster',
    'Resistencia física': 'Physical Resistance', 'Encuentro de Combate': 'Combat Encounter',
}

# Pulido de títulos leídos por OCR (Mitos, Misterios, Aventuras, Desastres, ubicaciones):
# primero frases con palabras pegadas, luego tildes palabra por palabra.
TITLE_GLUE = {
    'Llevadosa labancarrota': 'Llevados a la bancarrota', 'Desde elmasalla': 'Desde el más allá', 'Elmundo': 'El mundo',
    'Demalen peor': 'De mal en peor', 'todaspartes': 'todas partes', 'oscuropoder': 'oscuro poder', 'Todopara': 'Todo para',
    'Conocimientoperdido': 'Conocimiento perdido', 'delpasado': 'del pasado', 'ymarea': 'y marea', 'delprogreso': 'del progreso',
    'opara': 'o para', 'Preciosinflados': 'Precios inflados', 'tiemponoperdona': 'tiempo no perdona', 'Unavance': 'Un avance',
    'Fortalecerla': 'Fortalecer la', 'Idolodel': 'Ídolo del', 'dela ': 'de la ', 'Elverdadero': 'El verdadero', 'Cazandoal': 'Cazando al', 'Laspiramides': 'Las pirámides',
    'Descubrimiento de un': 'Descubrimiento de un alineamiento cósmico',
    'dela ': 'de la ',
}
TITLE_WORDS = {
    'corazon': 'corazón', 'informacion': 'información', 'mas': 'más', 'alla': 'allá', 'desesperacion': 'desesperación',
    'traicion': 'traición', 'proposito': 'propósito', 'epidemica': 'epidémica', 'triangulo': 'Triángulo',
    'crepusculo': 'Crepúsculo', 'extrana': 'extraña', 'extranas': 'extrañas', 'energia': 'energía', 'energias': 'energías',
    'vocacion': 'vocación', 'mision': 'misión', 'destruccion': 'destrucción', 'antano': 'antaño', 'negociacion': 'negociación',
    'cosmica': 'cósmica', 'cosmico': 'cósmico', 'crater': 'cráter', 'sultan': 'Sultán', 'demoniaco': 'Demoníaco',
    'investigacion': 'investigación', 'comprension': 'comprensión', 'afliccion': 'aflicción', 'alienigena': 'alienígena',
    'apelacion': 'apelación', 'migracion': 'migración', 'piramides': 'pirámides', 'tribulacion': 'tribulación',
    'cantico': 'cántico', 'fascinacion': 'fascinación', 'cadaver': 'cadáver',
    'quemalo': 'Quémalo', 'esta': 'está', 'caida': 'caída', 'antartida': 'Antártida', 'africa': 'África',
    'chichen': 'Chichén', 'itza': 'Itzá', 'shanghai': 'Shanghái', 'sidney': 'Sídney', 'huracan': 'huracán',
    'sismicos': 'sísmicos', 'vias': 'vías', 'ciclon': 'ciclón', 'vortice': 'vórtice', 'magica': 'mágica',
    'circulos': 'círculos', 'hiades': 'Híades', 'dimension': 'dimensión', 'religion': 'religión', 'reunion': 'reunión',
    'corrupcion': 'corrupción', 'vacio': 'vacío', 'devastacion': 'devastación', 'caidos': 'caídos', 'legitimas': 'legítimas', 'atraidos': 'atraídos',
    'simbolo': 'símbolo', 'mascara': 'máscara', 'palida': 'pálida', 'jeronimo': 'Jerónimo', 'rubi': 'rubí',
    'idolo': 'ídolo', 'ladron': 'ladrón', 'comun': 'común', 'regimen': 'régimen', 'meditacion': 'meditación',
    'infeccion': 'infección', 'proteccion': 'protección', 'percepcion': 'percepción', 'conjuracion': 'conjuración',
    'consagracion': 'consagración', 'consuncion': 'consunción', 'financiacion': 'financiación', 'baston': 'bastón',
    'automatica': 'automática', 'revolver': 'revólver', 'medico': 'médico', 'latigo': 'látigo',
    'lacrimogeno': 'lacrimógeno', 'escuadron': 'escuadrón', 'teorico': 'teórico', 'guia': 'guía', 'maton': 'matón',
    'festin': 'festín', 'rapido': 'rápido', 'artimanas': 'artimañas', 'discipulo': 'discípulo',
    'mistico': 'místico', 'misticas': 'místicas', 'oceano': 'océano', 'ultimo': 'último', 'ultima': 'última',
}

# Correcciones manuales del diccionario de nombres (español -> inglés)
NAMES_FIX = {}

PRELUDE_FX = {
    'alineamiento cosmico': {'ruins': True, 'adventures': True,
                             'note': 'Alineamiento cósmico: el mazo de Ruinas místicas y las Aventuras ya están en la app. '
                                     'Si el Primigenio no es Sicigia, roba la Aventura «Descubrimiento de una sicigia cósmica» (toca Aventuras).'},
    'el horror de dunwich': {'firstMystery': {'ao': 'yog', 'n': 'Semilla de Yog-Sothoth'},
                             'note': 'El horror de Dunwich: contra Yog-Sothoth el primer Misterio es «Semilla de Yog-Sothoth» (la app ya lo buscó).'},
    'el rey amarillo': {'mythAside': 'El Rey Amarillo', 'mythPlayUnless': 'hastur',
                        'note': 'El Rey Amarillo: la carta de Mitos Rumor «El Rey Amarillo» se apartó antes de crear el mazo. '
                                'Si el Primigenio no es Hastur, ya está en juego: colócale 2 fichas de Arcano.'},
}
