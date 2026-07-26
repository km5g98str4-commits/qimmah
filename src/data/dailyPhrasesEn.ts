// Daily motivational phrases — English mirror of `dailyPhrases.ts`.
//
// PURPOSE
//  The app rotates one phrase per day of the year (same day → same phrase).
//  This file holds the English voice of that rotation, so an English UI shows
//  the same thought on the same date as the Arabic UI.
//
// INDEX-PARITY CONTRACT (do not break)
//  `dailyPhrasesEn[i]` MUST stay the semantic twin of `dailyPhrases[i]`.
//  Both arrays MUST keep the exact same length and the exact same order,
//  because the day-of-year index is shared between them.
//  → Never insert, delete, or reorder an entry here alone. Any edit to one file
//    must be mirrored at the same index in the other. Section comments below
//    match the Arabic file's sections one-to-one, in the same order.
//
// RED LINES (mandatory, same as the Arabic file)
//  - No health promises ("you'll lose weight", "you'll get stronger, guaranteed").
//  - No tying a person's worth to their body, weight, or shape.
//  - No medical claims.
//  - The focus stays on: effort, consistency, discipline, showing up, patience,
//    and the daily process.
//
// STYLE
//  Casual, warm, everyday English. Short (3–9 words is the target, ~12 max).
//  Sentence case, simple punctuation, no emoji, no hashtags. Keep entries distinct.

