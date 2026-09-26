import type { Course } from '../types';

export const greetings: Course = {
  id: 'greetings',
  n: 3,
  title: 'Greetings',
  la: 'Salūtātiōnēs',
  tagline: 'Hello, goodbye & everything between',
  blurb: 'Say hello and goodbye, ask how someone is, introduce yourself and be polite, just as Romans did in the forum.',
  colors: ['#ff9f1c', '#ffd166'],
  sounds: [
    { sound: 'v', like: 'like English “w”', words: ['Salvē', 'Valē'] },
    { sound: 'ē', like: 'long, like “ay” in “say”', words: ['Salvēte', 'Optimē'] },
    { sound: 'ae', like: 'rhymes with “eye”', words: ['Quaesō'] },
    { sound: 't', like: 'always “t”, never “sh”', words: ['Grātiās'] },
  ],
  ideas: [
    {
      title: 'One person or a crowd?',
      body: 'Greetings are really commands (_salvē_ = “be well!”), so they change for the plural. Add **-te** when you talk to more than one person.',
      table: {
        head: ['', 'One person', 'Two or more'],
        la: [1, 2],
        rows: [
          ['Hello!', 'Salvē!', 'Salvēte!'],
          ['Goodbye!', 'Valē!', 'Valēte!'],
          ['How are you?', 'Quid agis?', 'Quid agitis?'],
        ],
      },
    },
    {
      title: 'Calling someone by name',
      body: 'When you speak directly to someone, Latin uses the **vocative**. Names ending in **-us** change to **-e**: _Salvē, Marce!_ Names ending in **-ius** change to **-ī**: _Valē, Iūlī!_ Most other names stay the same: _Salvē, Iūlia!_',
    },
    {
      title: 'How are you, really?',
      body: 'Answer _Quid agis?_ on a sliding scale:',
      table: {
        head: ['Latin', 'Meaning'],
        la: [0],
        rows: [
          ['Optimē!', 'Great!'],
          ['Bene valeō.', 'I’m well.'],
          ['Satis bene.', 'Okay.'],
          ['Male.', 'Not great.'],
        ],
      },
    },
    {
      title: '“To me the name is…”',
      body: '_Mihi nōmen est Marcus_ literally means “to me the name is Marcus”. Swap _mihi_ (to me) for _tibi_ (to you) and you can ask: _Quid tibi nōmen est?_',
    },
  ],
  vocab: [
    { id: 'gr-salve', la: 'Salvē!', en: 'Hello! (to one person)', match: 'Hello! (to one)', pos: 'greeting', note: 'Literally “Be well!”: it’s a command.', ex: ['Salvē, Marce!', 'Hello, Marcus!'] },
    { id: 'gr-salvete', la: 'Salvēte!', en: 'Hello! (to two or more)', match: 'Hello! (to a group)', pos: 'greeting', ex: ['Salvēte, discipulī!', 'Hello, students!'] },
    { id: 'gr-ave', la: 'Avē!', en: 'Greetings! / Hail!', pos: 'greeting', note: 'A grander greeting, as in “Avē, Caesar!”' },
    { id: 'gr-vale', la: 'Valē!', en: 'Goodbye! (to one person)', match: 'Bye! (to one)', pos: 'greeting', note: 'Literally “Be strong!” or “Stay well!”', ex: ['Valē, amīce!', 'Goodbye, friend!'] },
    { id: 'gr-valete', la: 'Valēte!', en: 'Goodbye! (to two or more)', match: 'Bye! (to a group)', pos: 'greeting', ex: ['Valēte, omnēs!', 'Goodbye, everyone!'] },
    { id: 'gr-quidagis', la: 'Quid agis?', en: 'How are you?', pos: 'phrase', note: 'Literally “What are you doing?” To a group: Quid agitis?', ex: ['Salvē, Iūlia! Quid agis?', 'Hi, Julia! How are you?'] },
    { id: 'gr-optime', la: 'Optimē!', en: 'Great! / Excellent!', pos: 'reply', note: 'Literally “very well”.' },
    { id: 'gr-benevaleo', la: 'Bene valeō.', en: 'I’m well.', pos: 'reply' },
    { id: 'gr-satisbene', la: 'Satis bene.', en: 'Okay. / Fairly well.', match: 'Okay.', pos: 'reply', note: 'Literally “well enough”.' },
    { id: 'gr-male', la: 'Male.', en: 'Not great. / Badly.', match: 'Not great.', pos: 'reply' },
    { id: 'gr-ettu', la: 'Et tū?', en: 'And you?', pos: 'phrase', note: 'The same “Et tū” as in Shakespeare’s “Et tū, Brūte?”' },
    { id: 'gr-nomen', la: 'Quid tibi nōmen est?', en: 'What’s your name?', pos: 'phrase', note: 'Literally “What is the name to you?”' },
    { id: 'gr-mihinomen', la: 'Mihi nōmen est …', head: 'Mihi nōmen est', en: 'My name is …', pos: 'phrase', note: 'Literally “To me the name is …”', ex: ['Mihi nōmen est Lūcia.', 'My name is Lucia.'] },
    { id: 'gr-gratias', la: 'Grātiās tibi agō.', en: 'Thank you.', pos: 'phrase', note: 'To a group: Grātiās vōbīs agō.' },
    { id: 'gr-quaeso', la: 'Quaesō.', en: 'Please.', pos: 'phrase', note: 'Literally “I ask”. Romans also said sīs, or amābō tē (“I’ll love you!”).' },
    { id: 'gr-ignosce', la: 'Ignōsce mihi.', en: 'Sorry. / Forgive me.', match: 'Sorry.', pos: 'phrase' },
    { id: 'gr-cura', la: 'Cūrā ut valeās!', en: 'Take care!', pos: 'phrase', note: 'Cicero often signed off his letters this way.' },
  ],
  quiz: [
    { q: 'Three friends walk in. You say…', la: true, options: ['Salvēte!', 'Salvē!', 'Valē!', 'Valēte!'], why: 'More than one person, so add -te: Salvēte!' },
    { q: 'How do you greet Marcus?', la: true, options: ['Salvē, Marce!', 'Salvē, Marcus!', 'Salvēte, Marce!', 'Valē, Marce!'], why: 'Names in -us change to -e when you address someone directly.' },
    { q: 'Someone asks “Quid agis?” and you feel amazing. You reply…', la: true, options: ['Optimē!', 'Male.', 'Ignōsce mihi.', 'Et tū?'], why: 'Optimē means “great!”' },
    { q: 'Class is over. You say goodbye to your teacher (one person)…', la: true, options: ['Valē, magister!', 'Salvē, magister!', 'Valēte, magister!', 'Quaesō, magister!'], why: 'Valē is goodbye to one person.' },
    { q: '“Mihi nōmen est Iūlia” literally means…', options: ['To me the name is Julia', 'Julia is my friend', 'I am calling Julia', 'My name was Julia'], why: 'Mihi = to me, nōmen = name, est = is.' },
    { q: 'Word for word, “Quid agis?” means…', options: ['What are you doing?', 'Where are you going?', 'Who are you?', 'Are you strong?'], why: 'quid = what, agis = you are doing. Romans used it to mean “How are you?”' },
  ],
  challenges: [
    {
      id: 'gr-forum',
      type: 'dialogue',
      title: 'Meet Julia in the forum',
      desc: 'Chat with Julia and her brother. Pick the right reply each time (you’re playing Marcus).',
      partner: { name: 'Iūlia', icon: '👩🏽' },
      turns: [
        {
          say: 'Salvē! Quid agis?',
          en: 'Hello! How are you?',
          task: 'Say hello back and tell her you’re well.',
          options: [
            { la: 'Salvē! Bene valeō.' },
            { la: 'Valē! Bene valeō.', fb: 'Valē means goodbye, and you’ve only just met!' },
            { la: 'Salvēte! Male.', fb: 'Salvēte is for a group, and male means “not great”.' },
          ],
        },
        {
          say: 'Optimē! Quid tibi nōmen est?',
          en: 'Great! What’s your name?',
          task: 'Tell her your name is Marcus.',
          options: [
            { la: 'Mihi nōmen est Marcus.' },
            { la: 'Tibi nōmen est Marcus.', fb: 'Tibi means “to you”, so that says her name is Marcus.' },
            { la: 'Quid tibi nōmen est?', fb: 'That asks her name back instead of answering.' },
          ],
        },
        {
          say: 'Ego sum Iūlia. Hic est frāter meus, Sextus.',
          en: 'I’m Julia. This is my brother, Sextus.',
          task: 'Greet Sextus by name.',
          options: [
            { la: 'Salvē, Sexte!' },
            { la: 'Salvē, Sextus!', fb: 'Speaking to him directly, Sextus becomes Sexte (vocative).' },
            { la: 'Valē, Sexte!', fb: 'That’s goodbye, not hello.' },
          ],
        },
        {
          say: 'Salvē, Marce! Ecce, dōnum tibi!',
          en: 'Hi, Marcus! Look, a present for you!',
          task: 'Thank him.',
          options: [
            { la: 'Grātiās tibi agō!' },
            { la: 'Ignōsce mihi!', fb: 'That means “sorry”.' },
            { la: 'Quaesō!', fb: 'That means “please”.' },
          ],
        },
        {
          say: 'Nunc domum īmus. Valē, Marce!',
          en: 'We’re going home now. Goodbye, Marcus!',
          task: 'Say goodbye to both of them.',
          options: [
            { la: 'Valēte!' },
            { la: 'Valē!', fb: 'Valē is for one person, and there are two of them.' },
            { la: 'Salvēte!', fb: 'That’s hello, not goodbye.' },
          ],
        },
      ],
      outro: ['Cūrā ut valeās!', 'Take care!'],
    },
    {
      id: 'gr-build',
      type: 'builder',
      title: 'Polite phrases',
      desc: 'Tap the word tiles in the right order. Some tiles are decoys.',
      items: [
        { en: 'Hello, Marcus! How are you?', answers: ['Salvē, Marce! Quid agis?'], extra: ['Marcus', 'valē'] },
        { en: 'My name is Lucia.', answers: ['Mihi nōmen est Lūcia.', 'Lūcia mihi nōmen est.'], extra: ['tibi', 'sum'] },
        { en: 'I’m well, and you?', answers: ['Bene valeō. Et tū?'], extra: ['male', 'tibi'] },
        { en: 'Thank you, teacher!', answers: ['Grātiās tibi agō, magister!', 'Magister, grātiās tibi agō!'], extra: ['vōbīs', 'salvē'] },
        { en: 'Goodbye, friends!', answers: ['Valēte, amīcī!'], extra: ['valē', 'amīce'] },
      ],
    },
  ],
  tasks: [
    { id: 'gr-t-family', text: 'Greet your family with “Salvē!” or “Salvēte!” at breakfast and ask someone “Quid agis?”' },
    { id: 'gr-t-bye', text: 'Sign off a message to a friend with “Valē!” or “Cūrā ut valeās!”' },
  ],
};
