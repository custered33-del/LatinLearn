import type { Course } from '../types';

export const argumentsCourse: Course = {
  id: 'arguments',
  n: 9,
  title: 'Arguments',
  la: 'Disputātiō',
  tagline: 'Debate like Cicero',
  blurb: 'Give your opinion, agree and disagree, back it up with a reason and link your points together, just as Roman speakers did.',
  colors: ['#be123c', '#7c2d12'],
  sounds: [
    { sound: 'ti', like: 'always “tee”, never “sh”', words: ['sententiā', 'dissentiō'] },
    { sound: 'c', like: 'always hard, like “k”', words: ['dīcis', 'crēdō'] },
    { sound: 'qu', like: 'like “kw”', words: ['quod'] },
    { sound: 'g', like: 'always hard, as in “get”', words: ['ergō', 'grātiā'] },
  ],
  ideas: [
    {
      title: 'Say what you think',
      body: 'Open with _Meā sententiā…_ (in my opinion…). Agree with _Ita putō_ (I think so) or push back with _Nōn ita putō_ (I don’t think so). Ask the other side _Quid putās?_ (What do you think?)',
    },
    {
      title: 'Agree or disagree',
      body: 'From total agreement to total disagreement:',
      table: {
        head: ['Latin', 'Meaning'],
        la: [0],
        rows: [
          ['Rēctē dīcis.', 'You’re right.'],
          ['Tēcum cōnsentiō.', 'I agree with you.'],
          ['Fortasse.', 'Maybe.'],
          ['Ā tē dissentiō.', 'I disagree with you.'],
          ['Errās!', 'You’re wrong!'],
          ['Minimē vērō!', 'Absolutely not!'],
        ],
      },
    },
    {
      title: 'Always give a reason',
      body: 'An opinion without a reason is just noise. When someone asks _Cūr?_ (why?), answer with _quod_ (because): _Canēs amō quod fīdī sunt._ (I love dogs because they are loyal.)',
    },
    {
      title: 'Link your points',
      body: 'Good arguments flow. Order your points with _prīmum_ (first), _deinde_ (next) and _dēnique_ (finally). Contrast with _sed_ (but) or _tamen_ (however). Conclude with _ergō_ (therefore). Give examples with _exemplī grātiā_, which is where “e.g.” comes from.',
    },
    {
      title: 'Roman debate club',
      body: 'Roman teenagers trained as speakers by arguing made-up cases called **contrōversiae** and giving advice to famous figures from history in speeches called **suāsōriae**. The greatest speaker of all was **Cicero**, whose speeches are still studied today.',
    },
  ],
  vocab: [
    { id: 'ar-sententia', la: 'Meā sententiā …', head: 'Meā sententiā', en: 'In my opinion …', pos: 'phrase', note: 'sententia = opinion; English “sentence” comes from it.', ex: ['Meā sententiā, canēs meliōrēs sunt quam fēlēs.', 'In my opinion, dogs are better than cats.'] },
    { id: 'ar-puto', la: 'Ita putō.', en: 'I think so.', pos: 'phrase', note: 'Nōn ita putō = I don’t think so.' },
    { id: 'ar-quidputas', la: 'Quid putās?', en: 'What do you think?', pos: 'phrase', ex: ['Quid putās, Marce?', 'What do you think, Marcus?'] },
    { id: 'ar-consentio', la: 'Tēcum cōnsentiō.', en: 'I agree with you.', match: 'I agree.', pos: 'phrase', note: 'Consensus comes from cōnsentīre, “to feel together”.' },
    { id: 'ar-dissentio', la: 'Ā tē dissentiō.', en: 'I disagree with you.', match: 'I disagree.', pos: 'phrase', note: 'A dissenter is someone who disagrees.' },
    { id: 'ar-recte', la: 'Rēctē dīcis.', en: 'You’re right.', pos: 'phrase', note: 'Literally “you speak correctly”.' },
    { id: 'ar-erras', la: 'Errās!', en: 'You’re wrong!', pos: 'phrase', note: 'Literally “you’re wandering”. An error is a wandering from the truth.' },
    { id: 'ar-fortasse', la: 'Fortasse.', en: 'Maybe. / Perhaps.', match: 'Maybe.', pos: 'phrase' },
    { id: 'ar-credo', la: 'Tibi nōn crēdō!', en: 'I don’t believe you!', pos: 'phrase', note: 'crēdō takes the dative: tibi = to you. Credible and incredible come from it.' },
    { id: 'ar-placet', la: 'Mihi placet.', en: 'I like it.', pos: 'phrase', note: 'Literally “it pleases me”.', ex: ['Hic lūdus mihi placet.', 'I like this game.'] },
    { id: 'ar-nonplacet', la: 'Mihi nōn placet.', en: 'I don’t like it.', pos: 'phrase' },
    { id: 'ar-quod', la: 'quod', en: 'because', pos: 'conjunction', ex: ['Laetus sum quod hodiē lūdus nōn est.', 'I’m happy because there’s no school today.'] },
    { id: 'ar-sed', la: 'sed', en: 'but', pos: 'conjunction', ex: ['Canēs amō, sed fēlēs nōn amō.', 'I love dogs, but I don’t love cats.'] },
    { id: 'ar-tamen', la: 'tamen', en: 'however', pos: 'adverb', ex: ['Fessus sum; tamen labōrō.', 'I’m tired; however, I’m working.'] },
    { id: 'ar-ergo', la: 'ergō', en: 'therefore, so', match: 'therefore', pos: 'adverb', note: 'The philosopher Descartes wrote “Cōgitō, ergō sum”: I think, therefore I am.' },
    { id: 'ar-eg', la: 'exemplī grātiā', en: 'for example', pos: 'phrase', note: 'Shortened to “e.g.” in English.', ex: ['Multa animālia amō, exemplī grātiā canēs et equōs.', 'I love lots of animals, for example dogs and horses.'] },
    { id: 'ar-order', la: 'prīmum … deinde … dēnique', head: 'prīmum, deinde, dēnique', en: 'first … then … finally', match: 'first, then, finally', pos: 'phrase' },
    { id: 'ar-audi', la: 'Audī mē!', en: 'Listen to me!', pos: 'phrase', note: 'To a group: Audīte mē!' },
  ],
  quiz: [
    { q: 'Your friend makes a point you totally agree with. You say…', la: true, options: ['Rēctē dīcis!', 'Errās!', 'Tibi nōn crēdō!', 'Ā tē dissentiō.'], why: 'Rēctē dīcis = you’re right.' },
    { q: 'In an argument, “quod” means…', options: ['because', 'but', 'therefore', 'however'], why: 'quod introduces a reason.' },
    { q: 'Which abbreviation comes from “exemplī grātiā”?', options: ['e.g.', 'i.e.', 'etc.', 'p.s.'], why: 'e.g. = exemplī grātiā, “for the sake of an example”.' },
    { q: 'What does “Cōgitō, ergō sum” mean?', options: ['I think, therefore I am.', 'I think, but I am.', 'I think because I am.', 'I am thinking about it.'], why: 'ergō = therefore.' },
    { q: 'What does “Mihi nōn placet” mean?', options: ['I don’t like it.', 'It pleases me.', 'I don’t believe you.', 'It isn’t my turn.'], why: 'Literally “it doesn’t please me”.' },
    { q: 'In “sententia”, the letters “ti” sound like…', options: ['“tee”', '“shee”', '“chee”', '“see”'], why: 'Latin t is always a plain t: sen-TEN-ti-a.' },
  ],
  challenges: [
    {
      id: 'ar-debate',
      type: 'dialogue',
      title: 'The great debate: dogs vs cats',
      desc: 'Claudia thinks cats are best. Argue your side, but play fair!',
      partner: { name: 'Claudia', icon: '👩🏻' },
      turns: [
        {
          say: 'Salvē! Meā sententiā, fēlēs meliōrēs sunt quam canēs.',
          en: 'Hi! In my opinion, cats are better than dogs.',
          task: 'Disagree with her.',
          options: [
            { la: 'Ā tē dissentiō.' },
            { la: 'Tēcum cōnsentiō.', fb: 'That means “I agree with you”, which is the opposite!' },
            { la: 'Mihi placet.', fb: 'That means “I like it”.' },
          ],
        },
        {
          say: 'Cūr?',
          en: 'Why?',
          task: 'Give a reason: because dogs are loyal (fīdī).',
          options: [
            { la: 'Quod canēs fīdī sunt.' },
            { la: 'Sed canēs fīdī sunt.', fb: 'Sed means “but”. She asked why, so you need “because”.' },
            { la: 'Ergō canēs fīdī sunt.', fb: 'Ergō means “therefore”, so that isn’t a reason.' },
          ],
        },
        {
          say: 'Fēlēs tamen callidae sunt.',
          en: 'Cats, however, are clever.',
          task: 'Admit she might have a point.',
          options: [
            { la: 'Fortasse.' },
            { la: 'Errās!', fb: 'That’s “You’re wrong!”, which isn’t admitting anything.' },
            { la: 'Audī mē!', fb: 'That means “Listen to me!”' },
          ],
        },
        {
          say: 'Quid putās? Suntne canēs callidī?',
          en: 'What do you think? Are dogs clever?',
          task: 'Say you think so.',
          options: [
            { la: 'Ita putō.' },
            { la: 'Nōn ita putō.', fb: 'That means “I don’t think so”.' },
            { la: 'Quid putās?', fb: 'That just asks her the same question back.' },
          ],
        },
        {
          say: 'Sed canēs nimis lātrant!',
          en: 'But dogs bark too much!',
          task: 'Tell her she’s wrong!',
          options: [
            { la: 'Errās!' },
            { la: 'Rēctē dīcis.', fb: 'That means “You’re right”.' },
            { la: 'Grātiās tibi agō.', fb: 'That means “Thank you”.' },
          ],
        },
        {
          say: 'Bene. Ergō et canēs et fēlēs bonī sunt!',
          en: 'Fine. So both dogs and cats are good!',
          task: 'Agree with her to end the debate.',
          options: [
            { la: 'Tēcum cōnsentiō!' },
            { la: 'Tibi nōn crēdō!', fb: 'That means “I don’t believe you!”' },
            { la: 'Mihi nōn placet.', fb: 'That means “I don’t like it”.' },
          ],
        },
      ],
      outro: ['Optimē disputāvistī!', 'You argued brilliantly!'],
    },
    {
      id: 'ar-build',
      type: 'builder',
      title: 'Build your argument',
      desc: 'Put each argument together. The linking words (sed, tamen, quod, ergō) matter!',
      items: [
        { en: 'In my opinion, school is too long.', answers: ['Meā sententiā, lūdus nimis longus est.'], extra: ['tuā', 'longa'] },
        { en: 'I love dogs, but I don’t love cats.', answers: ['Canēs amō, sed fēlēs nōn amō.'], extra: ['quod', 'ergō'] },
        { en: 'I’m tired; however, I’m working.', answers: ['Fessus sum; tamen labōrō.'], extra: ['quod', 'labōrat'] },
        { en: 'I think, therefore I am.', answers: ['Cōgitō, ergō sum.'], extra: ['sed', 'es'] },
        { en: 'I’m happy because it’s Saturday.', answers: ['Laetus sum quod diēs Saturnī est.', 'Laetus sum quod est diēs Saturnī.'], extra: ['sed', 'Sōlis'] },
      ],
    },
  ],
  tasks: [
    { id: 'ar-t-debate', text: 'Hold a two-minute debate with a friend or family member, using at least three phrases from this course.' },
    { id: 'ar-t-write', text: 'Write your opinion about your favourite food: “Meā sententiā … quod …”' },
  ],
};
