/**
 * Static exercises library data.
 * Provides a baseline of 5 exercises per category so the Exercises page
 * always has content regardless of what the remote API returns.
 *
 * Categories (no breathing – that is handled by the InteractiveBreathingTool):
 *   grounding | cognitive_restructuring | behavioral_activation |
 *   mindfulness | exposure | sleep | relationships | stress_management
 */

export const LOCAL_EXERCISES = [
  // ─── GROUNDING (5) ────────────────────────────────────────────────────────
  {
    id: 'local-grounding-54321',
    title: '5-4-3-2-1 Sensory Grounding',
    description:
      'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste to anchor yourself to the present moment.',
    category: 'grounding',
    difficulty: 'Beginner',
    duration_minutes: 5,
    duration_options: [5, 10],
    tags: ['anxiety', 'grounding', 'senses', 'present-moment'],
    steps: [
      { title: 'See', description: 'Look around and name 5 things you can see right now.' },
      { title: 'Touch', description: 'Notice 4 things you can physically feel or touch.' },
      { title: 'Hear', description: 'Listen carefully and identify 3 sounds in your environment.' },
      { title: 'Smell', description: 'Notice 2 things you can smell (or remember a pleasant scent).' },
      { title: 'Taste', description: 'Notice 1 thing you can taste in your mouth right now.' }
    ],
    benefits: ['Reduces acute anxiety', 'Interrupts rumination', 'Builds present-moment awareness'],
    tips: ['Do this slowly — spend 15–20 seconds on each sense.', 'Works best when anxiety is rising but not overwhelming.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-grounding-body-scan',
    title: 'Body Scan Awareness',
    description:
      'Systematically move your attention through each part of your body, noticing physical sensations without judgment.',
    category: 'grounding',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['body-awareness', 'grounding', 'relaxation'],
    steps: [
      { title: 'Settle', description: 'Sit or lie comfortably and close your eyes.' },
      { title: 'Start at feet', description: 'Bring attention to your feet — warmth, pressure, tingling.' },
      { title: 'Move upward', description: 'Slowly shift awareness from feet → legs → torso → arms → head.' },
      { title: 'Notice without judgment', description: 'Simply observe sensations — tight, warm, cool — without trying to change them.' },
      { title: 'Complete the scan', description: 'Breathe naturally and return to the room when ready.' }
    ],
    benefits: ['Reduces physical tension', 'Improves body awareness', 'Grounds awareness in the present'],
    tips: ['If your mind wanders, gently redirect to the body part you were focusing on.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-grounding-feet-floor',
    title: 'Feet on the Floor',
    description:
      'Press your feet firmly into the floor and focus on that connection to calm your nervous system quickly.',
    category: 'grounding',
    difficulty: 'Beginner',
    duration_minutes: 3,
    duration_options: [3, 5],
    tags: ['quick', 'grounding', 'anxiety', 'calm'],
    steps: [
      { title: 'Plant your feet', description: 'Sit up straight and place both feet flat on the floor.' },
      { title: 'Press down', description: 'Press your feet firmly into the floor and notice the sensation.' },
      { title: 'Breathe', description: 'Take three slow breaths, each time noticing the floor supporting you.' },
      { title: 'Expand awareness', description: 'Notice the weight of your body in the chair or on the floor.' }
    ],
    benefits: ['Very fast to deploy', 'Effective in public settings', 'Interrupts panic early'],
    tips: ['Remove shoes if possible — bare feet on the floor intensifies the effect.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-grounding-object-focus',
    title: 'Object Focus Technique',
    description:
      'Pick up a nearby object and explore it with all your senses to pull your mind away from anxious thoughts.',
    category: 'grounding',
    difficulty: 'Beginner',
    duration_minutes: 5,
    duration_options: [5],
    tags: ['grounding', 'distraction', 'senses'],
    steps: [
      { title: 'Choose an object', description: 'Pick up any small object near you — a pen, stone, or cup.' },
      { title: 'Look closely', description: 'Study its color, shape, and any markings as if you have never seen it before.' },
      { title: 'Feel it', description: 'Notice weight, texture, temperature, and edges.' },
      { title: 'Listen', description: 'Tap it gently or shake it — what sounds does it make?' },
      { title: 'Describe it', description: 'Silently describe the object in as much detail as possible.' }
    ],
    benefits: ['Simple to do anywhere', 'Breaks intrusive thought loops', 'Strengthens mindful attention'],
    tips: ['Choose an object with interesting texture for the most impact.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-grounding-cold-water',
    title: 'Cold Water Reset',
    description:
      'Splash cold water on your face or hold ice to trigger the dive reflex and rapidly reduce emotional intensity.',
    category: 'grounding',
    difficulty: 'Beginner',
    duration_minutes: 2,
    duration_options: [2, 5],
    tags: ['crisis', 'grounding', 'physical', 'quick'],
    steps: [
      { title: 'Prepare', description: 'Get cold water or ice — the colder the better.' },
      { title: 'Apply', description: 'Splash cold water on your face or submerge hands/wrists.' },
      { title: 'Hold', description: 'Hold for 20–30 seconds while holding your breath slightly.' },
      { title: 'Notice', description: 'Feel your heart rate slowing and your body responding.' },
      { title: 'Repeat', description: 'Repeat once or twice if needed until you feel calmer.' }
    ],
    benefits: ['Activates the dive reflex to slow heart rate', 'Very fast-acting', 'Effective for high-distress moments'],
    tips: ['Use ice water if available — it is more effective than cool water.'],
    favorite: false,
    completed_count: 0
  },

  // ─── COGNITIVE (5) ────────────────────────────────────────────────────────
  {
    id: 'local-cognitive-decatastrophizing',
    title: 'Decatastrophizing Practice',
    description:
      'Challenge worst-case thinking by evaluating realistic vs. catastrophic outcomes and building a balanced perspective.',
    category: 'cognitive_restructuring',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['CBT', 'cognitive', 'catastrophizing', 'anxiety'],
    steps: [
      { title: 'Name the catastrophe', description: 'Write down the worst-case scenario you are imagining.' },
      { title: 'Rate its likelihood', description: 'Estimate (0-100%) how likely this worst case actually is.' },
      { title: 'What is realistic?', description: 'Write down the most realistic outcome instead.' },
      { title: 'Best case', description: 'Now write the best-case scenario.' },
      { title: 'Find the middle', description: 'Write a balanced conclusion that acknowledges reality without catastrophizing.' },
      { title: 'Coping plan', description: 'Even if the worst happened — how would you cope? Write two actions.' }
    ],
    benefits: ['Reduces catastrophic thinking', 'Builds resilience', 'Improves problem-solving under stress'],
    tips: ['Be honest about likelihood — our minds often overestimate danger.', 'Practice when calm so it becomes natural in distress.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-cognitive-distortion-detective',
    title: 'Cognitive Distortion Detective',
    description:
      'Identify specific thinking traps (like all-or-nothing thinking or mind-reading) that distort your view of situations.',
    category: 'cognitive_restructuring',
    difficulty: 'Intermediate',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['CBT', 'cognitive-distortions', 'awareness', 'self-compassion'],
    steps: [
      { title: 'Describe the situation', description: 'Briefly describe a recent upsetting event.' },
      { title: 'Name your emotion', description: 'What did you feel? Rate its intensity 0-100.' },
      { title: 'Identify the thought', description: 'What automatic thought went through your mind?' },
      { title: 'Hunt the distortion', description: 'Check: All-or-nothing? Mind-reading? Fortune-telling? Catastrophizing? Labeling? Should statements? Personalization? Magnification?' },
      { title: 'Name it', description: 'Label the distortion(s) you found.' },
      { title: 'Reframe', description: 'Write a more balanced, realistic thought to replace it.' }
    ],
    benefits: ['Builds cognitive self-awareness', 'Breaks automatic negative thought patterns', 'Core CBT skill for depression and anxiety'],
    tips: ['Keep a list of distortion types handy when starting out.', 'Be a curious detective — not a self-critic.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-cognitive-evidence-testing',
    title: 'Evidence-Based Reality Testing',
    description:
      'Examine the real evidence for and against an automatic thought to arrive at a more accurate, balanced conclusion.',
    category: 'cognitive_restructuring',
    difficulty: 'Intermediate',
    duration_minutes: 15,
    duration_options: [15],
    tags: ['CBT', 'evidence', 'reality-testing', 'thoughts'],
    steps: [
      { title: 'Identify the thought', description: 'Write down the automatic thought you want to examine.' },
      { title: 'Evidence FOR', description: 'List genuine facts that support this thought (not feelings — facts).' },
      { title: 'Evidence AGAINST', description: 'List genuine facts that contradict this thought.' },
      { title: 'Weigh the evidence', description: 'Which pile is larger or more convincing? Why?' },
      { title: 'Balanced thought', description: 'Write a more accurate thought that accounts for ALL the evidence.' },
      { title: 'Re-rate emotion', description: 'Rate your emotional intensity again (0-100) — notice any shift.' }
    ],
    benefits: ['Reduces emotional reasoning', 'Builds critical thinking about beliefs', 'Directly challenges core negative beliefs'],
    tips: ['Focus on objective facts, not interpretations or feelings.', 'Ask: "What would I tell a friend in this situation?"'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-cognitive-thought-challenging',
    title: 'Thought Challenging',
    description:
      'Use structured questions to systematically examine and challenge unhelpful automatic thoughts.',
    category: 'cognitive_restructuring',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['CBT', 'thoughts', 'challenging', 'cognitive'],
    steps: [
      { title: 'Capture the thought', description: 'Write down the exact unhelpful thought word for word.' },
      { title: 'Question 1', description: 'Is this thought based on facts or on assumptions/feelings?' },
      { title: 'Question 2', description: 'Am I thinking in extremes (all-or-nothing)?' },
      { title: 'Question 3', description: 'What would a trusted friend say about this thought?' },
      { title: 'Question 4', description: 'Will this matter in 5 years? In 1 year? In 1 month?' },
      { title: 'Alternative thought', description: 'Write a more balanced, helpful alternative thought.' }
    ],
    benefits: ['Directly reduces power of negative thoughts', 'Transferable skill usable any time', 'Builds long-term cognitive flexibility'],
    tips: ['Write responses — writing helps make thoughts more concrete and easier to challenge.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-cognitive-thought-record',
    title: 'Thought Record',
    description:
      'Document an upsetting situation, the emotions and thoughts it triggered, and craft a balanced response.',
    category: 'cognitive_restructuring',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['CBT', 'journaling', 'thoughts', 'emotions'],
    steps: [
      { title: 'Situation', description: 'Describe the situation: where, when, who, what happened.' },
      { title: 'Emotions', description: 'List emotions and rate each 0-100%.' },
      { title: 'Automatic thoughts', description: 'What thoughts ran through your mind? Circle the hottest one.' },
      { title: 'Evidence for', description: 'Evidence supporting the hot thought.' },
      { title: 'Evidence against', description: 'Evidence against the hot thought.' },
      { title: 'Balanced thought', description: 'Write a balanced alternative and re-rate your emotions.' }
    ],
    benefits: ['Foundational CBT skill', 'Reveals thought-emotion patterns over time', 'Reduces emotional reactivity'],
    tips: ['Use paper or a journal — the act of writing is therapeutic.', 'Practice when emotions are mild to build the habit.'],
    favorite: false,
    completed_count: 0
  },

  // ─── BEHAVIORAL (5) ────────────────────────────────────────────────────────
  {
    id: 'local-behavioral-activity-scheduling',
    title: 'Activity Scheduling',
    description:
      'Plan specific enjoyable and meaningful activities into your week to break the cycle of low mood and withdrawal.',
    category: 'behavioral_activation',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['depression', 'behavioral', 'motivation', 'planning'],
    steps: [
      { title: 'Identify activities', description: 'List 5 activities that have brought you pleasure or a sense of accomplishment in the past.' },
      { title: 'Rate them', description: 'Rate each for Pleasure (P) and Mastery/Achievement (M) on a scale of 0-10.' },
      { title: 'Schedule', description: 'Pick 2-3 activities and schedule them into specific days and times this week.' },
      { title: 'Track', description: 'After each activity, note what you actually felt (not what you predicted).' },
      { title: 'Review', description: 'At week end, compare your predictions with reality.' }
    ],
    benefits: ['Counteracts behavioral withdrawal from depression', 'Builds evidence against hopeless thoughts', 'Re-establishes routine and momentum'],
    tips: ['Start small — even a 5-minute pleasant activity counts.', 'Track mood before and after to see the impact.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-behavioral-experiment',
    title: 'Behavioral Experiment',
    description:
      'Design and carry out a real-world mini-experiment to test whether a fear-based belief is actually true.',
    category: 'behavioral_activation',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 30],
    tags: ['CBT', 'behavioral', 'beliefs', 'exposure', 'experiment'],
    steps: [
      { title: 'Identify the belief', description: 'What belief do you want to test? (e.g., "If I speak up, people will think I am stupid.")' },
      { title: 'Prediction', description: 'What do you predict will happen? How likely? 0-100%.' },
      { title: 'Design the experiment', description: 'Plan a safe, small action that will test the belief.' },
      { title: 'Carry it out', description: 'Do the experiment and observe what actually happens.' },
      { title: 'Record results', description: 'What happened? How did it compare to your prediction?' },
      { title: 'Update belief', description: 'What does the evidence say about your original belief?' }
    ],
    benefits: ['Directly tests and weakens unhelpful beliefs', 'Builds experiential evidence', 'More powerful than verbal challenging alone'],
    tips: ['Choose an experiment that is challenging but not overwhelming.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-behavioral-opposite-action',
    title: 'Opposite Action',
    description:
      'When an emotion is pushing you toward an unhelpful behavior, deliberately act in the opposite direction.',
    category: 'behavioral_activation',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['DBT', 'emotion-regulation', 'behavioral', 'urges'],
    steps: [
      { title: 'Name the emotion', description: 'What emotion are you feeling and how intense is it? (0-10)' },
      { title: 'Identify the urge', description: 'What does this emotion make you want to DO? (e.g., hide, attack, avoid)' },
      { title: 'Check if helpful', description: 'Will following that urge improve your situation long-term?' },
      { title: 'Find the opposite', description: 'What would the OPPOSITE behavior look like?' },
      { title: 'Do it', description: 'Commit to the opposite action — even if it feels awkward at first.' },
      { title: 'Re-rate', description: 'After doing the opposite action, re-rate the emotion intensity.' }
    ],
    benefits: ['Directly reduces emotional intensity', 'Core DBT skill', 'Breaks automatic maladaptive behavior cycles'],
    tips: ['Only use when the emotion is leading to unhelpful behavior — not when it is justified.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-behavioral-values-action',
    title: 'Values-Aligned Action',
    description:
      'Identify a core value and commit to one small action that expresses it today to reconnect with what matters most.',
    category: 'behavioral_activation',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15],
    tags: ['ACT', 'values', 'behavioral', 'meaning'],
    steps: [
      { title: 'Name a value', description: 'Pick one of your core values (e.g., family, creativity, health, honesty).' },
      { title: 'Rate alignment', description: 'On a scale of 0-10, how aligned are your recent actions with this value?' },
      { title: 'Identify a barrier', description: 'What has been stopping you from living this value more fully?' },
      { title: 'Commit to one action', description: 'Choose one small, specific action you can take in the next 24 hours.' },
      { title: 'Take the action', description: 'Do it — and notice how it feels to act in line with what matters to you.' }
    ],
    benefits: ['Builds intrinsic motivation', 'Reduces psychological avoidance', 'Core Acceptance & Commitment Therapy skill'],
    tips: ['Choose realistic, concrete actions you can actually complete today.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-behavioral-pleasure-mastery',
    title: 'Pleasure & Mastery Tracking',
    description:
      'Rate daily activities for pleasure and accomplishment to identify what genuinely lifts your mood.',
    category: 'behavioral_activation',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['behavioral', 'mood', 'tracking', 'depression'],
    steps: [
      { title: 'List today\'s activities', description: 'Write down 5-10 things you did today — include small things like making tea.' },
      { title: 'Rate Pleasure', description: 'For each activity, rate Pleasure on a scale of 0-10.' },
      { title: 'Rate Mastery', description: 'For each activity, rate sense of Accomplishment/Mastery on 0-10.' },
      { title: 'Find patterns', description: 'Which activities scored highest? Were there surprises?' },
      { title: 'Plan more', description: 'Schedule at least one high-scoring activity for tomorrow.' }
    ],
    benefits: ['Reveals true mood boosters', 'Challenges "nothing helps" depression beliefs', 'Builds a personalized activity bank'],
    tips: ['Be honest — small activities like a walk often score higher than expected.'],
    favorite: false,
    completed_count: 0
  },

  // ─── MINDFULNESS (5) ──────────────────────────────────────────────────────
  {
    id: 'local-mindfulness-present-moment',
    title: 'Present Moment Awareness',
    description:
      'Bring your full attention to this exact moment — what you are doing, sensing, and experiencing right now.',
    category: 'mindfulness',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [5, 10, 15],
    tags: ['mindfulness', 'awareness', 'present-moment', 'meditation'],
    steps: [
      { title: 'Settle', description: 'Sit comfortably and close your eyes or soften your gaze.' },
      { title: 'Anchor', description: 'Bring attention to the sensation of breathing — just the breath, exactly as it is.' },
      { title: 'Notice wandering', description: 'When your mind wanders (and it will), simply notice this without judgment.' },
      { title: 'Return', description: 'Gently return attention to the breath each time. Repeat as many times as needed.' },
      { title: 'Expand', description: 'Gradually open awareness to include sounds, body sensations, and the full present moment.' }
    ],
    benefits: ['Trains attention regulation', 'Reduces rumination', 'Builds the foundation for all mindfulness practice'],
    tips: ['There is no such thing as a "bad" meditation — noticing your mind wandered IS the practice.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-mindfulness-loving-kindness',
    title: 'Loving-Kindness Meditation',
    description:
      'Silently send wishes of well-being to yourself and others to cultivate compassion and reduce self-criticism.',
    category: 'mindfulness',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [10, 15, 20],
    tags: ['compassion', 'self-compassion', 'mindfulness', 'kindness'],
    steps: [
      { title: 'Begin with yourself', description: 'Silently say: "May I be happy. May I be healthy. May I be safe. May I live with ease."' },
      { title: 'A loved one', description: 'Picture someone you love and send them the same wishes.' },
      { title: 'A neutral person', description: 'Think of someone you neither like nor dislike — send them the same wishes.' },
      { title: 'A difficult person', description: 'If you are ready, extend wishes to someone you find difficult.' },
      { title: 'All beings', description: 'Finally, expand the wishes to all beings everywhere.' }
    ],
    benefits: ['Increases self-compassion', 'Reduces hostility and rumination', 'Builds empathy and connection'],
    tips: ['If sending kindness to yourself is hard, start with a loved one and gradually extend it to yourself.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-mindfulness-urge-surfing',
    title: 'Urge Surfing',
    description:
      'Ride through an urge or craving by observing it like a wave — noticing it rise and fall without acting on it.',
    category: 'mindfulness',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['cravings', 'urges', 'mindfulness', 'impulse-control'],
    steps: [
      { title: 'Notice the urge', description: 'When an urge arises, pause and acknowledge it: "I notice I have an urge to..."' },
      { title: 'Locate it', description: 'Where do you feel the urge in your body? Chest? Throat? Hands?' },
      { title: 'Observe as a wave', description: 'Watch the sensation intensify — like a wave building — without fighting it.' },
      { title: 'Ride it', description: 'Stay with the sensations as they peak and then naturally subside.' },
      { title: 'Let it pass', description: 'Notice the urge fade without you having acted on it. Acknowledge your strength.' }
    ],
    benefits: ['Breaks automatic craving-behavior links', 'Builds distress tolerance', 'Works for addiction, emotional eating, and impulsive behaviors'],
    tips: ['Urges typically peak within 15-20 minutes and then decrease — you just need to wait.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-mindfulness-leaves-stream',
    title: 'Leaves on a Stream',
    description:
      'Visualize placing each thought on a leaf and watching it float downstream — practicing defusion from thoughts.',
    category: 'mindfulness',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['ACT', 'defusion', 'mindfulness', 'thoughts', 'visualization'],
    steps: [
      { title: 'Visualize the stream', description: 'Close your eyes and picture a gentle stream with leaves floating on it.' },
      { title: 'Notice a thought', description: 'When a thought arises, imagine placing it on a leaf.' },
      { title: 'Watch it float', description: 'Watch the leaf carry your thought slowly downstream.' },
      { title: 'No grabbing', description: 'If you find yourself analyzing a thought, notice this and return to watching.' },
      { title: 'Continue', description: 'Keep placing each new thought on a leaf for the duration of the exercise.' }
    ],
    benefits: ['Creates distance from difficult thoughts', 'Reduces thought-fusion', 'Core ACT defusion technique'],
    tips: ['Do not try to empty your mind — the goal is to observe, not stop, thinking.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-mindfulness-mindful-eating',
    title: 'Mindful Eating',
    description:
      'Slow down and bring full sensory attention to a meal or snack, eating with intention and awareness.',
    category: 'mindfulness',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [10, 15, 20],
    tags: ['mindfulness', 'eating', 'senses', 'self-care'],
    steps: [
      { title: 'Choose a small portion', description: 'Pick one piece of food — a raisin, a nut, or a single bite.' },
      { title: 'Look', description: 'Study its color, shape, and texture as if you have never seen it before.' },
      { title: 'Smell', description: 'Bring it to your nose and inhale slowly. Notice what arises.' },
      { title: 'Taste', description: 'Place it on your tongue and notice the first sensations before chewing.' },
      { title: 'Chew slowly', description: 'Chew mindfully, noticing flavor, texture changes, and your urge to swallow.' },
      { title: 'Reflect', description: 'How was this different from your usual eating experience?' }
    ],
    benefits: ['Reduces emotional eating', 'Improves digestion and food satisfaction', 'Trains general mindfulness skills'],
    tips: ['Try this with any food — even your usual meal — for a different experience.'],
    favorite: false,
    completed_count: 0
  },

  // ─── EXPOSURE (5) ─────────────────────────────────────────────────────────
  {
    id: 'local-exposure-fear-hierarchy',
    title: 'Fear Hierarchy Building',
    description:
      'Create a step-by-step ladder of feared situations ranked by anxiety level to guide gradual exposure.',
    category: 'exposure',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 30],
    tags: ['exposure', 'anxiety', 'phobia', 'planning', 'CBT'],
    steps: [
      { title: 'Name the fear', description: 'Identify the situation, object, or experience you want to face.' },
      { title: 'Brainstorm scenarios', description: 'List 8-12 variations of this fear, from mildly uncomfortable to most feared.' },
      { title: 'Rate each', description: 'Rate each scenario SUDS (0-100): how anxious would it make you?' },
      { title: 'Order the ladder', description: 'Arrange scenarios from lowest (20-30 SUDS) to highest (90-100 SUDS).' },
      { title: 'Plan the first step', description: 'Identify the lowest rung you are willing to attempt this week.' }
    ],
    benefits: ['Creates a structured, safe exposure roadmap', 'Makes large fears feel manageable', 'Foundation for all exposure therapies'],
    tips: ['Aim for your first exposure to cause mild-moderate anxiety (30-50 SUDS) — not overwhelming anxiety.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-exposure-systematic-desensitization',
    title: 'Systematic Desensitization',
    description:
      'Pair deep relaxation with gradual imaginal exposure to feared situations to reduce conditioned anxiety responses.',
    category: 'exposure',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 25],
    tags: ['exposure', 'relaxation', 'anxiety', 'desensitization'],
    steps: [
      { title: 'Relax first', description: 'Use deep breathing or progressive muscle relaxation until you feel calm (SUDS < 20).' },
      { title: 'Start with Step 1', description: 'Vividly imagine the lowest item on your fear hierarchy.' },
      { title: 'Hold and rate', description: 'Stay with the image until anxiety drops by 50% from its peak.' },
      { title: 'Return to neutral', description: 'Shift to a pleasant, safe image until you return to baseline calm.' },
      { title: 'Repeat and advance', description: 'Repeat Step 1 until SUDS stays below 25, then move to the next step.' }
    ],
    benefits: ['Weakens conditioned fear responses', 'Gentler than live exposure for severe phobias', 'Prepares for real-world exposure'],
    tips: ['Work with a therapist for severe phobias or trauma-related fears.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-exposure-imaginal',
    title: 'Imaginal Exposure',
    description:
      'Mentally rehearse a feared scenario in vivid detail to reduce avoidance and build tolerance for anxiety.',
    category: 'exposure',
    difficulty: 'Intermediate',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['exposure', 'imagination', 'anxiety', 'PTSD', 'phobia'],
    steps: [
      { title: 'Choose a scenario', description: 'Select a feared scenario from your hierarchy (moderate level first).' },
      { title: 'Make it vivid', description: 'Close your eyes. Describe it with all senses: what do you see, hear, smell, feel?' },
      { title: 'Stay with it', description: 'Resist the urge to escape the image. Notice anxiety without acting on it.' },
      { title: 'Monitor SUDS', description: 'Every 5 minutes, note your anxiety level (0-100).' },
      { title: 'Wait for the drop', description: 'Continue until anxiety decreases by at least 50%. This is habituation.' }
    ],
    benefits: ['Reduces avoidance of feared imagery', 'Useful when live exposure is not immediately available', 'Builds tolerance for distressing thoughts'],
    tips: ['Do not leave the exposure while anxiety is high — wait for it to come down naturally.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-exposure-interoceptive',
    title: 'Interoceptive Exposure',
    description:
      'Deliberately induce physical sensations associated with anxiety (e.g., racing heart, dizziness) to break the fear-of-symptoms cycle.',
    category: 'exposure',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['panic', 'exposure', 'interoceptive', 'anxiety', 'physical'],
    steps: [
      { title: 'Choose a symptom', description: 'Identify a body sensation that triggers anxiety (e.g., rapid heart rate, dizziness).' },
      { title: 'Induce it', description: 'Spin in a chair (dizziness), breathe through a narrow straw (restricted breath), or do jumping jacks (heart rate).' },
      { title: 'Rate anxiety', description: 'Notice your anxiety. How much does the sensation itself frighten you? (0-100)' },
      { title: 'Stay with it', description: 'Resist safety behaviors. Let the sensation peak and subside naturally.' },
      { title: 'Reflect', description: 'What happened? Did anything catastrophic occur?' }
    ],
    benefits: ['Targets panic disorder directly', 'Separates sensations from danger', 'Reduces panic maintenance behaviors'],
    tips: ['Only practice this if you have no medical conditions that contraindicating physical exertion. Consult a doctor if unsure.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-exposure-social',
    title: 'Social Situation Exposure',
    description:
      'Gradually approach feared social interactions — from low-risk to high-risk — to build social confidence.',
    category: 'exposure',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 30],
    tags: ['social-anxiety', 'exposure', 'social', 'confidence'],
    steps: [
      { title: 'Build a social hierarchy', description: 'List social situations from least (e.g., making eye contact) to most feared (e.g., public speaking).' },
      { title: 'Start at the bottom', description: 'Choose the lowest-anxiety item to practice this week.' },
      { title: 'Set a specific goal', description: 'e.g., "I will make eye contact and smile at 3 people today."' },
      { title: 'Do it', description: 'Enter the situation and stay until anxiety decreases noticeably.' },
      { title: 'Debrief', description: 'Afterwards: What happened? Did your feared outcome occur? What did you learn?' }
    ],
    benefits: ['Reduces social anxiety through habituation', 'Builds evidence against social fears', 'Expands social comfort zone progressively'],
    tips: ['Do not use safety behaviors (avoiding eye contact, rehearsing) during exposure — they maintain anxiety.'],
    favorite: false,
    completed_count: 0
  },

  // ─── SLEEP (5) ────────────────────────────────────────────────────────────
  {
    id: 'local-sleep-stimulus-control',
    title: 'Stimulus Control',
    description:
      'Strengthen your bed-sleep association by reserving bed only for sleep and sex, rebuilding the sleep-bed connection.',
    category: 'sleep',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['insomnia', 'sleep', 'CBT-I', 'habits'],
    steps: [
      { title: 'The core rule', description: 'Only go to bed when sleepy — not just tired or drowsy.' },
      { title: 'Bed = sleep only', description: 'Remove screens, work, and worry from the bedroom. Use your bed only for sleep.' },
      { title: 'If you can not sleep', description: 'If you are awake for more than 20 minutes, get up and do something calm until sleepy.' },
      { title: 'Fixed wake time', description: 'Wake at the same time every day — even weekends. This anchors your circadian rhythm.' },
      { title: 'No naps', description: 'Avoid naps during the day, especially in the first 2 weeks of this practice.' }
    ],
    benefits: ['One of the most evidence-based insomnia treatments', 'Rebuilds the bed-sleep association', 'Works for chronic insomnia without medication'],
    tips: ['It typically takes 2-4 weeks of consistent practice before sleep improves noticeably.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-sleep-restriction',
    title: 'Sleep Restriction',
    description:
      'Temporarily reduce time in bed to consolidate fragmented sleep, then gradually extend it as sleep quality improves.',
    category: 'sleep',
    difficulty: 'Intermediate',
    duration_minutes: 15,
    duration_options: [15],
    tags: ['insomnia', 'CBT-I', 'sleep', 'advanced'],
    steps: [
      { title: 'Calculate sleep efficiency', description: 'Track your average actual sleep time for 1 week using a sleep diary.' },
      { title: 'Set your sleep window', description: 'Set your time in bed to equal your average actual sleep time (minimum 5.5 hours).' },
      { title: 'Stick to the window', description: 'Only go to bed at your set bedtime and rise at your fixed wake time.' },
      { title: 'Monitor nightly', description: 'Track how quickly you fall asleep and how often you wake.' },
      { title: 'Extend gradually', description: 'When sleep efficiency exceeds 85% for 5 nights, add 15 minutes to your sleep window.' }
    ],
    benefits: ['Highly effective for chronic insomnia (CBT-I cornerstone)', 'Increases sleep drive and consolidates sleep', 'Reduces time awake in bed'],
    tips: ['This may cause short-term sleepiness — avoid driving when excessively tired. Work with a therapist for severe cases.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-sleep-hygiene',
    title: 'Sleep Hygiene Routine',
    description:
      'Build a consistent pre-sleep wind-down routine to signal your body and mind that it is time to rest.',
    category: 'sleep',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10, 20],
    tags: ['sleep', 'routine', 'habits', 'relaxation'],
    steps: [
      { title: 'Set a wind-down time', description: 'Pick a time 60 minutes before bed to begin winding down.' },
      { title: 'Dim the lights', description: 'Dim all lights and avoid bright screens. Use blue-light filters if needed.' },
      { title: 'Avoid stimulants', description: 'No caffeine after 2pm. Avoid heavy meals within 3 hours of sleep.' },
      { title: 'Do a calming activity', description: 'Choose one: warm bath, light reading, gentle stretching, or journaling.' },
      { title: 'Cool the room', description: 'Keep the bedroom between 65-68°F (18-20°C) — the optimal sleep temperature.' }
    ],
    benefits: ['Improves sleep quality', 'Reduces sleep onset latency', 'Easy to start without professional support'],
    tips: ['Consistency is key — try to follow the routine even on weekends.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-sleep-progressive-relaxation',
    title: 'Progressive Muscle Relaxation for Sleep',
    description:
      'Systematically tense and release muscle groups from feet to face to release physical tension before sleep.',
    category: 'sleep',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['sleep', 'relaxation', 'tension', 'PMR'],
    steps: [
      { title: 'Lie down', description: 'Get into bed and close your eyes. Take three slow breaths.' },
      { title: 'Feet and calves', description: 'Tense foot muscles tightly for 5 seconds, then release fully. Notice the contrast.' },
      { title: 'Thighs and glutes', description: 'Tense thigh muscles for 5 seconds, then release. Let them sink into the bed.' },
      { title: 'Abdomen and chest', description: 'Tighten your stomach for 5 seconds, release. Feel the relaxation spread.' },
      { title: 'Arms and shoulders', description: 'Clench fists and raise shoulders to ears for 5 seconds, then drop and release.' },
      { title: 'Face and jaw', description: 'Scrunch your face tightly for 5 seconds, then let everything go soft.' }
    ],
    benefits: ['Directly releases physical tension', 'Interrupts anxious thought-racing', 'Improves sleep onset'],
    tips: ['Work slowly up the body — there is no need to rush.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-sleep-worry-time',
    title: 'Designated Worry Time',
    description:
      'Schedule a specific daily 15-minute window for worrying so that nighttime thoughts can be "postponed" to tomorrow.',
    category: 'sleep',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['sleep', 'worry', 'rumination', 'CBT'],
    steps: [
      { title: 'Set worry time', description: 'Choose a 15-minute slot each day (NOT near bedtime) as your designated worry time.' },
      { title: 'Write a worry prompt', description: 'Keep a small pad by your bed. When a worry appears at night, write it on the pad.' },
      { title: 'Postpone it', description: 'Remind yourself: "I will think about this at [your worry time] tomorrow."' },
      { title: 'Use worry time', description: 'During your scheduled window, engage with the worries — problem-solve or just feel them.' },
      { title: 'Stop at the end', description: 'When the 15 minutes end, deliberately close the worry window.' }
    ],
    benefits: ['Reduces nighttime rumination', 'Gives worries a legitimate time slot', 'Improves sleep continuity'],
    tips: ['The key is taking the postponement seriously — train your brain that worries will get attention, just not right now.'],
    favorite: false,
    completed_count: 0
  },

  // ─── RELATIONSHIP (5) ─────────────────────────────────────────────────────
  {
    id: 'local-relationship-active-listening',
    title: 'Active Listening Practice',
    description:
      'Improve connection by focusing fully on what someone is saying before preparing your response.',
    category: 'relationships',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['communication', 'relationships', 'listening', 'empathy'],
    steps: [
      { title: 'Give full attention', description: 'Put away your phone and turn to face the person. Make comfortable eye contact.' },
      { title: 'Listen to understand', description: 'Focus entirely on what they are saying — not on what you will say next.' },
      { title: 'Notice body language', description: 'Watch their tone, gestures, and facial expression — not just their words.' },
      { title: 'Reflect back', description: 'After they speak, say: "What I hear you saying is... Is that right?"' },
      { title: 'Validate', description: 'Acknowledge their feelings: "That sounds really difficult/exciting/frustrating."' }
    ],
    benefits: ['Deepens emotional connection', 'Reduces conflict from misunderstanding', 'Makes others feel genuinely heard'],
    tips: ['Resist the urge to problem-solve immediately — often people need to feel heard first.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-relationship-assertive-communication',
    title: 'Assertive Communication',
    description:
      'Express your needs, feelings, and limits clearly and respectfully using "I" statements.',
    category: 'relationships',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['assertiveness', 'communication', 'relationships', 'boundaries'],
    steps: [
      { title: 'Identify your need', description: 'What do you need from this person or situation? Be specific.' },
      { title: 'Use "I" statements', description: 'Structure: "I feel ___ when ___ because ___. I would like ___."' },
      { title: 'Practice the script', description: 'Write or say your "I" statement out loud before the real conversation.' },
      { title: 'Choose the right moment', description: 'Initiate the conversation when both people are calm and have time.' },
      { title: 'Listen to their response', description: 'After sharing, listen to their perspective without becoming defensive.' }
    ],
    benefits: ['Reduces passive or aggressive communication patterns', 'Increases chance of needs being met', 'Builds mutual respect in relationships'],
    tips: ['Avoid "you always" or "you never" — these trigger defensiveness. Stick to "I" statements.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-relationship-conflict-resolution',
    title: 'Conflict De-escalation',
    description:
      'Navigate difficult conversations with structured steps to reach mutual understanding without escalation.',
    category: 'relationships',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 30],
    tags: ['conflict', 'communication', 'relationships', 'de-escalation'],
    steps: [
      { title: 'Call a time-out if needed', description: 'If either person is flooded (heart racing), agree to pause for 20 minutes.' },
      { title: 'Self-soothe', description: 'During the pause, do something calming — not rehearsing arguments.' },
      { title: 'Re-approach', description: 'Return when both are calmer. Begin with: "I want to understand your perspective."' },
      { title: 'Share your experience', description: 'Use "I" statements to describe your feelings without blame.' },
      { title: 'Find common ground', description: 'Identify at least one thing you both agree on or both want.' },
      { title: 'Problem-solve together', description: 'Brainstorm solutions that partially address both of your needs.' }
    ],
    benefits: ['Prevents conflict from escalating into damage', 'Models healthy disagreement patterns', 'Builds trust through repair'],
    tips: ['Physiological flooding (heart rate > 100 BPM) impairs thinking — a break is not avoidance, it is necessary.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-relationship-boundary-setting',
    title: 'Boundary Setting',
    description:
      'Identify and communicate your personal limits in relationships with clarity and self-respect.',
    category: 'relationships',
    difficulty: 'Intermediate',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['boundaries', 'relationships', 'assertiveness', 'self-care'],
    steps: [
      { title: 'Identify the boundary', description: 'What specific behavior or situation crosses a limit for you? Write it down.' },
      { title: 'Understand why', description: 'Why does this boundary matter? What value does it protect (e.g., safety, time, respect)?' },
      { title: 'Decide the consequence', description: 'What will you do (not threaten) if the boundary is crossed again?' },
      { title: 'Communicate it', description: 'Calmly say: "When X happens, I feel Y. I need Z going forward."' },
      { title: 'Follow through', description: 'If the boundary is crossed, apply the consequence calmly and without apology.' }
    ],
    benefits: ['Protects mental and emotional wellbeing', 'Reduces resentment and burnout', 'Models healthy relationship dynamics'],
    tips: ['Boundaries are not walls — they define how you want to be treated, not demands that others change.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-relationship-gratitude-expression',
    title: 'Gratitude Expression',
    description:
      'Actively share specific appreciation with people in your life to strengthen bonds and boost mutual positive emotion.',
    category: 'relationships',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['gratitude', 'relationships', 'positivity', 'connection'],
    steps: [
      { title: 'Choose a person', description: 'Think of someone who has positively impacted your life recently or over time.' },
      { title: 'Identify the specific act', description: 'Think of one specific thing they did — not general appreciation.' },
      { title: 'Name the impact', description: 'How did this affect you? What did it mean to you?' },
      { title: 'Express it', description: 'Tell them directly — in person, by message, or by letter.' },
      { title: 'Reflect', description: 'How did it feel to express gratitude? How did they respond?' }
    ],
    benefits: ['Strengthens relationship quality', 'Boosts both the giver\'s and receiver\'s mood', 'Counteracts negativity bias in relationships'],
    tips: ['Specific gratitude ("Thank you for listening on Tuesday when I was stressed") is more meaningful than general gratitude.'],
    favorite: false,
    completed_count: 0
  },

  // ─── STRESS MANAGEMENT (5) ────────────────────────────────────────────────
  {
    id: 'local-stress-time-blocking',
    title: 'Time Blocking',
    description:
      'Organize your day into dedicated focus blocks to reduce overwhelm and increase sense of control.',
    category: 'stress_management',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [15, 20],
    tags: ['stress', 'productivity', 'planning', 'overwhelm'],
    steps: [
      { title: 'List your tasks', description: 'Write down everything you need to do today — clear your head onto paper.' },
      { title: 'Estimate time', description: 'Assign a realistic time estimate to each task.' },
      { title: 'Create blocks', description: 'Divide your day into 90-minute blocks and assign tasks to each block.' },
      { title: 'Include buffer time', description: 'Add 15-minute buffers between blocks for transitions and the unexpected.' },
      { title: 'Work the block', description: 'During each block, work only on that task. Silence notifications.' }
    ],
    benefits: ['Reduces decision fatigue', 'Creates a sense of control over the day', 'Prevents tasks from expanding into unstructured time'],
    tips: ['Review and adjust your blocks at the midpoint of the day — do not rigidly stick to a plan that no longer fits.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-stress-worry-postponement',
    title: 'Worry Postponement',
    description:
      'Delay worries to a scheduled time so that you can reclaim the rest of your day from unproductive rumination.',
    category: 'stress_management',
    difficulty: 'Beginner',
    duration_minutes: 10,
    duration_options: [10],
    tags: ['stress', 'worry', 'rumination', 'CBT'],
    steps: [
      { title: 'Notice the worry', description: 'When a worry pops up, notice it without immediately engaging with it.' },
      { title: 'Schedule it', description: 'Tell yourself: "I will worry about this at [specific time] today."' },
      { title: 'Write it down', description: 'Jot the worry on a list so your brain can let go of it.' },
      { title: 'Return to the present', description: 'Redirect your attention to what you were doing before the worry appeared.' },
      { title: 'Use worry time', description: 'At your scheduled time, review the list. Many worries will feel less urgent.' }
    ],
    benefits: ['Reduces rumination throughout the day', 'Puts worry under voluntary control', 'Frees mental space for effective action'],
    tips: ['If you catch yourself worrying outside worry time — just note it and return. Do not battle the thought.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-stress-problem-solving',
    title: 'Structured Problem Solving',
    description:
      'Break down a stressor into a manageable solvable problem using a clear 5-step framework.',
    category: 'stress_management',
    difficulty: 'Intermediate',
    duration_minutes: 20,
    duration_options: [20, 30],
    tags: ['stress', 'problem-solving', 'planning', 'coping'],
    steps: [
      { title: 'Define the problem', description: 'State the problem clearly and specifically. Avoid vague descriptions like "everything is wrong."' },
      { title: 'Brainstorm solutions', description: 'List every possible solution — practical or not. No evaluation yet.' },
      { title: 'Evaluate options', description: 'Rate each solution for Feasibility (1-5) and Effectiveness (1-5).' },
      { title: 'Choose and plan', description: 'Select the best option. Plan the specific steps you will take and when.' },
      { title: 'Review', description: 'After implementing, evaluate: Did it help? What would you do differently?' }
    ],
    benefits: ['Converts helpless worrying into active action', 'Reduces avoidance of difficult situations', 'Builds confidence in problem-solving ability'],
    tips: ['Only apply to problems that are within your influence. Practice accepting the ones that are not.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-stress-progressive-muscle',
    title: 'Progressive Muscle Relaxation',
    description:
      'Relieve physical stress tension by systematically tensing and releasing muscle groups throughout your body.',
    category: 'stress_management',
    difficulty: 'Beginner',
    duration_minutes: 15,
    duration_options: [10, 15, 20],
    tags: ['stress', 'relaxation', 'tension', 'PMR', 'body'],
    steps: [
      { title: 'Find a quiet place', description: 'Sit or lie in a comfortable position and close your eyes.' },
      { title: 'Hands and forearms', description: 'Clench your fists and tighten forearms for 5 seconds, then release. Notice warmth.' },
      { title: 'Upper arms', description: 'Flex your biceps tightly for 5 seconds, then release and let arms drop heavy.' },
      { title: 'Shoulders and neck', description: 'Hunch shoulders to ears for 5 seconds, then release. Drop all tension.' },
      { title: 'Face', description: 'Scrunch your face — brow, eyes, jaw — for 5 seconds, then smooth and release.' },
      { title: 'Chest and abdomen', description: 'Tighten your chest and stomach, hold 5 seconds, then release with a long exhale.' },
      { title: 'Legs and feet', description: 'Tense thighs, calves, and feet together for 5 seconds, then release.' }
    ],
    benefits: ['Directly relieves physical tension from stress', 'Teaches contrast between tension and relaxation', 'Improves body awareness'],
    tips: ['Practice daily for maximum effect — it gets easier and faster with repetition.'],
    favorite: false,
    completed_count: 0
  },
  {
    id: 'local-stress-cognitive-reframing',
    title: 'Stress Reframing',
    description:
      'Identify and shift your perspective on stressors to reduce their emotional impact and see opportunities.',
    category: 'stress_management',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    duration_options: [10, 15],
    tags: ['stress', 'reframing', 'cognitive', 'perspective', 'resilience'],
    steps: [
      { title: 'Name the stressor', description: 'Write down what is stressing you — be specific.' },
      { title: 'Current perspective', description: 'How are you currently thinking about this stressor? Write it out.' },
      { title: 'Challenge the frame', description: 'Ask: Is this a threat or a challenge? What would a resilient person think here?' },
      { title: 'Find a silver lining', description: 'Is there any opportunity, learning, or strength embedded in this stressor?' },
      { title: 'Write a new perspective', description: 'Write a more balanced, growth-oriented view of the situation.' },
      { title: 'Rate the change', description: 'How much stress (0-100) do you feel with the new perspective vs. the old one?' }
    ],
    benefits: ['Reduces stress reactivity', 'Builds cognitive flexibility and resilience', 'Prevents stress from becoming chronic'],
    tips: ['Reframing is not about toxic positivity — it is about finding the most accurate, helpful perspective.'],
    favorite: false,
    completed_count: 0
  }
];

/**
 * The 8 required exercise categories (not including breathing, which is handled separately).
 * Each entry maps the category key (used in exercise data) to a display label.
 */
export const EXERCISE_CATEGORIES = [
  { value: 'grounding', label: 'Grounding' },
  { value: 'cognitive_restructuring', label: 'Cognitive' },
  { value: 'behavioral_activation', label: 'Behavioral' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'exposure', label: 'Exposure' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'relationships', label: 'Relationship' },
  { value: 'stress_management', label: 'Stress Management' }
];

/**
 * The 4 required CBT exercises that must exist under Cognitive.
 */
export const REQUIRED_COGNITIVE_EXERCISE_IDS = [
  'local-cognitive-decatastrophizing',
  'local-cognitive-distortion-detective',
  'local-cognitive-evidence-testing',
  'local-cognitive-thought-challenging'
];

/**
 * Dev-only validation. Runs at exercises page mount in non-production environments.
 * Asserts: 5 exercises per category, 4 required CBT exercises exist under Cognitive, no duplicate IDs.
 * @param {Array} allExercises - the merged array of exercises to validate
 */
export function validateExercisesTaxonomy(allExercises) {
  // Skip in server-side or non-browser contexts
  if (typeof window === 'undefined') return;

  const errors = [];

  // 1. No duplicate IDs
  const ids = allExercises.map(e => e.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    errors.push(`Duplicate exercise IDs found: ${[...new Set(dupes)].join(', ')}`);
  }

  // 2. Each of the 8 categories has at least 5 visible exercises
  for (const cat of EXERCISE_CATEGORIES) {
    const count = allExercises.filter(e => e.category === cat.value).length;
    if (count < 5) {
      errors.push(`Category "${cat.label}" (${cat.value}) has only ${count} exercise(s) — need at least 5`);
    }
  }

  // 3. The 4 required CBT exercises exist and are under cognitive_restructuring
  for (const reqId of REQUIRED_COGNITIVE_EXERCISE_IDS) {
    const found = allExercises.find(e => e.id === reqId);
    if (!found) {
      errors.push(`Required CBT exercise "${reqId}" not found in exercises list`);
    } else if (found.category !== 'cognitive_restructuring') {
      errors.push(`Required CBT exercise "${reqId}" is under "${found.category}" — must be "cognitive_restructuring"`);
    }
  }

  if (errors.length > 0) {
    console.group('%c[Exercises Taxonomy Validation] Issues found', 'color: orange; font-weight: bold');
    errors.forEach(e => console.warn('*', e));
    console.groupEnd();
  } else {
    console.log('%c[Exercises Taxonomy Validation] All checks passed', 'color: green; font-weight: bold');
  }
}

/**
 * Merge local exercises with API exercises.
 * Local exercises serve as the baseline; API exercises that share an ID with a local one
 * are skipped (local wins). This prevents duplicates while allowing the API to extend the library.
 * @param {Array} apiExercises - exercises returned from the remote API
 * @returns {Array} merged and deduplicated exercise list
 */
export function mergeExercises(apiExercises = []) {
  const localIds = new Set(LOCAL_EXERCISES.map(e => e.id));
  const uniqueApiExercises = apiExercises.filter(e => !localIds.has(e.id));
  return [...LOCAL_EXERCISES, ...uniqueApiExercises];
}