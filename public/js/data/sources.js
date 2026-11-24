// Sources behind the theory data and the glossary. Ids are used in
// QUALITIES[*].sources and GLOSSARY[*].sources. See docs/theory-sources.md.
const s = (id, citation, url, kind) => Object.freeze({ id, citation, url, kind });

export const SOURCES = Object.freeze([
  s('russell-2001', 'George Russell, Lydian Chromatic Concept of Tonal Organization, 4th ed. (Brookline, MA: Concept Publishing, 2001).', null, 'primary'),
  s('italianpiano', 'Italian Piano, “George Russell Lydian Chromatic Concept, explained, full lesson.”', 'https://www.italianpiano.com/music-lessons/george-russell-lydian-chromatic-concept/', 'secondary'),
  s('french-2018', 'Andy French, “Lydian Chromatic Concept of Tonal Organization, Part 3” (2018).', 'https://www.andyfrench.co.uk/2018/05/lydian-chromatic-concept-of-tonal-organization-part-3/', 'secondary'),
  s('tjps', 'The Jazz Piano Site, “Lydian Chromatic Concept.”', 'https://www.thejazzpianosite.com/jazz-piano-lessons/modern-jazz-theory/lydian-chromatic-concept/', 'secondary'),
  s('wikipedia-lcc', 'Wikipedia, “Lydian Chromatic Concept of Tonal Organization.”', 'https://en.wikipedia.org/wiki/Lydian_Chromatic_Concept_of_Tonal_Organization', 'secondary'),
  s('wikipedia-chord-scale', 'Wikipedia, “Chord-scale system.”', 'https://en.wikipedia.org/wiki/Chord-scale_system', 'secondary'),
  s('wikipedia-lydian-chord', 'Wikipedia, “Lydian chord.”', 'https://en.wikipedia.org/wiki/Lydian_chord', 'secondary'),
  s('cafesaxophone', 'Cafe Saxophone forum, “george russel ‘the lydian chromatic concept…’.”', 'https://cafesaxophone.com/threads/george-russel-the-lydian-chromatic-concept.41504/', 'secondary'),
  s('gct-f-lydian', 'Guitar Composer’s Toolbox, “F Lydian chords.”', 'https://guitarcomposerstoolbox.com/guitar-harmonizer/f-lydian/', 'secondary'),
  s('french-lydian-dominant', 'Andy French, “Melodic minor modes: Lydian Dominant” (2018).', 'https://www.andyfrench.co.uk/2018/06/melodic-minor-modes-lydian-dominant/', 'secondary'),
  s('jazzguitar-be', 'Jazz Guitar Online forum, “Lydian Chromatic Concept explained simply.”', 'https://www.jazzguitar.be/forum/theory/48672-lydian-chromatic-concept-explained-simply.html', 'secondary'),
  s('wikipedia-seventh-chord', 'Wikipedia, “Seventh chord” (on omitting the fifth in jazz).', 'https://en.wikipedia.org/wiki/Seventh_chord', 'secondary'),
  s('tjps-shell', 'The Jazz Piano Site, “Shell Chords & Omitting Notes.”', 'https://www.thejazzpianosite.com/?p=329', 'secondary'),
  s('wikipedia-mode', 'Wikipedia, “Mode (music).”', 'https://en.wikipedia.org/wiki/Mode_(music)', 'secondary'),
  s('berklee-modes', 'Berklee Online, “Take Note”: the modes of the major scale.', 'https://online.berklee.edu/takenote/?p=11280', 'secondary'),
  s('wikipedia-harmonic-rhythm', 'Wikipedia, “Harmonic rhythm.”', 'https://en.wikipedia.org/wiki/Harmonic_rhythm', 'secondary'),
  s('britannica-harmonic-rhythm', 'Encyclopaedia Britannica, “Harmonic rhythm.”', 'https://www.britannica.com/art/harmonic-rhythm', 'secondary'),
  s('geneseo-dominant-seventh', 'Fundamentals, Function, and Form (Milne Open Textbooks, SUNY Geneseo), “The Dominant Seventh Chord.”', 'https://milnepublishing.geneseo.edu/fundamentals-function-form/chapter/19-the-dominant-seventh-chord/', 'secondary'),
  s('harmony-musicianship-lt7', 'Harmony and Musicianship with Solfège (Pressbooks), “Leading Tone Seventh Chord.”', 'https://pressbooks.pub/harmonyandmusicianshipwithsolfege/chapter/leading-tone-seventh-chord', 'secondary'),
  s('wikipedia-pedal-point', 'Wikipedia, “Pedal point.”', 'https://en.wikipedia.org/wiki/Pedal_point', 'secondary'),
  s('puget-sound-pedal', 'Music Theory for the 21st-Century Classroom (University of Puget Sound), “Pedal Point.”', 'https://musictheory.pugetsound.edu/mt21c/PedalPoint.html', 'secondary'),
  s('omt-inversion', 'Open Music Theory, “Inversion.”', 'https://viva.pressbooks.pub/openmusictheory/chapter/inversion/', 'secondary'),
  s('wikipedia-first-inversion', 'Wikipedia, “First inversion.”', 'https://en.wikipedia.org/wiki/First_inversion', 'secondary'),
  s('french-chart-a', 'Andy French, “Lydian Chromatic Concept of Tonal Organization, Part 6” (2018), reproducing Chart A from Russell’s 4th ed. (inside cover; pp. 21–23).', 'https://www.andyfrench.co.uk/2018/06/lydian-chromatic-concept-of-tonal-organization-part-6/', 'secondary'),
  s('mcclimon', 'Michael McClimon, “Reconceptualizing the Lydian Chromatic Concept” (conference slides).', 'https://files.mcclimon.org/projects/lcc-smt-slides.pdf', 'secondary'),
  s('kvr-forum', 'KVR Audio Music Theory Forum, “George Russell’s Lydian Chromatic Concept of Tonal…,” page 2.', 'https://www.kvraudio.com/forum/viewtopic.php?t=227223&start=15', 'secondary'),
]);

export const sourceById = (id) => SOURCES.find((x) => x.id === id);