export const dailyPhrasesEn: string[] = [
  // — Showing up and starting —
  'Start today. The first step matters most.',
  "Show up today, even briefly. That's half of it.",
  "Don't wait to feel ready. Start anyway.",
  "Today's yours. One step is enough.",
  "Starting is the hard part, and you're here.",
  'Every long haul starts with showing up once.',
  'Just open the door. The rest gets easier.',
  'Showing up is a small win. Take it.',
  'Stop overthinking. It gets clearer once you move.',
  'A messy start beats a perfect delay.',

  // — Consistency and keeping going —
  'Consistency matters more than perfection.',
  'A little, often, beats a lot, rarely.',
  'Day by day, the habit takes shape.',
  'Consistency is built, not born.',
  "Don't break the streak today.",
  'Progress favors whoever keeps repeating.',
  'Small steadiness adds up over time.',
  "It's not about speed. It's about not stopping.",
  "Repeat until it's easy, then until it's automatic.",
  'Good habits come from repetition, not mood.',
  "Keep going. Yesterday's you would be glad.",
  'Sticking with it beats one burst of hype.',
  'Let today reflect your commitment, not your circumstances.',
  "You only understand consistency once you've lived it.",
  'Steady on the small stuff builds the big stuff.',

  // — Discipline —
  'Discipline shows up where motivation quits.',
  'Discipline is the bridge from goal to done.',
  'Pick discipline today. Tomorrow you says thanks.',
  "When motivation's gone, discipline stays.",
  'Discipline is freedom, not a cage.',
  'A small kept decision beats a big postponed one.',
  "Don't renegotiate what you already decided.",
  "Do what's needed, when it's needed, mood aside.",
  'Discipline is keeping your word to yourself.',
  "Resolve gets tested on the days you don't feel it.",

  // — Small steps —
  'A small step now beats a leap later.',
  'Big things are made of small repeated steps.',
  'Never write off one step. Everything starts there.',
  'One percent better today is plenty.',
  'Focus on the step in front of you.',
  'Summits get climbed one step at a time.',
  "Stack enough small steps and you've gone far.",
  'Just make one small thing better today.',
  "Every step counts, even the ones you can't see yet.",
  'Small done well is what big rests on.',

  // — Patience and the process —
  'Plant today. Give the harvest time.',
  'Patience is part of the plan, not a delay.',
  'Trust the process when it feels slow.',
  'Results run late, but they remember who kept going.',
  'Do the work and let time do its part.',
  'Building is slow, collapsing is fast. Keep building.',
  'Measure the day by effort, not outcome.',
  "It's a long road. Go steady, not rushed.",
  'Sow now. The fruit comes to whoever waits.',
  'Real change takes time. Respect that.',

  // — Effort, not outcome —
  'Mind the effort and the rest sorts itself out.',
  'Your effort is the part you control. Give it.',
  'Putting in the work today is enough.',
  'Nobody asked for perfect. Just try honestly.',
  "Give today whatever you've got, big or small.",
  'Honest effort still counts when nobody sees it.',
  'Good intentions need work, not wishing.',
  'Be proud of the effort before checking results.',
  "You tried and didn't quit. That's today.",
  'The real payoff is who the work makes you.',

  // — Identity and the person —
  'Be the person who follows through today.',
  'Your small actions write who you are.',
  "Don't wait to change to start. Start to change.",
  'You are what you repeat. Choose well.',
  'Act like someone who keeps going, and you will.',
  'Each small commitment moves you toward that person.',
  "Build habits you'll be glad you built.",
  'Who you are comes from daily choices, not talk.',
  'Stay loyal to the version of you you want.',
  "Today's call: be a doer, not a planner.",

  // — Bouncing back after a slip —
  "Yesterday slipped. Today's a clean shot.",
  "Falling isn't failing. Staying down is.",
  "Come back calmly. One day doesn't undo it.",
  "You don't need a perfect start, just a quick return.",
  'Gaps happen. Coming back is the point.',
  'Let yesterday go and show up today.',
  'Mistakes are lessons, not verdicts.',
  'Every day comes with a restart button.',
  "Don't let one slip turn into ten.",
  "Strength isn't never falling. It's getting up again.",

  // — Focus —
  'Do one thing properly today.',
  'Fewer distractions, more attention on your step.',
  'Mute the noise. Open the task.',
  "Knowing today's goal is half the work.",
  "Don't chase everything. Grab the one that matters.",
  'Focus on what you can do right now.',
  'Focused energy gets more done than scattered energy.',
  'A minute of focus beats an hour of dithering.',
  "Name today's step clearly, then do it.",
  'Simple is focus. Fewer options, clearer progress.',

  // — Today is what you hold —
  'Today is the only time you actually have.',
  "Don't push today's step onto an unpromised tomorrow.",
  'Make today one that counts.',
  'Tomorrow gets built out of today.',
  'Do the thing future you will thank you for.',
  "It's your day. Put something good in it.",
  "There's no better time to start than now.",
  'Spend one hour today on something that builds you.',
  "Each day is a chance that won't come back the same.",
  'Treat your day well and it returns the favor.',

  // — Quiet encouragement —
  "You don't have to be perfect, just keep going.",
  'Rest is in the plan, not a break from it.',
  'Go easy on yourself while a habit is new.',
  "Your progress isn't measured against anyone else.",
  'Your path is yours. Stop measuring it by theirs.',
  'Calm doing beats anxious thinking.',
  'Trust yourself. You already started.',
  'Commitment is care, not punishment.',
  'Be proud you chose to try.',
  "The journey's better when you're kind to yourself.",

  // — Doing the work —
  'Doing beats putting off, every time.',
  'Start incomplete instead of waiting for complete.',
  'Action creates motivation, not the other way around.',
  'Turn the intention into a step before it cools.',
  'Get a piece of it done now.',
  "Perfect timing isn't coming. Make your start.",
  'A decision without action is just a wish.',
  'Modest work today beats a grand plan tomorrow.',
  'Do it small and let it grow with you.',
  'Each finished task fuels the next one.',

  // — Following through —
  'The promise you made yourself deserves respect.',
  "Keep it when nobody's watching.",
  'Follow-through shows on the hard days.',
  'Be the type who finishes what they start.',
  "Today's follow-through builds your own trust in you.",
  'Look for a way, not an excuse.',
  'Sticking to the plan is a day-by-day habit.',
  "Do what you said you'd do.",
  'Small kept promises make someone reliable.',
  'Every time you follow through, your resolve grows.',

  // — Momentum and progress —
  'Momentum comes one step after another.',
  'Keep moving. Stopping costs more than continuing.',
  'An active day feeds the day after it.',
  'Quiet progress outlasts loud noise.',
  "Don't underrate what one solid day does.",
  'Steps pile up into distance.',
  'Stay in motion, even at a slow tempo.',
  "Momentum's on your side. Don't waste it.",
  'A good day pulls better ones behind it.',
  'Every follow-through adds fuel to the trip.',

  // — Persistence —
  'People who insist get there, even late.',
  "Don't quit halfway.",
  'Persistence turns hard into doable.',
  "Finish what you started. It's closer than it looks.",
  "When you're tired, remember why you started.",
  'A little stubbornness goes a long way.',
  'The people who finish are the ones who change things.',
  "Don't stop at the first hard part.",
  'Outlast the obstacle in front of you.',
  'Quiet persistence goes further than loud excitement.',

  // — Mindset —
  "Think about today's step, not the whole mountain.",
  'Swap I have to for I choose to.',
  'The obstacle is part of the road, not the end.',
  "Look at what's done, not only what's left.",
  'Small kind thoughts make for steadier days.',
  'Treat today like an experiment, not an exam.',
  "Turn I can't into I haven't got it yet.",
  'Clear your head around one clear step.',
  'Being okay with slow progress is quietly powerful.',
  'Feeling good about the effort keeps you going longer.',

  // — Prep and setup —
  "Set up tomorrow's step tonight.",
  'A little organizing means less hesitating later.',
  "Make starting easy and you'll last longer.",
  'Pick one priority for today and start there.',
  'A tidy setup makes the choice easier.',
  'Plan a little, do a lot.',
  'Remove one thing standing in your way today.',
  'Prepping ahead saves you the deciding.',
  'Make the right option the easy one.',
  'A written step beats a floating intention.',

  // — Balance —
  'Balance work and rest. Both count.',
  'Good sleep counts as part of the commitment.',
  'Moderate lasts. Overdoing it burns out.',
  'Drink your water and look after yourself.',
  'Planned rest makes the comeback better.',
  "Don't spend a week's energy in one day.",
  'Listen to your body without being harsh about it.',
  'Balance is a skill you practice.',
  'A balanced day beats a frantic one.',
  'Taking care of yourself is what keeps this going.',

  // — Gratitude and meaning —
  'Give yourself credit for every step so far.',
  'Remember why you started. It still pushes.',
  'The trip matters as much as the arrival.',
  'Celebrate small progress like you would big.',
  'Every day you stuck with it is worth noting.',
  'An honest reason gives the routine meaning.',
  "Be proud you're looking after this.",
  'Meaning grows out of doing it again, sincerely.',
  'Be grateful you get to try today.',
  'Appreciating your own work never runs dry.',

  // — Inspiration through action —
  "Don't wait for inspiration. Move and make it.",
  'Do it first. The good feeling comes after.',
  'Move a little and your mood tends to follow.',
  'One small action breaks the stall.',
  'Start slow. Starting melts the hesitation.',
  'The first tap is a yes to yourself.',
  'Turn this moment into a step before it passes.',
  'One decision today outweighs a thousand yesterday.',
  'Moving is the cure for overthinking.',
  'Make your own wave instead of waiting for one.',

  // — More on consistency —
  'Your streak starts with one link today.',
  "Don't undo today what you built yesterday.",
  "A habit proves itself on the days you don't want it.",
  'Repeat the good part until it runs itself.',
  'A bit daily sticks better than a lot once.',
  "Hold your rhythm, even if it's lighter.",
  'Consistency makes hard things familiar.',
  'Each day you show up makes the next easier.',
  'Steadiness builds confidence, and confidence builds steadiness.',
  'A small routine beats a big burst.',

  // — More on discipline —
  'Do the right thing even when your body objects.',
  "Discipline is keeping the morning's plan by evening.",
  "You don't need the right mood to follow through.",
  'Decide once, then just do it, no arguing.',
  'Discipline saves you from deciding over and over.',
  'Showing up tired is where willpower grows.',
  'A set habit carries you when the mood swings.',
  'Keeping the small things is practice for the big ones.',
  'Discipline is care that shows up as action.',
  "Do it because it's right, not because it's easy.",

  // — More small steps —
  'A little progress today is enough.',
  'No leaps needed. Just a step.',
  "One percent better. That's all.",
  'The step ahead matters more than the far peak.',
  'Small and repeated becomes big and solid.',
  'Start with the tiniest version of it.',
  "Today's step is tomorrow's seed.",
  'Never look down on small regular work.',
  'Every small rep tightens the habit.',
  'You cross it by stepping, not lunging.',

  // — More patience —
  'Results are slow. Persistence comes first.',
  'Be patient with building. Only wrecking is fast.',
  'The fruit goes to whoever waited and worked.',
  "Don't dig up the seed to check on it.",
  'Time sides with whoever keeps quietly at it.',
  'Give change its time. No rushing.',
  "Patience is the quiet ones' skill.",
  'Trust the process when results go quiet.',
  'Slow and regular beats fast and patchy.',
  'Patience today is ease tomorrow.',

  // — More resilience —
  "One off day doesn't cancel a solid month.",
  'After any slip, just come back calmly.',
  "You don't need to be perfect to return.",
  'Forgive yesterday. Take hold of today.',
  'A mistake is a stop, not the last stop.',
  'Get up faster than you went down.',
  'Skip the guilt. Just restart.',
  'Getting back fast matters more than starting flawlessly.',
  "One missing link doesn't break the whole chain.",
  'Every morning is a clean slate.',

  // — More focus —
  'One task done well beats ten half-done.',
  'Silence the notifications. Open your step.',
  'A clear goal is half the job.',
  "Don't chase it all at once.",
  'Put your attention on what you control.',
  'Simplicity is strength. Cut back to get through.',
  'Drop one option today and focus better.',
  'One focused minute outruns an hour of doubt.',
  "Say today's task out loud, then begin.",
  "Gathered energy does what scattered energy can't.",

  // — More on identity —
  'Today, be the one doing it.',
  'Your actions write your story quietly.',
  'Act committed and you become committed.',
  'Each step brings you nearer to who you want to be.',
  "Choose repeats that fit the version you're after.",
  "You're the sum of your daily calls.",
  "Build a habit you'd enjoy talking about later.",
  "Stay true to who you're becoming.",
  "Today's decision: actually do something.",
  'Little deeds, done often, amount to a lot.',

  // — Today and time —
  'Right now is as good as it gets.',
  "Don't trade today's step for tomorrow's promise.",
  'Make this one count.',
  'Tomorrow comes out of what you do today.',
  'Give your future self something to be glad about.',
  "Add one line to today you'd be proud of.",
  "Lost time doesn't come back. Use it.",
  'An hour of building beats a day of waiting.',
  'No two days offer the same chance twice.',
  "Be good to your day and it's good back.",

  // — More quiet encouragement —
  "This isn't a race. It's a long walk.",
  "Your progress is yours. Don't compare it.",
  'Be gentle with yourself as you grow.',
  'Resting on purpose is part of being strong.',
  "Trust your steps. You've covered plenty.",
  'Following through is care, not a penalty.',
  'Proud of you for choosing to try today.',
  'Doing it calmly keeps you steady longer.',
  'The trick to lasting is being kind to yourself.',
  'Every step is yours. Enjoy it honestly.',

  // — Action beats putting it off —
  'Do it now. Delay steals the good stuff.',
  'Half-ready and moving beats fully-ready and waiting.',
  'Movement makes motivation.',
  "Act on it while it's still warm.",
  'Knock out one small piece right now.',
  "There's no ideal moment. Begin anyway.",
  'An intention with no action is a daydream.',
  'Keep it small so it can grow.',
  'Anything finished creates a push for the next.',
  'The first tap breaks the freeze.',

  // — More persistence —
  'Keep at it and you arrive, late or not.',
  "Don't stop in the middle.",
  'Sticking with it makes hard things possible.',
  'The end is nearer than you think. Keep going.',
  'Tired? Go back to your reason.',
  'Finishers are the ones who move things.',
  'Be more patient than the obstacle.',
  "Don't hand it over at the first snag.",
  'Steady stubbornness outlasts short-lived hype.',
  'Finish one step, then take the next.',

  // — Closing out the year —
  'Each day is a brick in something good.',
  "Keep going. You're closer than yesterday.",
  "One day can't undo what repetition built.",
  'Let following through be the rule, not the exception.',
  'This is measured in steps, not speed.',
  'Showing up again and again is the whole secret.',
  "You're building something worth the patience.",
  'Stay on the road. Steady pays off.',
  'Each small follow-through says: I can keep this up.',
  'End the day content with your effort, then go again.',

  // — Craft and learning —
  "Take one small lesson from today's session.",
  'Getting good comes from mindful reps, not rushing.',
  'Improve a little, not everything at once.',
  'Every rep is a chance to do it cleaner.',
  'Watch your progress calmly and learn from it.',
  'Experience collects moment by moment.',
  'Stay a student of your own work.',
  'Craft comes from patience with the details.',
  'Understand the move before you speed it up.',
  'Small careful improvements stick around longer.',

  // — Momentum and movement —
  'Take the first step and the rest follows.',
  'Keep the beat, even a quiet one.',
  "Don't break your run of movement lightly.",
  'Active days feed the ones that follow.',
  'Carrying on is easier than starting over.',
  'Keep your small flow going today.',
  'Momentum gets built, not awaited.',
  'Step after step becomes a path.',
  "Don't let one lazy day kill the spark.",
  'What you do today fuels tomorrow.',

  // — Contentment and meaning —
  'Be okay with your effort before the outcome.',
  "Every step you've taken is worth something.",
  'Be proud you chose to keep going.',
  'Doing it sincerely, over and over, creates meaning.',
  'Mark your small wins today.',
  'Appreciating your steps gives you fresh energy.',
  'Value that you can try at all today.',
  "It's a long way. Be kind along it.",
  "Thank your own commitment. It's care for you.",
  'Liking your own path helps you stay on it.',

  // — Simplicity and focus —
  'Fewer choices, more done.',
  'Pick the biggest step and leave the rest.',
  'Simple is the faster route to sticking with it.',
  'Do less well rather than more scattered.',
  "Knowing today's one step is enough.",
  "Don't complicate what could be simple.",
  'A clear step beats a vague plan.',
  'Stick to the basics today.',
  'Clear one obstacle and starting gets easy.',
  'Simple and done beats complex and pending.',

  // — Decision and will —
  "Today's decision beats yesterday's intention.",
  'Choose your step, then take it confidently.',
  'Willpower grows the more you use it.',
  'A small decision carried out really does count.',
  'Act. A decision left alone fades.',
  'Every yes to a step strengthens your resolve.',
]
