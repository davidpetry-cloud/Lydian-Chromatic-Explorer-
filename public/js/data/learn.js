// The Learn tab: six short sections on tonal gravity for players. All wording
// is original (David Petry, all rights reserved; see LICENSE). Each section
// names its tradition, Russell's Lydian Chromatic Concept, classical voice
// leading, or both, and cites the sources in sources.js. "Ideas" are practice
// suggestions, not rules from either tradition.
const section = (s) => Object.freeze({ ideas: [], try: null, ...s });

export const LEARN = Object.freeze([
  section({
    id: 'home-away',
    title: 'Home and away',
    tradition: 'russell',
    paragraphs: [
      'Every tone feels some pull toward a centre, the way a room has a front door. George Russell called that pull tonal gravity, and he measured it in perfect fifths: stack fifths up from home and each new tone sits a little further out.',
      'Near tones blend into home. Far tones lean away and ask for an answer. You can hear the distance before you can name it, so start by listening.',
    ],
    example: {
      label: 'Home, near, far, home',
      description: 'C stays in the bass the whole time. First C major 7 (home), then D major over C, whose notes all live inside C Lydian (near), then A♭ major over C, which reaches outside it (far), and back home.',
      bpm: 72,
      chords: [{ symbol: 'Cmaj7', beats: 4 }, { symbol: 'D/C', beats: 4 }, { symbol: 'Ab/C', beats: 4 }, { symbol: 'Cmaj7', beats: 4 }],
    },
    try: 'gravity',
    sources: ['french-2018', 'mcclimon'],
  }),
  section({
    id: 'ingoing-outgoing',
    title: 'Ingoing and outgoing tonal gravity',
    tradition: 'russell',
    paragraphs: [
      'Ingoing means a sound that hugs its centre; outgoing means one that stretches away from it. In Russell’s system the seven principal scales on one Lydian tonic run from the most ingoing (Lydian) to the most outgoing (Auxiliary Diminished Blues), each one reaching a little further down the order of tonal gravity.',
      'That turns tension into a dial rather than a list of right and wrong notes. Over the same chord you can choose how far from home to travel, and when to come back. The scale ladder in Practice is that dial, laid out left to right.',
    ],
    ideas: [
      'Start ingoing, travel outgoing for the climax of a solo, then come home for the last phrase.',
      'Keep an A section ingoing and let the B section go outgoing, so the form itself breathes.',
      'Over a long pedal bass, step one scale further out each chorus.',
      'Comp ingoing while a soloist goes outgoing: the contrast makes both sound more themselves.',
    ],
    example: {
      label: 'The same centre, travelling out and back',
      description: 'C stays the Lydian tonic and the bass throughout. C major 7 (Lydian, ingoing), then C major 7 sharp 5 (Lydian Augmented, a step out), then C7 sharp 11 (Lydian Flat Seventh, further out), then home to C major 7.',
      bpm: 72,
      chords: [{ symbol: 'Cmaj7', beats: 4 }, { symbol: 'Cmaj7#5', beats: 4 }, { symbol: 'C7#11', beats: 4 }, { symbol: 'Cmaj7', beats: 4 }],
    },
    try: 'practice',
    sources: ['mcclimon', 'french-2018'],
  }),
  section({
    id: 'vertical',
    title: 'Vertical: one chord, one centre',
    tradition: 'russell',
    paragraphs: [
      'Vertical means hearing the chord of the moment. Russell asks which Lydian scale the chord sits in most naturally; that scale’s tonic is where the chord leans. For a minor 7 chord, the answer is a minor third up: C minor 7 leans toward E♭.',
      'Those are the same seven notes most players call C Dorian. Russell names them from E♭, the centre of gravity; the scale cards in Practice show both names side by side.',
    ],
    example: {
      label: 'C minor 7 and its Lydian home',
      description: 'C minor 7, then E♭ major 7, then C minor 7 again. Both chords come from the same seven notes, so the second sounds like the first one’s home.',
      bpm: 72,
      chords: [{ symbol: 'Cm7', beats: 4 }, { symbol: 'Ebmaj7', beats: 4 }, { symbol: 'Cm7', beats: 4 }],
    },
    try: 'practice',
    sources: ['italianpiano', 'wikipedia-mode'],
  }),
  section({
    id: 'horizontal',
    title: 'Horizontal: a passage leaning toward one centre',
    tradition: 'russell',
    paragraphs: [
      'Horizontal means hearing a whole passage, not chord by chord. A short progression can lean toward one centre even though each chord has its own Lydian tonic: D minor 7 and G7 both live in F Lydian, and both point on toward C.',
      'Playing horizontally means choosing one sound that floats over several chords instead of changing scale on every chord. The Form & Gravity lab, coming next, is built for exactly this kind of listening.',
    ],
    example: {
      label: 'ii–V–I as one gravity',
      description: 'D minor 7, G7, then C major 7, with smooth voice leading. Listen for the whole phrase settling into C, rather than three separate chords.',
      bpm: 80,
      chords: [{ symbol: 'Dm7', beats: 4 }, { symbol: 'G7', beats: 4 }, { symbol: 'Cmaj7', beats: 8 }],
    },
    try: 'practice',
    sources: ['italianpiano', 'cafesaxophone'],
  }),
  section({
    id: 'voice-leading-bass',
    title: 'Voice leading and the bass',
    tradition: 'classical',
    paragraphs: [
      'Classical voice leading hears gravity in single lines. Some notes are tendency tones: the leading tone wants to rise a half step to the tonic, and the seventh of a chord wants to fall by step. In G7 to C, B rises to C while F falls to E.',
      'Harmonic rhythm is how often the chords change. Slow harmonic rhythm lets each pull settle; fast harmonic rhythm piles pulls on top of each other and drives toward the cadence.',
      'The bass steers it all. A bass moving by fifths sounds strong and inevitable; a bass moving by step sounds smooth; a pedal point holds one note while the chords above change, and the held note may even sit outside them. An inversion puts a note other than the root in the bass: C over E pulls differently from C over C, even though the chord is the same.',
    ],
    example: {
      label: 'One progression, three bass lines, two harmonic rhythms',
      description: 'The same ii–V–I three times. First with the roots in the bass, four beats each. Then with inversions, so the bass moves by step: F, F, E. Then over a G pedal, at twice the harmonic rhythm.',
      bpm: 84,
      chords: [
        { symbol: 'Dm7', beats: 4 }, { symbol: 'G7', beats: 4 }, { symbol: 'Cmaj7', beats: 4 },
        { symbol: 'Dm7/F', beats: 4 }, { symbol: 'G7/F', beats: 4 }, { symbol: 'Cmaj7/E', beats: 4 },
        { symbol: 'Dm7/G', beats: 2 }, { symbol: 'G7', beats: 2 }, { symbol: 'Cmaj7/G', beats: 4 },
      ],
    },
    try: 'practice',
    sources: ['geneseo-dominant-seventh', 'harmony-musicianship-lt7', 'wikipedia-harmonic-rhythm', 'britannica-harmonic-rhythm', 'wikipedia-pedal-point', 'puget-sound-pedal', 'omt-inversion', 'wikipedia-first-inversion'],
  }),
  section({
    id: 'two-views',
    title: 'Two views, side by side',
    tradition: 'both',
    paragraphs: [
      'Classical voice leading listens to lines: which note moves where, and how strongly it wants to. Russell listens to centres: which tonic a chord or a passage leans toward, and how far in or out a sound sits.',
      'They agree that music is a pattern of pulls and resolutions. They differ in where they put home: the classical view hears G7 resolving into C, while Russell also hears G7 leaning toward F Lydian before the music moves on. Neither cancels the other; hearing both gives you more ways to choose your notes.',
    ],
    example: {
      label: 'G7 to C, heard two ways',
      description: 'G7 held, then C major 7. Classically, B rises to C and F falls to E. In Russell’s terms, the first chord leans toward F Lydian and the second sits at home in C Lydian.',
      bpm: 66,
      chords: [{ symbol: 'G7', beats: 4 }, { symbol: 'Cmaj7', beats: 8 }],
    },
    try: 'gravity',
    sources: ['geneseo-dominant-seventh', 'italianpiano', 'french-2018'],
  }),
]);
