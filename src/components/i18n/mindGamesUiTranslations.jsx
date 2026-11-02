// Mind Games UI translations - game UI strings (prompts, labels, buttons)
// This covers all games for all 7 supported languages

export const mindGamesUiStrings = {
  // English (default - used as fallback)
  common: { try_another: "Try Another" },
  memory_match: {
    title: "Memory Match",
    instructions: "Find all matching pairs by clicking cards.",
    moves: "Moves",
    complete_title: "Well done!",
    complete_message: "You completed the memory game in {{moves}} moves."
  },
  focus_flow: {
    title: "Focus Flow",
    instructions: "Watch the sequence carefully, then repeat it.",
    watch_carefully: "Watch carefully...",
    level: "Level",
    game_over: "Good effort!",
    final_score: "You reached level {{score}}.",
    colors: { teal: "Teal", lavender: "Lavender", coral: "Coral", sage: "Sage" }
  },
  pattern_shift: {
    title: "Pattern Shift",
    complete_title: "Pattern Master!",
    complete_message: "You got {{score}} out of {{total}} patterns correct.",
    patterns: [
      { question: "What comes next in the pattern: Red, Blue, Green, Red, Blue, ?" },
      { question: "Which shape completes the pattern: Circle, Square, ?, Circle?" },
      { question: "What size comes next: Large, Medium, ?, Large?" },
      { question: "Continue the pattern: 1, 2, 3, 1, ?" }
    ],
    option_colors: ["Red", "Blue", "Green"],
    option_shapes: ["Circle", "Square", "Triangle"],
    option_sizes: ["Small", "Medium", "Large"]
  },
  word_association: {
    title: "Word Association",
    instructions: "Quickly think of a word related to the one shown. Complete 5 associations.",
    prompt: "What word comes to mind?",
    input_placeholder: "Type your association...",
    submit: "Submit",
    your_chain: "Your chain:",
    complete_title: "Creative thinking!",
    complete_message: "You've created a unique chain of associations.",
    start_words: ["Calm", "Growth", "Strength", "Joy", "Peace", "Courage", "Hope", "Balance"]
  },
  number_sequence: {
    title: "Number Sequence",
    instructions: "Find the pattern and predict the next number.",
    answer_placeholder: "Your answer",
    check: "Check",
    correct: "Correct!",
    incorrect: "Not quite. The answer is {{answer}}.",
    complete_title: "Sequence solved!",
    complete_message: "You got {{score}} out of {{total}} sequences correct.",
    sequences: [
      { rule: "Pattern: Add 2 each time" },
      { rule: "Pattern: Add increasing numbers (1, 2, 3, 4, 5)" },
      { rule: "Pattern: Multiples of 5" },
      { rule: "Pattern: Add 1, then 2, then 3, then 4" },
      { rule: "Pattern: Multiply by 2 each time" }
    ]
  },
  reframe_pick: {
    situation: "Situation:",
    automatic_thought: "Automatic thought:",
    choose: "Choose the most balanced response:",
    why_label: "Why this works:"
  },
  evidence_balance: {
    thought_label: "Thought:",
    for_label: "Evidence FOR:",
    against_label: "Evidence AGAINST:",
    show_conclusion: "Show Balanced Conclusion",
    conclusion_label: "Balanced Conclusion:"
  },
  quick_win: {
    log_prompt: "Log one small win from today:",
    input_placeholder: "Type your win...",
    log_button: "Log",
    preset_prompt: "Or pick a common win:",
    success_message: "Win logged! Keep building momentum."
  },
  opposite_action: {
    emotion_label: "Emotion:",
    urge_label: "Urge:",
    opposite_label: "Opposite Action:",
    pick_step: "Pick one small step:",
    note_label: "Note:"
  },
  urge_surfing: {
    completed: "Completed: {{count}}",
    guided: "Guided",
    independent: "Independent",
    finish_prompt: "After surfing, pick one:",
    success: "✓ Good! Urges rise and fall. You rode the wave."
  },
  value_compass: {
    pick_value: "Pick a value that matters to you right now:",
    your_value: "Your Value: {{value}}",
    pick_action: "Choose one tiny action aligned with this value:",
    success: "✓ Great! Small value-based actions build a meaningful life.",
    reset: "Pick Different Value"
  },
  tiny_experiment: {
    belief_label: "Belief to test:",
    pick_experiment: "Pick one tiny experiment (2 min max):",
    success: "✓ Experiments collect data. Even 'negative' results teach you something valuable."
  },
  worry_time: {
    current_worry: "Current Worry:",
    park_it: "Park it:",
    tiny_step: "Do this tiny step now:",
    success: "✓ Great! You parked the worry and took a present-moment action."
  },
  dbt_stop: {
    trigger: "Trigger:",
    next_step: "Choose one wise next step:",
    chosen: "✓ You chose: {{step}}"
  },
  defusion_cards: {
    sticky_thought: "Sticky Thought:",
    prompt: "Try one defusion line:",
    success: "Nice! You created space between you and the thought. Notice: you can observe it without being controlled by it.",
    next_card: "Next Card"
  },
  calm_bingo: {
    prompt: "Mark 2 actions you'll do now:",
    success: "✓ Mini round complete! Take a moment to do these now."
  },
  tipp_skills: {
    prompt: "When you need to change your body chemistry fast:",
    pick_action: "Pick one to try right now:",
    success: "✓ Great! TIPP skills change your physiology to reduce emotional intensity."
  },
  accepts: {
    prompt: "When you need to distract from overwhelming emotions, use ACCEPTS:",
    try_now: "Try this now:"
  },
  improve: {
    prompt: "IMPROVE the moment when you're in crisis and need to shift your state:",
    quick_action: "Quick Action:"
  },
  self_soothe: {
    prompt: "Self-soothe with your 5 senses to create moments of comfort and safety.",
    back: "← Back to senses",
    success: "✓ Take a moment to fully experience this. Self-soothing is a gift you give yourself."
  },
  mountain_meditation: {
    step_of: "Step {{current}} of {{total}}",
    steps: [
      "Close your eyes or soften your gaze.",
      "Imagine a mountain—solid, grounded, unshakable.",
      "Feel your body as the mountain: stable, rooted.",
      "Weather passes over the mountain: storms, sun, rain, wind.",
      "The mountain remains. It doesn't fight the weather—it allows it.",
      "You are like the mountain. Thoughts and emotions are like weather.",
      "They come and go. You remain."
    ],
    completion: "You practiced Mountain Meditation. Use this metaphor anytime you need to remember your stability."
  },
  check_the_facts: {
    description: "Check the Facts helps you determine if your emotion fits the situation. If it doesn't, you can work to change it.",
    emotion_prompt: "What emotion are you feeling?",
    emotions: ["Fear", "Anger", "Sadness", "Guilt", "Shame"],
    check_btn: "Check the Facts",
    for_emotion: "For {{emotion}}, ask yourself:",
    default_prompts: ["What are the facts?", "Am I adding interpretations?", "Does this emotion fit?"],
    tip: "If the facts don't support the emotion's intensity, use opposite action or other skills to shift it.",
    emotion_prompts: {
      fear: ["Is there real, immediate danger?", "What's the worst that could happen?", "What's the evidence?"],
      anger: ["Did someone violate my rights on purpose?", "Is this threat to my goals real?", "Will anger help or hurt?"],
      sadness: ["Did I actually lose something important?", "Is it permanent or can I recover?", "What would help me cope?"],
      guilt: ["Did I actually do something against my values?", "Was it within my control?", "What repair is needed?"],
      shame: ["Is the whole 'me' bad, or just this action?", "Would others see it the same way?", "Can I separate behavior from identity?"]
    }
  },
  pros_and_cons: {
    description: "Use Pros & Cons when you're considering a crisis behavior or tough decision.",
    decision_prompt: "What decision are you facing?",
    decision_placeholder: "e.g., Should I send that message now?",
    start_btn: "Start Analysis",
    pros_label: "Pros of doing it:",
    pros_placeholder: "What are the short-term benefits?",
    next_cons_btn: "Next: Cons",
    cons_label: "Cons of doing it:",
    cons_placeholder: "What are the long-term costs?",
    see_result_btn: "See Result",
    pros_result_label: "Pros:",
    cons_result_label: "Cons:",
    conclusion: "Often, short-term relief has long-term costs. What choice serves your values?"
  },
  values_check: {
    prompt: "Quick check: Which value matters most to you right now?",
    alignment_prompt: "Are your recent actions aligned with this value?",
    yes: "Yes",
    somewhat: "Somewhat",
    not_really: "Not Really",
    result_yes: "✓ Great! Keep moving in this direction.",
    result_somewhat: "→ Good awareness. What's one small step toward more alignment?",
    result_no: "Noticed the gap? That's the first step. Choose one tiny action today.",
    tip: "Values aren't goals to achieve—they're directions to move toward.",
    values: {
      connection: "Connection", growth: "Growth", authenticity: "Authenticity",
      courage: "Courage", compassion: "Compassion", creativity: "Creativity",
      health: "Health", peace: "Peace"
    }
  },
  expansion: {
    description: "Expansion is making room for difficult emotions instead of fighting them.",
    emotion_prompt: "What emotion is present right now?",
    emotion_placeholder: "e.g., anxiety, sadness, anger",
    begin_btn: "Begin Expansion Practice",
    steps: [
      "Name the emotion you're feeling.",
      "Where do you feel it in your body?",
      "Instead of pushing it away, breathe into that spot.",
      "Imagine making space around the feeling—not shrinking it, just allowing it.",
      "Notice: You can feel this AND still move forward."
    ],
    completion: "✓ You practiced making room for {{emotion}}. Expansion doesn't make feelings go away—it helps you carry them with less struggle."
  },
  leaves_on_stream: {
    description: "Imagine a gentle stream with leaves floating by. Place sticky thoughts on leaves and watch them drift away.",
    thought_prompt: "What thought is hooking you right now?",
    thought_placeholder: "e.g., I'm not good enough",
    place_btn: "Place on Leaf & Watch it Float",
    floating: "Floating away...",
    tip: "You're not trying to get rid of thoughts—just noticing them without grabbing on."
  },
  half_smile: {
    description: "Half Smile is a gentle facial expression that can shift your emotional state. Even a tiny smile signals safety to your nervous system.",
    feel_now_prompt: "How do you feel right now?",
    emotions: ["Tense", "Frustrated", "Anxious", "Sad", "Neutral"],
    try_prompt: "Try this for 30 seconds:",
    instructions: [
      "Relax your face, especially your jaw.",
      "Lift the corners of your mouth just slightly (10%).",
      "Soften your eyes.",
      "Breathe slowly."
    ],
    practiced_btn: "I Practiced for 30 Seconds",
    feel_after_prompt: "How do you feel now?",
    result: "✓ Before: {{before}} → After: {{after}}\n\nEven a subtle shift matters. Half Smile is a tool you can use anywhere, anytime."
  },
  willing_hands: {
    description: "Willing Hands is a body-based acceptance practice. It signals openness to reality, even when it's hard.",
    steps: [
      "Turn your hands palms up and rest them on your lap or by your sides.",
      "Relax your hands completely—let tension drain out.",
      "Soften your face, especially jaw and forehead.",
      "Breathe naturally and say (silently): 'I am willing.'",
      "Hold this for 30 seconds, noticing any shift."
    ],
    completion: "✓ Nice! Willing Hands is a physical gesture of acceptance. Practice it anytime you're fighting reality."
  }
};

export const mindGamesUiByLanguage = {
  he: {
    common: { try_another: "נסה אחר" },
    reframe_pick: {
      situation: "מצב:",
      automatic_thought: "מחשבה אוטומטית:",
      choose: "בחרו את התגובה המאוזנת ביותר:",
      why_label: "למה זה עובד:"
    },
    evidence_balance: {
      thought_label: "מחשבה:",
      for_label: "ראיות בעד:",
      against_label: "ראיות נגד:",
      show_conclusion: "הצג מסקנה מאוזנת",
      conclusion_label: "מסקנה מאוזנת:"
    },
    memory_match: {
      title: "התאמת זיכרון",
      instructions: "מצאו את כל הזוגות התואמים על ידי לחיצה על קלפים.",
      moves: "מהלכים",
      complete_title: "כל הכבוד!",
      complete_message: "השלמתם את משחק הזיכרון ב-{{moves}} מהלכים."
    },
    focus_flow: {
      title: "זרימת מיקוד",
      instructions: "צפו ברצף בעיון, ואז חזרו עליו.",
      watch_carefully: "צפו בעיון...",
      level: "רמה",
      game_over: "מאמץ טוב!",
      final_score: "הגעתם לרמה {{score}}.",
      colors: { teal: "טורקיז", lavender: "לבנדר", coral: "אלמוג", sage: "מרווה" }
    },
    pattern_shift: {
      title: "שינוי דפוסים",
      complete_title: "אמן דפוסים!",
      complete_message: "קיבלתם {{score}} מתוך {{total}} דפוסים נכון.",
      patterns: [
        { question: "מה בא הבא בדפוס: אדום, כחול, ירוק, אדום, כחול, ?" },
        { question: "איזו צורה משלימה את הדפוס: עיגול, ריבוע, ?, עיגול?" },
        { question: "איזה גודל בא הבא: גדול, בינוני, ?, גדול?" },
        { question: "המשיכו את הדפוס: 1, 2, 3, 1, ?" }
      ],
      option_colors: ["אדום", "כחול", "ירוק"],
      option_shapes: ["עיגול", "ריבוע", "משולש"],
      option_sizes: ["קטן", "בינוני", "גדול"]
    },
    word_association: {
      title: "קישור מילים",
      instructions: "חשבו במהירות על מילה הקשורה לזו המוצגת. השלימו 5 קישורים.",
      prompt: "איזו מילה עולה בראש?",
      input_placeholder: "הקלידו את הקישור שלכם...",
      submit: "שלח",
      your_chain: "השרשרת שלכם:",
      complete_title: "חשיבה יצירתית!",
      complete_message: "יצרתם שרשרת ייחודית של קישורים.",
      start_words: ["רוגע", "צמיחה", "כוח", "שמחה", "שלום", "אומץ", "תקווה", "איזון"]
    },
    number_sequence: {
      title: "רצף מספרים",
      instructions: "מצאו את הדפוס וחזו את המספר הבא.",
      answer_placeholder: "התשובה שלכם",
      check: "בדוק",
      correct: "נכון!",
      incorrect: "לא בדיוק. התשובה היא {{answer}}.",
      complete_title: "רצף נפתר!",
      complete_message: "קיבלתם {{score}} מתוך {{total}} רצפים נכון.",
      sequences: [
        { rule: "דפוס: הוסף 2 בכל פעם" },
        { rule: "דפוס: הוסף מספרים עולים (1, 2, 3, 4, 5)" },
        { rule: "דפוס: כפולות של 5" },
        { rule: "דפוס: הוסף 1, אז 2, אז 3, אז 4" },
        { rule: "דפוס: הכפל ב-2 בכל פעם" }
      ]
    },
    quick_win: {
      log_prompt: "רשום ניצחון קטן אחד מהיום:",
      input_placeholder: "הקלד את הניצחון שלך...",
      log_button: "רשום",
      preset_prompt: "או בחר ניצחון נפוץ:",
      success_message: "ניצחון נרשם! המשך לבנות תנופה."
    },
    opposite_action: {
      emotion_label: "רגש:",
      urge_label: "דחף:",
      opposite_label: "פעולה הפוכה:",
      pick_step: "בחר צעד קטן אחד:",
      note_label: "הערה:"
    },
    urge_surfing: {
      completed: "הושלם: {{count}}",
      guided: "מודרך",
      independent: "עצמאי",
      finish_prompt: "אחרי הגלישה, בחר אחד:",
      success: "✓ טוב! דחפים עולים ויורדים. רכבת על הגל."
    },
    value_compass: {
      pick_value: "בחר ערך שחשוב לך עכשיו:",
      your_value: "הערך שלך: {{value}}",
      pick_action: "בחר פעולה קטנה אחת המיושרת עם הערך הזה:",
      success: "✓ נהדר! פעולות קטנות מבוססות ערכים בונות חיים משמעותיים.",
      reset: "בחר ערך אחר"
    },
    tiny_experiment: {
      belief_label: "אמונה לבדיקה:",
      pick_experiment: "בחר ניסוי קטן אחד (מקסימום 2 דקות):",
      success: "✓ ניסויים אוספים נתונים. גם תוצאות 'שליליות' מלמדות אותך משהו יקר."
    },
    worry_time: {
      current_worry: "דאגה נוכחית:",
      park_it: "חנה אותה:",
      tiny_step: "עשה את הצעד הקטן הזה עכשיו:",
      success: "✓ נהדר! חנית את הדאגה ולקחת פעולה ברגע הנוכחי."
    },
    dbt_stop: {
      trigger: "טריגר:",
      next_step: "בחר צעד חכם אחד הבא:",
      chosen: "✓ בחרת: {{step}}"
    },
    defusion_cards: {
      sticky_thought: "מחשבה דביקה:",
      prompt: "נסה שורת דפיוזן אחת:",
      success: "יפה! יצרת מרחב בינך לבין המחשבה. שים לב: אתה יכול להתבונן בה מבלי שהיא שולטת בך.",
      next_card: "קלף הבא"
    },
    calm_bingo: {
      prompt: "סמן 2 פעולות שתעשה עכשיו:",
      success: "✓ סיבוב מיני הושלם! קח רגע לעשות אלה עכשיו."
    },
    tipp_skills: {
      prompt: "כאשר אתה צריך לשנות את כימיית הגוף שלך במהירות:",
      pick_action: "בחר אחד לנסות עכשיו:",
      success: "✓ נהדר! מיומנויות TIPP משנות את הפיזיולוגיה שלך כדי להפחית עוצמה רגשית."
    },
    accepts: {
      prompt: "כאשר אתה צריך להסיח את הדעת מרגשות מכריעים, השתמש ב-ACCEPTS:",
      try_now: "נסה את זה עכשיו:"
    },
    improve: {
      prompt: "שפר את הרגע כאשר אתה במשבר וצריך לשנות מצב:",
      quick_action: "פעולה מהירה:"
    },
    self_soothe: {
      prompt: "הרגע עצמך עם 5 החושים שלך כדי ליצור רגעים של נוחות ובטחון.",
      back: "← חזרה לחושים",
      success: "✓ קח רגע לחוות את זה במלואו. הרגעה עצמית היא מתנה שאתה נותן לעצמך."
    },
    mountain_meditation: {
      step_of: "שלב {{current}} מתוך {{total}}",
      steps: [
        "עצמו את עיניכם או רכּכו את המבט.",
        "דמיינו הר - מוצק, יציב, בלתי ניתן לטלטול.",
        "הרגישו את גופכם כהר: יציב, שורשי.",
        "מזג האוויר עובר מעל ההר: סופות, שמש, גשם, רוח.",
        "ההר נשאר. הוא לא נלחם במזג האוויר - הוא מאפשר אותו.",
        "אתם כמו ההר. מחשבות ורגשות הם כמו מזג האוויר.",
        "הם באים והולכים. אתם נשארים."
      ],
      completion: "תרגלתם מדיטציית הר. השתמשו במטאפורה הזו בכל עת שצריכים להזכיר לעצמכם את יציבותכם."
    },
    check_the_facts: {
      description: "בדיקת העובדות עוזרת לכם לקבוע אם הרגש שלכם מתאים למצב. אם לא, אתם יכולים לעבוד על שינויו.",
      emotion_prompt: "איזה רגש אתם חשים?",
      emotions: ["פחד", "כעס", "עצב", "אשמה", "בושה"],
      check_btn: "בדוק את העובדות",
      for_emotion: "עבור {{emotion}}, שאלו את עצמכם:",
      default_prompts: ["מהן העובדות?", "האם אני מוסיף פרשנויות?", "האם הרגש הזה מתאים?"],
      tip: "אם העובדות לא תומכות בעוצמת הרגש, השתמשו בפעולה הפוכה או מיומנויות אחרות כדי לשנות אותו.",
      emotion_prompts: {
        fear: ["האם קיים סכנה אמיתית ומיידית?", "מה הגרוע ביותר שיכול לקרות?", "מה הראיות?"],
        anger: ["האם מישהו הפר את זכויותיי בכוונה?", "האם האיום על מטרותיי אמיתי?", "האם הכעס יעזור או יפגע?"],
        sadness: ["האם באמת איבדתי משהו חשוב?", "האם זה קבוע או שאני יכול להתאושש?", "מה יעזור לי להתמודד?"],
        guilt: ["האם באמת עשיתי משהו נגד ערכיי?", "האם זה היה בשליטתי?", "איזה תיקון נדרש?"],
        shame: ["האם כל ה'אני' רע, או רק הפעולה הזו?", "האם אחרים היו רואים זאת באותו אופן?", "האם אני יכול להפריד בין ההתנהגות לזהות?"]
      }
    },
    pros_and_cons: {
      description: "השתמשו ביתרונות וחסרונות כשאתם שוקלים התנהגות במשבר או החלטה קשה.",
      decision_prompt: "באיזו החלטה אתם מתמודדים?",
      decision_placeholder: "למשל, האם לשלוח את ההודעה עכשיו?",
      start_btn: "התחל ניתוח",
      pros_label: "יתרונות לעשות זאת:",
      pros_placeholder: "מהם היתרונות לטווח הקצר?",
      next_cons_btn: "הבא: חסרונות",
      cons_label: "חסרונות לעשות זאת:",
      cons_placeholder: "מהם העלויות לטווח הארוך?",
      see_result_btn: "ראה תוצאה",
      pros_result_label: "יתרונות:",
      cons_result_label: "חסרונות:",
      conclusion: "לעתים קרובות, הקלה לטווח הקצר יש עלויות לטווח הארוך. איזו בחירה משרתת את ערכיכם?"
    },
    values_check: {
      prompt: "בדיקה מהירה: איזה ערך חשוב לכם ביותר עכשיו?",
      alignment_prompt: "האם הפעולות האחרונות שלכם מיושרות עם הערך הזה?",
      yes: "כן",
      somewhat: "במידה מסוימת",
      not_really: "לא ממש",
      result_yes: "✓ נהדר! המשיכו לנוע בכיוון הזה.",
      result_somewhat: "→ מודעות טובה. מה הוא צעד קטן אחד לקראת יישור גדול יותר?",
      result_no: "שמתם לב לפער? זה הצעד הראשון. בחרו פעולה קטנה אחת היום.",
      tip: "ערכים אינם מטרות להשיג - הם כיוונים לנוע לעברם.",
      values: {
        connection: "חיבור", growth: "צמיחה", authenticity: "אותנטיות",
        courage: "אומץ", compassion: "חמלה", creativity: "יצירתיות",
        health: "בריאות", peace: "שלום"
      }
    },
    expansion: {
      description: "הרחבה היא פנות מקום לרגשות קשים במקום להילחם בהם.",
      emotion_prompt: "איזה רגש נוכח עכשיו?",
      emotion_placeholder: "למשל, חרדה, עצבות, כעס",
      begin_btn: "התחל תרגול הרחבה",
      steps: [
        "תנו שם לרגש שאתם חשים.",
        "היכן אתם מרגישים אותו בגוף?",
        "במקום לדחות אותו, נשמו לאותו מקום.",
        "דמיינו שאתם יוצרים מרחב סביב התחושה - לא מכווצים אותה, פשוט מאפשרים אותה.",
        "שימו לב: אתם יכולים לחוש את זה וגם להמשיך קדימה."
      ],
      completion: "✓ תרגלתם פנות מקום ל{{emotion}}. הרחבה לא גורמת לרגשות להיעלם - היא עוזרת לכם לשאת אותם עם פחות מאבק."
    },
    leaves_on_stream: {
      description: "דמיינו נחל עדין עם עלים שצפים. הניחו מחשבות דביקות על עלים וצפו בהם שטים.",
      thought_prompt: "איזו מחשבה אוחזת בכם עכשיו?",
      thought_placeholder: "למשל, אני לא מספיק טוב",
      place_btn: "הנח על עלה וצפה בו שט",
      floating: "שט לו...",
      tip: "אתם לא מנסים להיפטר ממחשבות - רק לשים לב להן מבלי לאחוז בהן."
    },
    half_smile: {
      description: "חצי חיוך הוא הבעת פנים עדינה שיכולה לשנות את המצב הרגשי שלכם. אפילו חיוך קטן מאותת בטחון למערכת העצבים שלכם.",
      feel_now_prompt: "איך אתם מרגישים עכשיו?",
      emotions: ["מתוח", "מתוסכל", "חרד", "עצוב", "נייטרלי"],
      try_prompt: "נסו זאת ל-30 שניות:",
      instructions: [
        "הרפו את הפנים, במיוחד הלסת.",
        "הרימו את פינות הפה בעדינות (10%).",
        "רכּכו את העיניים.",
        "נשמו לאט."
      ],
      practiced_btn: "תרגלתי 30 שניות",
      feel_after_prompt: "איך אתם מרגישים עכשיו?",
      result: "✓ לפני: {{before}} → אחרי: {{after}}\n\nאפילו שינוי עדין חשוב. חצי חיוך הוא כלי שאפשר להשתמש בו בכל מקום ובכל זמן."
    },
    willing_hands: {
      description: "ידיים מוכנות הוא תרגול קבלה מבוסס גוף. הוא מאותת פתיחות למציאות, גם כשזה קשה.",
      steps: [
        "הפכו את כפות ידיכם כלפי מעלה והניחו אותן על ברכיכם או לצד גופכם.",
        "הרפו את ידיכם לחלוטין - תנו למתח לנקז החוצה.",
        "רכּכו את פניכם, במיוחד הלסת והמצח.",
        "נשמו טבעית ואמרו (בשקט): 'אני מוכן.'",
        "החזיקו את זה 30 שניות, שימו לב לכל שינוי."
      ],
      completion: "✓ יפה! ידיים מוכנות הוא מחווה פיזית של קבלה. תרגלו אותו בכל פעם שאתם נלחמים במציאות."
    }
  },
  es: {
    common: { try_another: "Probar Otro" },
    reframe_pick: {
      situation: "Situación:",
      automatic_thought: "Pensamiento automático:",
      choose: "Elige la respuesta más equilibrada:",
      why_label: "Por qué funciona:"
    },
    evidence_balance: {
      thought_label: "Pensamiento:",
      for_label: "Evidencia A FAVOR:",
      against_label: "Evidencia EN CONTRA:",
      show_conclusion: "Mostrar conclusión equilibrada",
      conclusion_label: "Conclusión equilibrada:"
    },
    memory_match: {
      title: "Emparejamiento de Memoria",
      instructions: "Encuentra todos los pares coincidentes haciendo clic en las cartas.",
      moves: "Movimientos",
      complete_title: "¡Bien hecho!",
      complete_message: "Completaste el juego de memoria en {{moves}} movimientos."
    },
    focus_flow: {
      title: "Flujo de Enfoque",
      instructions: "Observa la secuencia con cuidado, luego repítela.",
      watch_carefully: "Observa con cuidado...",
      level: "Nivel",
      game_over: "¡Buen esfuerzo!",
      final_score: "Alcanzaste el nivel {{score}}.",
      colors: { teal: "Verde azulado", lavender: "Lavanda", coral: "Coral", sage: "Salvia" }
    },
    pattern_shift: {
      title: "Cambio de Patrón",
      complete_title: "¡Maestro de patrones!",
      complete_message: "Acertaste {{score}} de {{total}} patrones.",
      patterns: [
        { question: "¿Qué sigue en el patrón: Rojo, Azul, Verde, Rojo, Azul, ?" },
        { question: "¿Qué forma completa el patrón: Círculo, Cuadrado, ?, Círculo?" },
        { question: "¿Qué tamaño sigue: Grande, Mediano, ?, Grande?" },
        { question: "Continúa el patrón: 1, 2, 3, 1, ?" }
      ],
      option_colors: ["Rojo", "Azul", "Verde"],
      option_shapes: ["Círculo", "Cuadrado", "Triángulo"],
      option_sizes: ["Pequeño", "Mediano", "Grande"]
    },
    word_association: {
      title: "Asociación de Palabras",
      instructions: "Piensa rápidamente en una palabra relacionada con la mostrada. Completa 5 asociaciones.",
      prompt: "¿Qué palabra viene a la mente?",
      input_placeholder: "Escribe tu asociación...",
      submit: "Enviar",
      your_chain: "Tu cadena:",
      complete_title: "¡Pensamiento creativo!",
      complete_message: "Has creado una cadena única de asociaciones.",
      start_words: ["Calma", "Crecimiento", "Fuerza", "Alegría", "Paz", "Coraje", "Esperanza", "Balance"]
    },
    number_sequence: {
      title: "Secuencia Numérica",
      instructions: "Encuentra el patrón y predice el siguiente número.",
      answer_placeholder: "Tu respuesta",
      check: "Verificar",
      correct: "¡Correcto!",
      incorrect: "No exactamente. La respuesta es {{answer}}.",
      complete_title: "¡Secuencia resuelta!",
      complete_message: "Acertaste {{score}} de {{total}} secuencias.",
      sequences: [
        { rule: "Patrón: Sumar 2 cada vez" },
        { rule: "Patrón: Sumar números crecientes (1, 2, 3, 4, 5)" },
        { rule: "Patrón: Múltiplos de 5" },
        { rule: "Patrón: Sumar 1, luego 2, luego 3, luego 4" },
        { rule: "Patrón: Multiplicar por 2 cada vez" }
      ]
    },
    quick_win: { log_prompt: "Registra una pequeña victoria de hoy:", input_placeholder: "Escribe tu victoria...", log_button: "Registrar", preset_prompt: "O elige una victoria común:", success_message: "¡Victoria registrada! Sigue construyendo impulso." },
    opposite_action: { emotion_label: "Emoción:", urge_label: "Impulso:", opposite_label: "Acción Opuesta:", pick_step: "Elige un pequeño paso:", note_label: "Nota:" },
    urge_surfing: { completed: "Completado: {{count}}", guided: "Guiado", independent: "Independiente", finish_prompt: "Después de surfear, elige uno:", success: "✓ ¡Bien! Los impulsos suben y bajan. Montaste la ola." },
    value_compass: { pick_value: "Elige un valor que te importe ahora mismo:", your_value: "Tu Valor: {{value}}", pick_action: "Elige una pequeña acción alineada con este valor:", success: "✓ ¡Genial! Las pequeñas acciones basadas en valores construyen una vida significativa.", reset: "Elegir Valor Diferente" },
    tiny_experiment: { belief_label: "Creencia a probar:", pick_experiment: "Elige un experimento pequeño (máx. 2 min):", success: "✓ Los experimentos recopilan datos. Incluso los resultados 'negativos' te enseñan algo valioso." },
    worry_time: { current_worry: "Preocupación Actual:", park_it: "Apárcala:", tiny_step: "Haz este pequeño paso ahora:", success: "✓ ¡Genial! Aparcaste la preocupación y tomaste una acción en el momento presente." },
    dbt_stop: { trigger: "Desencadenante:", next_step: "Elige un sabio próximo paso:", chosen: "✓ Elegiste: {{step}}" },
    defusion_cards: { sticky_thought: "Pensamiento Pegajoso:", prompt: "Prueba una línea de defusión:", success: "¡Bien! Creaste espacio entre tú y el pensamiento. Nota: puedes observarlo sin ser controlado por él.", next_card: "Siguiente Carta" },
    calm_bingo: { prompt: "Marca 2 acciones que harás ahora:", success: "✓ ¡Mini ronda completa! Tómate un momento para hacer estas ahora." },
    tipp_skills: { prompt: "Cuando necesites cambiar tu química corporal rápidamente:", pick_action: "Elige uno para probar ahora mismo:", success: "✓ ¡Genial! Las habilidades TIPP cambian tu fisiología para reducir la intensidad emocional." },
    accepts: { prompt: "Cuando necesites distraerte de emociones abrumadoras, usa ACCEPTS:", try_now: "Prueba esto ahora:" },
    improve: { prompt: "MEJORA el momento cuando estás en crisis y necesitas cambiar tu estado:", quick_action: "Acción Rápida:" },
    self_soothe: { prompt: "Autocálmate con tus 5 sentidos para crear momentos de comodidad y seguridad.", back: "← Volver a los sentidos", success: "✓ Tómate un momento para experimentar esto plenamente. El autocalmado es un regalo que te das a ti mismo." },
    mountain_meditation: {
      step_of: "Paso {{current}} de {{total}}",
      steps: ["Cierra los ojos o suaviza tu mirada.", "Imagina una montaña—sólida, enraizada, inquebrantable.", "Siente tu cuerpo como la montaña: estable, arraigado.", "El clima pasa sobre la montaña: tormentas, sol, lluvia, viento.", "La montaña permanece. No lucha contra el clima—lo permite.", "Eres como la montaña. Los pensamientos y emociones son como el clima.", "Vienen y van. Tú permaneces."],
      completion: "Practicaste la Meditación de la Montaña. Usa esta metáfora cuando necesites recordar tu estabilidad."
    },
    check_the_facts: {
      description: "Comprobar los hechos te ayuda a determinar si tu emoción encaja con la situación. Si no, puedes trabajar para cambiarla.",
      emotion_prompt: "¿Qué emoción sientes?",
      emotions: ["Miedo", "Ira", "Tristeza", "Culpa", "Vergüenza"],
      check_btn: "Comprobar los Hechos",
      for_emotion: "Para {{emotion}}, pregúntate:",
      default_prompts: ["¿Cuáles son los hechos?", "¿Estoy añadiendo interpretaciones?", "¿Esta emoción encaja?"],
      tip: "Si los hechos no apoyan la intensidad de la emoción, usa la acción opuesta u otras habilidades para cambiarla.",
      emotion_prompts: {
        fear: ["¿Hay un peligro real e inmediato?", "¿Qué es lo peor que podría pasar?", "¿Cuáles son las evidencias?"],
        anger: ["¿Alguien violó mis derechos intencionalmente?", "¿Es real la amenaza a mis metas?", "¿Ayudará o perjudicará la ira?"],
        sadness: ["¿Realmente perdí algo importante?", "¿Es permanente o puedo recuperarme?", "¿Qué me ayudaría a afrontarlo?"],
        guilt: ["¿Realmente hice algo en contra de mis valores?", "¿Estaba dentro de mi control?", "¿Qué reparación se necesita?"],
        shame: ["¿Soy malo como persona, o solo esta acción?", "¿Otros lo verían de la misma manera?", "¿Puedo separar el comportamiento de la identidad?"]
      }
    },
    pros_and_cons: {
      description: "Usa los Pros y Contras cuando estés considerando un comportamiento de crisis o una decisión difícil.",
      decision_prompt: "¿Qué decisión estás enfrentando?",
      decision_placeholder: "ej., ¿Debería enviar ese mensaje ahora?",
      start_btn: "Iniciar Análisis",
      pros_label: "Pros de hacerlo:",
      pros_placeholder: "¿Cuáles son los beneficios a corto plazo?",
      next_cons_btn: "Siguiente: Contras",
      cons_label: "Contras de hacerlo:",
      cons_placeholder: "¿Cuáles son los costos a largo plazo?",
      see_result_btn: "Ver Resultado",
      pros_result_label: "Pros:",
      cons_result_label: "Contras:",
      conclusion: "A menudo, el alivio a corto plazo tiene costos a largo plazo. ¿Qué elección sirve a tus valores?"
    },
    values_check: {
      prompt: "Verificación rápida: ¿Qué valor importa más para ti ahora mismo?",
      alignment_prompt: "¿Tus acciones recientes están alineadas con este valor?",
      yes: "Sí", somewhat: "En parte", not_really: "No realmente",
      result_yes: "✓ ¡Genial! Sigue avanzando en esta dirección.",
      result_somewhat: "→ Buena conciencia. ¿Cuál es un pequeño paso hacia más alineación?",
      result_no: "¿Notaste la brecha? Ese es el primer paso. Elige una pequeña acción hoy.",
      tip: "Los valores no son metas a lograr—son direcciones hacia las que moverse.",
      values: { connection: "Conexión", growth: "Crecimiento", authenticity: "Autenticidad", courage: "Coraje", compassion: "Compasión", creativity: "Creatividad", health: "Salud", peace: "Paz" }
    },
    expansion: {
      description: "La expansión es hacer espacio para las emociones difíciles en lugar de luchar contra ellas.",
      emotion_prompt: "¿Qué emoción está presente ahora mismo?",
      emotion_placeholder: "ej., ansiedad, tristeza, ira",
      begin_btn: "Comenzar Práctica de Expansión",
      steps: ["Nombra la emoción que sientes.", "¿Dónde la sientes en tu cuerpo?", "En lugar de rechazarla, respira hacia ese lugar.", "Imagina crear espacio alrededor del sentimiento—no encogiéndolo, solo permitiéndolo.", "Nota: Puedes sentir esto Y aun así avanzar."],
      completion: "✓ Practicaste hacer espacio para {{emotion}}. La expansión no hace desaparecer los sentimientos—te ayuda a llevarlos con menos lucha."
    },
    leaves_on_stream: {
      description: "Imagina un arroyo suave con hojas flotando. Coloca pensamientos pegajosos en hojas y obsérvalos alejarse.",
      thought_prompt: "¿Qué pensamiento te está atrapando ahora mismo?",
      thought_placeholder: "ej., No soy suficientemente bueno",
      place_btn: "Colocar en una Hoja y Ver Flotar",
      floating: "Flotando...",
      tip: "No estás tratando de deshacerte de los pensamientos—solo notándolos sin aferrarte."
    },
    half_smile: {
      description: "La Media Sonrisa es una expresión facial suave que puede cambiar tu estado emocional. Incluso una pequeña sonrisa señala seguridad a tu sistema nervioso.",
      feel_now_prompt: "¿Cómo te sientes ahora mismo?",
      emotions: ["Tenso", "Frustrado", "Ansioso", "Triste", "Neutral"],
      try_prompt: "Prueba esto durante 30 segundos:",
      instructions: ["Relaja tu cara, especialmente la mandíbula.", "Levanta las comisuras de tu boca ligeramente (10%).", "Suaviza tus ojos.", "Respira lentamente."],
      practiced_btn: "Practiqué durante 30 Segundos",
      feel_after_prompt: "¿Cómo te sientes ahora?",
      result: "✓ Antes: {{before}} → Después: {{after}}\n\nIncluso un cambio sutil importa. La Media Sonrisa es una herramienta que puedes usar en cualquier lugar."
    },
    willing_hands: {
      description: "Las Manos Dispuestas es una práctica de aceptación basada en el cuerpo. Señala apertura a la realidad, incluso cuando es difícil.",
      steps: ["Voltea las palmas de tus manos hacia arriba y descánsalas en tu regazo o a los lados.", "Relaja completamente tus manos—deja que la tensión se drene.", "Suaviza tu cara, especialmente la mandíbula y la frente.", "Respira naturalmente y di (en silencio): 'Estoy dispuesto/a.'", "Mantén esto durante 30 segundos, notando cualquier cambio."],
      completion: "✓ ¡Bien! Las Manos Dispuestas es un gesto físico de aceptación. Practica cuando estés luchando contra la realidad."
    }
  },
  fr: {
    common: { try_another: "Essayer un autre" },
    reframe_pick: {
      situation: "Situation :",
      automatic_thought: "Pensée automatique :",
      choose: "Choisissez la réponse la plus équilibrée :",
      why_label: "Pourquoi ça marche :"
    },
    evidence_balance: {
      thought_label: "Pensée :",
      for_label: "Preuves POUR :",
      against_label: "Preuves CONTRE :",
      show_conclusion: "Afficher la conclusion équilibrée",
      conclusion_label: "Conclusion équilibrée :"
    },
    memory_match: {
      title: "Correspondance de Mémoire",
      instructions: "Trouvez toutes les paires correspondantes en cliquant sur les cartes.",
      moves: "Mouvements",
      complete_title: "Bien joué !",
      complete_message: "Vous avez terminé le jeu de mémoire en {{moves}} mouvements."
    },
    focus_flow: {
      title: "Flux de Concentration",
      instructions: "Regardez attentivement la séquence, puis répétez-la.",
      watch_carefully: "Regardez attentivement...",
      level: "Niveau",
      game_over: "Bon effort !",
      final_score: "Vous avez atteint le niveau {{score}}.",
      colors: { teal: "Sarcelle", lavender: "Lavande", coral: "Corail", sage: "Sauge" }
    },
    pattern_shift: {
      title: "Changement de Motif",
      complete_title: "Maître des motifs !",
      complete_message: "Vous avez obtenu {{score}} motifs corrects sur {{total}}.",
      patterns: [
        { question: "Que vient ensuite dans le motif : Rouge, Bleu, Vert, Rouge, Bleu, ?" },
        { question: "Quelle forme complète le motif : Cercle, Carré, ?, Cercle ?" },
        { question: "Quelle taille vient ensuite : Grand, Moyen, ?, Grand ?" },
        { question: "Continuez le motif : 1, 2, 3, 1, ?" }
      ],
      option_colors: ["Rouge", "Bleu", "Vert"],
      option_shapes: ["Cercle", "Carré", "Triangle"],
      option_sizes: ["Petit", "Moyen", "Grand"]
    },
    word_association: {
      title: "Association de Mots",
      instructions: "Pensez rapidement à un mot lié à celui montré. Complétez 5 associations.",
      prompt: "Quel mot vous vient à l'esprit ?",
      input_placeholder: "Tapez votre association...",
      submit: "Soumettre",
      your_chain: "Votre chaîne :",
      complete_title: "Pensée créative !",
      complete_message: "Vous avez créé une chaîne unique d'associations.",
      start_words: ["Calme", "Croissance", "Force", "Joie", "Paix", "Courage", "Espoir", "Équilibre"]
    },
    number_sequence: {
      title: "Séquence de Nombres",
      instructions: "Trouvez le motif et prédisez le nombre suivant.",
      answer_placeholder: "Votre réponse",
      check: "Vérifier",
      correct: "Correct !",
      incorrect: "Pas tout à fait. La réponse est {{answer}}.",
      complete_title: "Séquence résolue !",
      complete_message: "Vous avez obtenu {{score}} séquences correctes sur {{total}}.",
      sequences: [
        { rule: "Motif : Ajouter 2 à chaque fois" },
        { rule: "Motif : Ajouter des nombres croissants (1, 2, 3, 4, 5)" },
        { rule: "Motif : Multiples de 5" },
        { rule: "Motif : Ajouter 1, puis 2, puis 3, puis 4" },
        { rule: "Motif : Multiplier par 2 à chaque fois" }
      ]
    },
    quick_win: { log_prompt: "Notez une petite victoire d'aujourd'hui :", input_placeholder: "Tapez votre victoire...", log_button: "Noter", preset_prompt: "Ou choisissez une victoire courante :", success_message: "Victoire notée ! Continuez à construire l'élan." },
    opposite_action: { emotion_label: "Émotion :", urge_label: "Impulsion :", opposite_label: "Action Opposée :", pick_step: "Choisissez un petit pas :", note_label: "Note :" },
    urge_surfing: { completed: "Terminé : {{count}}", guided: "Guidé", independent: "Indépendant", finish_prompt: "Après avoir surfé, choisissez-en un :", success: "✓ Bien ! Les impulsions montent et descendent. Vous avez chevauché la vague." },
    value_compass: { pick_value: "Choisissez une valeur qui vous importe maintenant :", your_value: "Votre Valeur : {{value}}", pick_action: "Choisissez une petite action alignée avec cette valeur :", success: "✓ Super ! Les petites actions basées sur les valeurs construisent une vie significative.", reset: "Choisir une Valeur Différente" },
    tiny_experiment: { belief_label: "Croyance à tester :", pick_experiment: "Choisissez une petite expérience (max. 2 min) :", success: "✓ Les expériences collectent des données. Même les résultats 'négatifs' vous apprennent quelque chose de précieux." },
    worry_time: { current_worry: "Inquiétude Actuelle :", park_it: "Garez-la :", tiny_step: "Faites ce petit pas maintenant :", success: "✓ Super ! Vous avez garé l'inquiétude et pris une action dans le moment présent." },
    dbt_stop: { trigger: "Déclencheur :", next_step: "Choisissez une sage prochaine étape :", chosen: "✓ Vous avez choisi : {{step}}" },
    defusion_cards: { sticky_thought: "Pensée Collante :", prompt: "Essayez une ligne de défusion :", success: "Bien ! Vous avez créé de l'espace entre vous et la pensée. Notez : vous pouvez l'observer sans en être contrôlé.", next_card: "Carte Suivante" },
    calm_bingo: { prompt: "Cochez 2 actions que vous ferez maintenant :", success: "✓ Mini tour terminé ! Prenez un moment pour faire ces choses maintenant." },
    tipp_skills: { prompt: "Quand vous avez besoin de changer votre chimie corporelle rapidement :", pick_action: "Choisissez-en un à essayer maintenant :", success: "✓ Super ! Les compétences TIPP changent votre physiologie pour réduire l'intensité émotionnelle." },
    accepts: { prompt: "Quand vous avez besoin de vous distraire des émotions accablantes, utilisez ACCEPTS :", try_now: "Essayez ceci maintenant :" },
    improve: { prompt: "AMÉLIOREZ le moment quand vous êtes en crise et avez besoin de changer d'état :", quick_action: "Action Rapide :" },
    self_soothe: { prompt: "Apaisez-vous avec vos 5 sens pour créer des moments de confort et de sécurité.", back: "← Retour aux sens", success: "✓ Prenez un moment pour vivre cela pleinement. L'auto-apaisement est un cadeau que vous vous offrez." },
    mountain_meditation: {
      step_of: "Étape {{current}} sur {{total}}",
      steps: ["Fermez les yeux ou adoucissez votre regard.", "Imaginez une montagne—solide, ancrée, inébranlable.", "Ressentez votre corps comme la montagne : stable, enraciné.", "La météo passe sur la montagne : tempêtes, soleil, pluie, vent.", "La montagne reste. Elle ne combat pas la météo—elle la permet.", "Vous êtes comme la montagne. Les pensées et les émotions sont comme la météo.", "Elles viennent et partent. Vous restez."],
      completion: "Vous avez pratiqué la Méditation de la Montagne. Utilisez cette métaphore quand vous avez besoin de vous rappeler votre stabilité."
    },
    check_the_facts: {
      description: "Vérifier les faits vous aide à déterminer si votre émotion correspond à la situation. Si non, vous pouvez travailler à la changer.",
      emotion_prompt: "Quelle émotion ressentez-vous ?",
      emotions: ["Peur", "Colère", "Tristesse", "Culpabilité", "Honte"],
      check_btn: "Vérifier les Faits",
      for_emotion: "Pour {{emotion}}, demandez-vous :",
      default_prompts: ["Quels sont les faits ?", "Est-ce que j'ajoute des interprétations ?", "Cette émotion correspond-elle ?"],
      tip: "Si les faits ne soutiennent pas l'intensité de l'émotion, utilisez l'action opposée ou d'autres compétences pour la changer.",
      emotion_prompts: {
        fear: ["Y a-t-il un danger réel et immédiat ?", "Quel est le pire qui pourrait arriver ?", "Quelles sont les preuves ?"],
        anger: ["Quelqu'un a-t-il violé mes droits intentionnellement ?", "Cette menace envers mes objectifs est-elle réelle ?", "La colère va-t-elle aider ou nuire ?"],
        sadness: ["Ai-je vraiment perdu quelque chose d'important ?", "Est-ce permanent ou puis-je me rétablir ?", "Qu'est-ce qui m'aiderait à faire face ?"],
        guilt: ["Ai-je vraiment fait quelque chose contre mes valeurs ?", "Était-ce dans mon contrôle ?", "Quelle réparation est nécessaire ?"],
        shame: ["Suis-je entièrement mauvais, ou juste cette action ?", "Les autres le verraient-ils de la même façon ?", "Puis-je séparer le comportement de l'identité ?"]
      }
    },
    pros_and_cons: {
      description: "Utilisez les Pour et Contre quand vous envisagez un comportement de crise ou une décision difficile.",
      decision_prompt: "Quelle décision prenez-vous ?",
      decision_placeholder: "ex., Devrais-je envoyer ce message maintenant ?",
      start_btn: "Démarrer l'Analyse",
      pros_label: "Avantages de le faire :",
      pros_placeholder: "Quels sont les avantages à court terme ?",
      next_cons_btn: "Suivant : Inconvénients",
      cons_label: "Inconvénients de le faire :",
      cons_placeholder: "Quels sont les coûts à long terme ?",
      see_result_btn: "Voir le Résultat",
      pros_result_label: "Avantages :",
      cons_result_label: "Inconvénients :",
      conclusion: "Souvent, le soulagement à court terme a des coûts à long terme. Quel choix sert vos valeurs ?"
    },
    values_check: {
      prompt: "Vérification rapide : Quelle valeur vous importe le plus en ce moment ?",
      alignment_prompt: "Vos actions récentes sont-elles alignées avec cette valeur ?",
      yes: "Oui", somewhat: "En partie", not_really: "Pas vraiment",
      result_yes: "✓ Super ! Continuez dans cette direction.",
      result_somewhat: "→ Bonne conscience. Quel est un petit pas vers plus d'alignement ?",
      result_no: "Vous avez remarqué l'écart ? C'est le premier pas. Choisissez une petite action aujourd'hui.",
      tip: "Les valeurs ne sont pas des objectifs à atteindre—ce sont des directions vers lesquelles se déplacer.",
      values: { connection: "Connexion", growth: "Croissance", authenticity: "Authenticité", courage: "Courage", compassion: "Compassion", creativity: "Créativité", health: "Santé", peace: "Paix" }
    },
    expansion: {
      description: "L'expansion consiste à faire de la place pour les émotions difficiles plutôt que de les combattre.",
      emotion_prompt: "Quelle émotion est présente en ce moment ?",
      emotion_placeholder: "ex., anxiété, tristesse, colère",
      begin_btn: "Commencer la Pratique d'Expansion",
      steps: ["Nommez l'émotion que vous ressentez.", "Où la ressentez-vous dans votre corps ?", "Au lieu de la repousser, respirez vers cet endroit.", "Imaginez créer de l'espace autour du sentiment—sans le rétrécir, en le permettant simplement.", "Remarquez : Vous pouvez ressentir cela ET continuer d'avancer."],
      completion: "✓ Vous avez pratiqué la création d'espace pour {{emotion}}. L'expansion ne fait pas disparaître les sentiments—elle vous aide à les porter avec moins de lutte."
    },
    leaves_on_stream: {
      description: "Imaginez un doux ruisseau avec des feuilles qui flottent. Placez des pensées collantes sur des feuilles et regardez-les dériver.",
      thought_prompt: "Quelle pensée vous accroche en ce moment ?",
      thought_placeholder: "ex., Je ne suis pas assez bien",
      place_btn: "Placer sur une Feuille et Regarder Flotter",
      floating: "En train de flotter...",
      tip: "Vous n'essayez pas de vous débarrasser des pensées—juste de les remarquer sans vous y accrocher."
    },
    half_smile: {
      description: "Le Demi-Sourire est une expression faciale douce qui peut changer votre état émotionnel. Même un petit sourire signale la sécurité à votre système nerveux.",
      feel_now_prompt: "Comment vous sentez-vous en ce moment ?",
      emotions: ["Tendu", "Frustré", "Anxieux", "Triste", "Neutre"],
      try_prompt: "Essayez ceci pendant 30 secondes :",
      instructions: ["Détendez votre visage, surtout la mâchoire.", "Relevez légèrement les coins de la bouche (10%).", "Adoucissez votre regard.", "Respirez lentement."],
      practiced_btn: "J'ai Pratiqué pendant 30 Secondes",
      feel_after_prompt: "Comment vous sentez-vous maintenant ?",
      result: "✓ Avant : {{before}} → Après : {{after}}\n\nMême un changement subtil compte. Le Demi-Sourire est un outil que vous pouvez utiliser partout."
    },
    willing_hands: {
      description: "Les Mains Ouvertes est une pratique d'acceptation basée sur le corps. Elle signale l'ouverture à la réalité, même quand c'est difficile.",
      steps: ["Tournez vos paumes vers le haut et posez-les sur vos genoux ou à vos côtés.", "Relâchez complètement vos mains—laissez la tension s'écouler.", "Adoucissez votre visage, surtout la mâchoire et le front.", "Respirez naturellement et dites (en silence) : 'Je suis prêt(e).'", "Maintenez cela pendant 30 secondes, en remarquant tout changement."],
      completion: "✓ Bien ! Les Mains Ouvertes est un geste physique d'acceptation. Pratiquez-le quand vous luttez contre la réalité."
    }
  },
  de: {
    common: { try_another: "Anderes versuchen" },
    reframe_pick: {
      situation: "Situation:",
      automatic_thought: "Automatischer Gedanke:",
      choose: "Wählen Sie die ausgewogenste Antwort:",
      why_label: "Warum das funktioniert:"
    },
    evidence_balance: {
      thought_label: "Gedanke:",
      for_label: "Beweise DAFÜR:",
      against_label: "Beweise DAGEGEN:",
      show_conclusion: "Ausgewogene Schlussfolgerung anzeigen",
      conclusion_label: "Ausgewogene Schlussfolgerung:"
    },
    memory_match: {
      title: "Gedächtnis-Match",
      instructions: "Finden Sie alle passenden Paare, indem Sie auf Karten klicken.",
      moves: "Züge",
      complete_title: "Gut gemacht!",
      complete_message: "Sie haben das Gedächtnisspiel in {{moves}} Zügen abgeschlossen."
    },
    focus_flow: {
      title: "Fokus-Fluss",
      instructions: "Beobachten Sie die Sequenz sorgfältig und wiederholen Sie sie dann.",
      watch_carefully: "Beobachten Sie sorgfältig...",
      level: "Stufe",
      game_over: "Gute Leistung!",
      final_score: "Sie haben Stufe {{score}} erreicht.",
      colors: { teal: "Türkis", lavender: "Lavendel", coral: "Koralle", sage: "Salbei" }
    },
    pattern_shift: {
      title: "Muster-Wechsel",
      complete_title: "Muster-Meister!",
      complete_message: "Sie haben {{score}} von {{total}} Mustern richtig erkannt.",
      patterns: [
        { question: "Was kommt als nächstes im Muster: Rot, Blau, Grün, Rot, Blau, ?" },
        { question: "Welche Form vervollständigt das Muster: Kreis, Quadrat, ?, Kreis?" },
        { question: "Welche Größe kommt als nächstes: Groß, Mittel, ?, Groß?" },
        { question: "Setzen Sie das Muster fort: 1, 2, 3, 1, ?" }
      ],
      option_colors: ["Rot", "Blau", "Grün"],
      option_shapes: ["Kreis", "Quadrat", "Dreieck"],
      option_sizes: ["Klein", "Mittel", "Groß"]
    },
    word_association: {
      title: "Wort-Assoziation",
      instructions: "Denken Sie schnell an ein Wort, das mit dem gezeigten verwandt ist. Vervollständigen Sie 5 Assoziationen.",
      prompt: "Welches Wort kommt Ihnen in den Sinn?",
      input_placeholder: "Geben Sie Ihre Assoziation ein...",
      submit: "Senden",
      your_chain: "Ihre Kette:",
      complete_title: "Kreatives Denken!",
      complete_message: "Sie haben eine einzigartige Kette von Assoziationen erstellt.",
      start_words: ["Ruhe", "Wachstum", "Stärke", "Freude", "Frieden", "Mut", "Hoffnung", "Balance"]
    },
    number_sequence: {
      title: "Zahlenfolge",
      instructions: "Finden Sie das Muster und sagen Sie die nächste Zahl voraus.",
      answer_placeholder: "Ihre Antwort",
      check: "Prüfen",
      correct: "Richtig!",
      incorrect: "Nicht ganz. Die Antwort ist {{answer}}.",
      complete_title: "Sequenz gelöst!",
      complete_message: "Sie haben {{score}} von {{total}} Sequenzen richtig.",
      sequences: [
        { rule: "Muster: Jedes Mal 2 addieren" },
        { rule: "Muster: Steigende Zahlen addieren (1, 2, 3, 4, 5)" },
        { rule: "Muster: Vielfache von 5" },
        { rule: "Muster: 1 addieren, dann 2, dann 3, dann 4" },
        { rule: "Muster: Jedes Mal mit 2 multiplizieren" }
      ]
    },
    quick_win: { log_prompt: "Notieren Sie einen kleinen Erfolg von heute:", input_placeholder: "Geben Sie Ihren Erfolg ein...", log_button: "Notieren", preset_prompt: "Oder wählen Sie einen häufigen Erfolg:", success_message: "Erfolg notiert! Bauen Sie weiter Schwung auf." },
    opposite_action: { emotion_label: "Emotion:", urge_label: "Drang:", opposite_label: "Gegenteilige Aktion:", pick_step: "Wählen Sie einen kleinen Schritt:", note_label: "Hinweis:" },
    urge_surfing: { completed: "Abgeschlossen: {{count}}", guided: "Geführt", independent: "Unabhängig", finish_prompt: "Nach dem Surfen, wählen Sie eines:", success: "✓ Gut! Dränge steigen und fallen. Sie haben die Welle geritten." },
    value_compass: { pick_value: "Wählen Sie einen Wert, der Ihnen jetzt wichtig ist:", your_value: "Ihr Wert: {{value}}", pick_action: "Wählen Sie eine kleine Aktion, die mit diesem Wert übereinstimmt:", success: "✓ Super! Kleine wertbasierte Aktionen bauen ein bedeutungsvolles Leben auf.", reset: "Anderen Wert Wählen" },
    tiny_experiment: { belief_label: "Zu testende Überzeugung:", pick_experiment: "Wählen Sie ein kleines Experiment (max. 2 Min.):", success: "✓ Experimente sammeln Daten. Auch 'negative' Ergebnisse lehren Sie etwas Wertvolles." },
    worry_time: { current_worry: "Aktuelle Sorge:", park_it: "Parken Sie sie:", tiny_step: "Machen Sie diesen kleinen Schritt jetzt:", success: "✓ Super! Sie haben die Sorge geparkt und eine Handlung im gegenwärtigen Moment ergriffen." },
    dbt_stop: { trigger: "Auslöser:", next_step: "Wählen Sie einen weisen nächsten Schritt:", chosen: "✓ Sie wählten: {{step}}" },
    defusion_cards: { sticky_thought: "Klebriger Gedanke:", prompt: "Versuchen Sie eine Defusions-Zeile:", success: "Gut! Sie haben Raum zwischen sich und dem Gedanken geschaffen. Beachten Sie: Sie können ihn beobachten, ohne von ihm kontrolliert zu werden.", next_card: "Nächste Karte" },
    calm_bingo: { prompt: "Markieren Sie 2 Aktionen, die Sie jetzt tun werden:", success: "✓ Mini-Runde abgeschlossen! Nehmen Sie sich einen Moment, um diese jetzt zu tun." },
    tipp_skills: { prompt: "Wenn Sie Ihre Körperchemie schnell ändern müssen:", pick_action: "Wählen Sie eines, das Sie jetzt ausprobieren möchten:", success: "✓ Super! TIPP-Fähigkeiten ändern Ihre Physiologie, um emotionale Intensität zu reduzieren." },
    accepts: { prompt: "Wenn Sie sich von überwältigenden Emotionen ablenken müssen, verwenden Sie ACCEPTS:", try_now: "Versuchen Sie dies jetzt:" },
    improve: { prompt: "VERBESSERN Sie den Moment, wenn Sie in einer Krise sind und Ihren Zustand ändern müssen:", quick_action: "Schnelle Aktion:" },
    self_soothe: { prompt: "Beruhigen Sie sich mit Ihren 5 Sinnen, um Momente des Komforts und der Sicherheit zu schaffen.", back: "← Zurück zu den Sinnen", success: "✓ Nehmen Sie sich einen Moment, um dies vollständig zu erleben. Selbstberuhigung ist ein Geschenk, das Sie sich selbst machen." },
    mountain_meditation: {
      step_of: "Schritt {{current}} von {{total}}",
      steps: ["Schließen Sie die Augen oder entspannen Sie Ihren Blick.", "Stellen Sie sich einen Berg vor—fest, geerdet, unerschütterlich.", "Spüren Sie Ihren Körper als den Berg: stabil, verwurzelt.", "Das Wetter zieht über den Berg: Stürme, Sonne, Regen, Wind.", "Der Berg bleibt. Er kämpft nicht gegen das Wetter—er lässt es zu.", "Sie sind wie der Berg. Gedanken und Emotionen sind wie das Wetter.", "Sie kommen und gehen. Sie bleiben."],
      completion: "Sie haben die Berg-Meditation praktiziert. Nutzen Sie diese Metapher, wann immer Sie sich an Ihre Stabilität erinnern möchten."
    },
    check_the_facts: {
      description: "Fakten prüfen hilft Ihnen festzustellen, ob Ihre Emotion zur Situation passt. Wenn nicht, können Sie daran arbeiten, sie zu ändern.",
      emotion_prompt: "Welche Emotion fühlen Sie?",
      emotions: ["Angst", "Ärger", "Traurigkeit", "Schuld", "Scham"],
      check_btn: "Fakten Prüfen",
      for_emotion: "Für {{emotion}}, fragen Sie sich:",
      default_prompts: ["Was sind die Fakten?", "Füge ich Interpretationen hinzu?", "Passt diese Emotion?"],
      tip: "Wenn die Fakten die Intensität der Emotion nicht unterstützen, nutzen Sie entgegengesetzte Aktion oder andere Fähigkeiten.",
      emotion_prompts: {
        fear: ["Gibt es eine echte, unmittelbare Gefahr?", "Was ist das Schlimmste, was passieren könnte?", "Was sind die Beweise?"],
        anger: ["Hat jemand meine Rechte absichtlich verletzt?", "Ist diese Bedrohung meiner Ziele real?", "Wird Ärger helfen oder schaden?"],
        sadness: ["Habe ich wirklich etwas Wichtiges verloren?", "Ist es dauerhaft oder kann ich mich erholen?", "Was würde mir helfen, damit umzugehen?"],
        guilt: ["Habe ich wirklich etwas gegen meine Werte getan?", "War es in meiner Kontrolle?", "Welche Wiedergutmachung ist nötig?"],
        shame: ["Bin ich als Person schlecht, oder nur diese Handlung?", "Würden andere es genauso sehen?", "Kann ich Verhalten von Identität trennen?"]
      }
    },
    pros_and_cons: {
      description: "Nutzen Sie Pro und Contra, wenn Sie ein Krisenverhalten oder eine schwierige Entscheidung abwägen.",
      decision_prompt: "Welcher Entscheidung stehen Sie gegenüber?",
      decision_placeholder: "z.B., Sollte ich diese Nachricht jetzt senden?",
      start_btn: "Analyse Starten",
      pros_label: "Pro es zu tun:",
      pros_placeholder: "Was sind die kurzfristigen Vorteile?",
      next_cons_btn: "Weiter: Contra",
      cons_label: "Contra es zu tun:",
      cons_placeholder: "Was sind die langfristigen Kosten?",
      see_result_btn: "Ergebnis Anzeigen",
      pros_result_label: "Pro:",
      cons_result_label: "Contra:",
      conclusion: "Oft hat kurzfristige Erleichterung langfristige Kosten. Welche Wahl dient Ihren Werten?"
    },
    values_check: {
      prompt: "Schnell-Check: Welcher Wert ist Ihnen jetzt am wichtigsten?",
      alignment_prompt: "Sind Ihre letzten Handlungen mit diesem Wert ausgerichtet?",
      yes: "Ja", somewhat: "Teilweise", not_really: "Nicht wirklich",
      result_yes: "✓ Super! Bewegen Sie sich weiter in diese Richtung.",
      result_somewhat: "→ Gutes Bewusstsein. Was ist ein kleiner Schritt zu mehr Ausrichtung?",
      result_no: "Haben Sie die Lücke bemerkt? Das ist der erste Schritt. Wählen Sie heute eine winzige Aktion.",
      tip: "Werte sind keine Ziele zu erreichen—sie sind Richtungen, auf die man sich zubewegt.",
      values: { connection: "Verbindung", growth: "Wachstum", authenticity: "Authentizität", courage: "Mut", compassion: "Mitgefühl", creativity: "Kreativität", health: "Gesundheit", peace: "Frieden" }
    },
    expansion: {
      description: "Expansion bedeutet, schwierigen Emotionen Raum zu geben, anstatt gegen sie zu kämpfen.",
      emotion_prompt: "Welche Emotion ist gerade präsent?",
      emotion_placeholder: "z.B., Angst, Traurigkeit, Ärger",
      begin_btn: "Expansions-Übung Beginnen",
      steps: ["Nennen Sie die Emotion, die Sie fühlen.", "Wo spüren Sie sie in Ihrem Körper?", "Atmen Sie anstatt sie wegzustoßen in diese Stelle.", "Stellen Sie sich vor, Raum um das Gefühl zu schaffen—nicht es zu verkleinern, nur es zuzulassen.", "Beachten Sie: Sie können dies fühlen UND trotzdem vorankommen."],
      completion: "✓ Sie haben geübt, {{emotion}} Raum zu geben. Expansion lässt Gefühle nicht verschwinden—sie hilft Ihnen, sie mit weniger Kampf zu tragen."
    },
    leaves_on_stream: {
      description: "Stellen Sie sich einen sanften Bach mit treibenden Blättern vor. Legen Sie klebrige Gedanken auf Blätter und beobachten Sie, wie sie davontreiben.",
      thought_prompt: "Welcher Gedanke hält Sie gerade fest?",
      thought_placeholder: "z.B., Ich bin nicht gut genug",
      place_btn: "Auf Blatt Legen & Treiben Sehen",
      floating: "Treibt davon...",
      tip: "Sie versuchen nicht, Gedanken loszuwerden—nur sie zu bemerken, ohne festzuhalten."
    },
    half_smile: {
      description: "Das Halbe Lächeln ist ein sanfter Gesichtsausdruck, der Ihren emotionalen Zustand verändern kann. Sogar ein kleines Lächeln signalisiert Sicherheit an Ihr Nervensystem.",
      feel_now_prompt: "Wie fühlen Sie sich gerade?",
      emotions: ["Angespannt", "Frustriert", "Ängstlich", "Traurig", "Neutral"],
      try_prompt: "Versuchen Sie das für 30 Sekunden:",
      instructions: ["Entspannen Sie Ihr Gesicht, besonders den Kiefer.", "Heben Sie die Mundwinkel leicht an (10%).", "Entspannen Sie Ihren Blick.", "Atmen Sie langsam."],
      practiced_btn: "Ich Habe 30 Sekunden Geübt",
      feel_after_prompt: "Wie fühlen Sie sich jetzt?",
      result: "✓ Vorher: {{before}} → Nachher: {{after}}\n\nSogar eine subtile Verschiebung zählt. Das Halbe Lächeln ist ein Werkzeug, das Sie überall einsetzen können."
    },
    willing_hands: {
      description: "Offene Hände ist eine körperbasierte Akzeptanzübung. Sie signalisiert Offenheit für die Realität, auch wenn es schwer ist.",
      steps: ["Drehen Sie Ihre Handflächen nach oben und legen Sie sie auf Ihren Schoß oder neben Ihren Körper.", "Entspannen Sie Ihre Hände vollständig—lassen Sie die Spannung abfließen.", "Weichen Sie Ihr Gesicht, besonders Kiefer und Stirn.", "Atmen Sie natürlich und sagen Sie (in Stille): 'Ich bin bereit.'", "Halten Sie das 30 Sekunden lang, und bemerken Sie jede Veränderung."],
      completion: "✓ Gut! Offene Hände ist eine körperliche Geste der Akzeptanz. Üben Sie es, wenn Sie gegen die Realität kämpfen."
    }
  },
  it: {
    common: { try_another: "Prova un altro" },
    reframe_pick: {
      situation: "Situazione:",
      automatic_thought: "Pensiero automatico:",
      choose: "Scegli la risposta più equilibrata:",
      why_label: "Perché funziona:"
    },
    evidence_balance: {
      thought_label: "Pensiero:",
      for_label: "Prove A FAVORE:",
      against_label: "Prove CONTRO:",
      show_conclusion: "Mostra conclusione equilibrata",
      conclusion_label: "Conclusione equilibrata:"
    },
    memory_match: {
      title: "Abbinamento di Memoria",
      instructions: "Trova tutte le coppie corrispondenti facendo clic sulle carte.",
      moves: "Mosse",
      complete_title: "Ben fatto!",
      complete_message: "Hai completato il gioco di memoria in {{moves}} mosse."
    },
    focus_flow: {
      title: "Flusso di Concentrazione",
      instructions: "Osserva attentamente la sequenza, poi ripetila.",
      watch_carefully: "Osserva attentamente...",
      level: "Livello",
      game_over: "Buon sforzo!",
      final_score: "Hai raggiunto il livello {{score}}.",
      colors: { teal: "Turchese", lavender: "Lavanda", coral: "Corallo", sage: "Salvia" }
    },
    pattern_shift: {
      title: "Cambio di Schema",
      complete_title: "Maestro di schemi!",
      complete_message: "Hai indovinato {{score}} schemi su {{total}}.",
      patterns: [
        { question: "Cosa viene dopo nel modello: Rosso, Blu, Verde, Rosso, Blu, ?" },
        { question: "Quale forma completa il modello: Cerchio, Quadrato, ?, Cerchio?" },
        { question: "Quale dimensione viene dopo: Grande, Medio, ?, Grande?" },
        { question: "Continua il modello: 1, 2, 3, 1, ?" }
      ],
      option_colors: ["Rosso", "Blu", "Verde"],
      option_shapes: ["Cerchio", "Quadrato", "Triangolo"],
      option_sizes: ["Piccolo", "Medio", "Grande"]
    },
    word_association: {
      title: "Associazione di Parole",
      instructions: "Pensa rapidamente a una parola correlata a quella mostrata. Completa 5 associazioni.",
      prompt: "Quale parola ti viene in mente?",
      input_placeholder: "Digita la tua associazione...",
      submit: "Invia",
      your_chain: "La tua catena:",
      complete_title: "Pensiero creativo!",
      complete_message: "Hai creato una catena unica di associazioni.",
      start_words: ["Calma", "Crescita", "Forza", "Gioia", "Pace", "Coraggio", "Speranza", "Equilibrio"]
    },
    number_sequence: {
      title: "Sequenza di Numeri",
      instructions: "Trova il modello e prevedi il numero successivo.",
      answer_placeholder: "La tua risposta",
      check: "Controlla",
      correct: "Corretto!",
      incorrect: "Non proprio. La risposta è {{answer}}.",
      complete_title: "Sequenza risolta!",
      complete_message: "Hai indovinato {{score}} sequenze su {{total}}.",
      sequences: [
        { rule: "Modello: Aggiungi 2 ogni volta" },
        { rule: "Modello: Aggiungi numeri crescenti (1, 2, 3, 4, 5)" },
        { rule: "Modello: Multipli di 5" },
        { rule: "Modello: Aggiungi 1, poi 2, poi 3, poi 4" },
        { rule: "Modello: Moltiplica per 2 ogni volta" }
      ]
    },
    quick_win: { log_prompt: "Registra una piccola vittoria di oggi:", input_placeholder: "Scrivi la tua vittoria...", log_button: "Registra", preset_prompt: "O scegli una vittoria comune:", success_message: "Vittoria registrata! Continua a costruire slancio." },
    opposite_action: { emotion_label: "Emozione:", urge_label: "Impulso:", opposite_label: "Azione Opposta:", pick_step: "Scegli un piccolo passo:", note_label: "Nota:" },
    urge_surfing: { completed: "Completato: {{count}}", guided: "Guidato", independent: "Indipendente", finish_prompt: "Dopo aver surfato, scegline uno:", success: "✓ Bene! Gli impulsi salgono e scendono. Hai cavalcato l'onda." },
    value_compass: { pick_value: "Scegli un valore che ti importa adesso:", your_value: "Il Tuo Valore: {{value}}", pick_action: "Scegli una piccola azione allineata con questo valore:", success: "✓ Ottimo! Le piccole azioni basate sui valori costruiscono una vita significativa.", reset: "Scegli Valore Diverso" },
    tiny_experiment: { belief_label: "Credenza da testare:", pick_experiment: "Scegli un piccolo esperimento (max. 2 min):", success: "✓ Gli esperimenti raccolgono dati. Anche i risultati 'negativi' ti insegnano qualcosa di prezioso." },
    worry_time: { current_worry: "Preoccupazione Attuale:", park_it: "Parcheggiala:", tiny_step: "Fai questo piccolo passo ora:", success: "✓ Ottimo! Hai parcheggiato la preoccupazione e preso un'azione nel momento presente." },
    dbt_stop: { trigger: "Trigger:", next_step: "Scegli un saggio prossimo passo:", chosen: "✓ Hai scelto: {{step}}" },
    defusion_cards: { sticky_thought: "Pensiero Appiccicoso:", prompt: "Prova una riga di defusione:", success: "Bene! Hai creato spazio tra te e il pensiero. Nota: puoi osservarlo senza essere controllato da esso.", next_card: "Prossima Carta" },
    calm_bingo: { prompt: "Segna 2 azioni che farai ora:", success: "✓ Mini turno completato! Prenditi un momento per farlo adesso." },
    tipp_skills: { prompt: "Quando devi cambiare la tua chimica corporea velocemente:", pick_action: "Scegline uno da provare subito:", success: "✓ Ottimo! Le abilità TIPP cambiano la tua fisiologia per ridurre l'intensità emotiva." },
    accepts: { prompt: "Quando devi distrarti da emozioni travolgenti, usa ACCEPTS:", try_now: "Prova questo ora:" },
    improve: { prompt: "MIGLIORA il momento quando sei in crisi e hai bisogno di cambiare il tuo stato:", quick_action: "Azione Rapida:" },
    self_soothe: { prompt: "Calmati con i tuoi 5 sensi per creare momenti di comfort e sicurezza.", back: "← Torna ai sensi", success: "✓ Prenditi un momento per vivere questo pienamente. L'auto-calmante è un regalo che fai a te stesso." },
    mountain_meditation: {
      step_of: "Passo {{current}} di {{total}}",
      steps: ["Chiudi gli occhi o ammorbidisci lo sguardo.", "Immagina una montagna—solida, radicata, indistruttibile.", "Senti il tuo corpo come la montagna: stabile, radicato.", "Il tempo passa sulla montagna: tempeste, sole, pioggia, vento.", "La montagna rimane. Non combatte il tempo—lo permette.", "Sei come la montagna. I pensieri e le emozioni sono come il tempo.", "Vengono e vanno. Tu rimani."],
      completion: "Hai praticato la Meditazione della Montagna. Usa questa metafora ogni volta che hai bisogno di ricordare la tua stabilità."
    },
    check_the_facts: {
      description: "Verificare i fatti ti aiuta a determinare se la tua emozione si adatta alla situazione. Se non lo fa, puoi lavorare per cambiarla.",
      emotion_prompt: "Quale emozione stai provando?",
      emotions: ["Paura", "Rabbia", "Tristezza", "Colpa", "Vergogna"],
      check_btn: "Verificare i Fatti",
      for_emotion: "Per {{emotion}}, chiediti:",
      default_prompts: ["Quali sono i fatti?", "Sto aggiungendo interpretazioni?", "Questa emozione si adatta?"],
      tip: "Se i fatti non supportano l'intensità dell'emozione, usa l'azione opposta o altre abilità per cambiarla.",
      emotion_prompts: {
        fear: ["C'è un pericolo reale e immediato?", "Qual è il peggio che potrebbe succedere?", "Quali sono le prove?"],
        anger: ["Qualcuno ha violato i miei diritti intenzionalmente?", "Questa minaccia ai miei obiettivi è reale?", "La rabbia aiuterà o farà del male?"],
        sadness: ["Ho davvero perso qualcosa di importante?", "È permanente o posso riprendermi?", "Cosa mi aiuterebbe ad affrontarlo?"],
        guilt: ["Ho davvero fatto qualcosa contro i miei valori?", "Era nella mia controllo?", "Quale riparazione è necessaria?"],
        shame: ["Sono cattivo come persona, o solo questa azione?", "Gli altri la vedrebbero allo stesso modo?", "Posso separare il comportamento dall'identità?"]
      }
    },
    pros_and_cons: {
      description: "Usa i Pro e Contro quando stai considerando un comportamento di crisi o una decisione difficile.",
      decision_prompt: "Quale decisione stai affrontando?",
      decision_placeholder: "es., Dovrei inviare quel messaggio ora?",
      start_btn: "Inizia Analisi",
      pros_label: "Pro del farlo:",
      pros_placeholder: "Quali sono i vantaggi a breve termine?",
      next_cons_btn: "Avanti: Contro",
      cons_label: "Contro del farlo:",
      cons_placeholder: "Quali sono i costi a lungo termine?",
      see_result_btn: "Vedi Risultato",
      pros_result_label: "Pro:",
      cons_result_label: "Contro:",
      conclusion: "Spesso, il sollievo a breve termine ha costi a lungo termine. Quale scelta serve i tuoi valori?"
    },
    values_check: {
      prompt: "Controllo rapido: Quale valore conta di più per te in questo momento?",
      alignment_prompt: "Le tue azioni recenti sono allineate con questo valore?",
      yes: "Sì", somewhat: "In parte", not_really: "Non proprio",
      result_yes: "✓ Ottimo! Continua a muoverti in questa direzione.",
      result_somewhat: "→ Buona consapevolezza. Qual è un piccolo passo verso più allineamento?",
      result_no: "Hai notato il divario? È il primo passo. Scegli una piccola azione oggi.",
      tip: "I valori non sono obiettivi da raggiungere—sono direzioni verso cui muoversi.",
      values: { connection: "Connessione", growth: "Crescita", authenticity: "Autenticità", courage: "Coraggio", compassion: "Compassione", creativity: "Creatività", health: "Salute", peace: "Pace" }
    },
    expansion: {
      description: "L'espansione significa fare spazio per le emozioni difficili invece di combatterle.",
      emotion_prompt: "Quale emozione è presente in questo momento?",
      emotion_placeholder: "es., ansia, tristezza, rabbia",
      begin_btn: "Inizia la Pratica di Espansione",
      steps: ["Nomina l'emozione che stai sentendo.", "Dove la senti nel tuo corpo?", "Invece di respingerla, respira verso quel punto.", "Immagina di creare spazio intorno alla sensazione—non restringerla, solo permetterla.", "Nota: Puoi sentire questo E andare comunque avanti."],
      completion: "✓ Hai praticato fare spazio per {{emotion}}. L'espansione non fa scomparire i sentimenti—ti aiuta a portarli con meno lotta."
    },
    leaves_on_stream: {
      description: "Immagina un ruscello gentile con foglie che galleggiano. Metti pensieri appiccicosi su foglie e guardali allontanarsi.",
      thought_prompt: "Quale pensiero ti sta agganciando in questo momento?",
      thought_placeholder: "es., Non sono abbastanza bravo",
      place_btn: "Metti su una Foglia e Guarda Galleggiare",
      floating: "Sta galleggiando via...",
      tip: "Non stai cercando di sbarazzarti dei pensieri—solo di notarli senza aggrapparti."
    },
    half_smile: {
      description: "Il Mezzo Sorriso è un'espressione facciale gentile che può cambiare il tuo stato emotivo. Anche un piccolo sorriso segnala sicurezza al tuo sistema nervoso.",
      feel_now_prompt: "Come ti senti in questo momento?",
      emotions: ["Teso", "Frustrato", "Ansioso", "Triste", "Neutro"],
      practiced_btn: "Ho Praticato per 30 Secondi",
      feel_after_prompt: "Come ti senti ora?",
      result: "✓ Prima: {{before}} → Dopo: {{after}}\n\nAnche un cambiamento sottile conta. Il Mezzo Sorriso è uno strumento che puoi usare ovunque."
    },
    willing_hands: {
      description: "Le Mani Aperte è una pratica di accettazione basata sul corpo. Segnala apertura alla realtà, anche quando è difficile.",
      steps: ["Gira i palmi delle mani verso l'alto e appoggiali sulle ginocchia o ai lati.", "Rilassa completamente le mani—lascia defluire la tensione.", "Ammorbidisci il viso, soprattutto mascella e fronte.", "Respira naturalmente e dì (in silenzio): 'Sono disposto/a.'", "Mantieni questo per 30 secondi, notando qualsiasi cambiamento."],
      completion: "✓ Bene! Le Mani Aperte è un gesto fisico di accettazione. Praticalo ogni volta che stai lottando contro la realtà."
    }
  },
  pt: {
    common: { try_another: "Tentar Outro" },
    reframe_pick: {
      situation: "Situação:",
      automatic_thought: "Pensamento automático:",
      choose: "Escolha a resposta mais equilibrada:",
      why_label: "Por que funciona:"
    },
    evidence_balance: {
      thought_label: "Pensamento:",
      for_label: "Evidências A FAVOR:",
      against_label: "Evidências CONTRA:",
      show_conclusion: "Mostrar conclusão equilibrada",
      conclusion_label: "Conclusão equilibrada:"
    },
    memory_match: {
      title: "Combinação de Memória",
      instructions: "Encontre todos os pares correspondentes clicando nas cartas.",
      moves: "Movimentos",
      complete_title: "Muito bem!",
      complete_message: "Você completou o jogo de memória em {{moves}} movimentos."
    },
    focus_flow: {
      title: "Fluxo de Foco",
      instructions: "Observe a sequência com cuidado, depois repita.",
      watch_carefully: "Observe com cuidado...",
      level: "Nível",
      game_over: "Bom esforço!",
      final_score: "Você alcançou o nível {{score}}.",
      colors: { teal: "Azul-petróleo", lavender: "Lavanda", coral: "Coral", sage: "Sálvia" }
    },
    pattern_shift: {
      title: "Mudança de Padrão",
      complete_title: "Mestre de padrões!",
      complete_message: "Você acertou {{score}} de {{total}} padrões.",
      patterns: [
        { question: "O que vem a seguir no padrão: Vermelho, Azul, Verde, Vermelho, Azul, ?" },
        { question: "Qual forma completa o padrão: Círculo, Quadrado, ?, Círculo?" },
        { question: "Qual tamanho vem a seguir: Grande, Médio, ?, Grande?" },
        { question: "Continue o padrão: 1, 2, 3, 1, ?" }
      ],
      option_colors: ["Vermelho", "Azul", "Verde"],
      option_shapes: ["Círculo", "Quadrado", "Triângulo"],
      option_sizes: ["Pequeno", "Médio", "Grande"]
    },
    word_association: {
      title: "Associação de Palavras",
      instructions: "Pense rapidamente em uma palavra relacionada à mostrada. Complete 5 associações.",
      prompt: "Qual palavra vem à mente?",
      input_placeholder: "Digite sua associação...",
      submit: "Enviar",
      your_chain: "Sua cadeia:",
      complete_title: "Pensamento criativo!",
      complete_message: "Você criou uma cadeia única de associações.",
      start_words: ["Calma", "Crescimento", "Força", "Alegria", "Paz", "Coragem", "Esperança", "Equilíbrio"]
    },
    number_sequence: {
      title: "Sequência Numérica",
      instructions: "Encontre o padrão e preveja o próximo número.",
      answer_placeholder: "Sua resposta",
      check: "Verificar",
      correct: "Correto!",
      incorrect: "Não exatamente. A resposta é {{answer}}.",
      complete_title: "Sequência resolvida!",
      complete_message: "Você acertou {{score}} de {{total}} sequências.",
      sequences: [
        { rule: "Padrão: Adicionar 2 cada vez" },
        { rule: "Padrão: Adicionar números crescentes (1, 2, 3, 4, 5)" },
        { rule: "Padrão: Múltiplos de 5" },
        { rule: "Padrão: Adicionar 1, depois 2, depois 3, depois 4" },
        { rule: "Padrão: Multiplicar por 2 cada vez" }
      ]
    },
    quick_win: { log_prompt: "Registre uma pequena vitória de hoje:", input_placeholder: "Digite sua vitória...", log_button: "Registrar", preset_prompt: "Ou escolha uma vitória comum:", success_message: "Vitória registrada! Continue construindo impulso." },
    opposite_action: { emotion_label: "Emoção:", urge_label: "Impulso:", opposite_label: "Ação Oposta:", pick_step: "Escolha um pequeno passo:", note_label: "Nota:" },
    urge_surfing: { completed: "Concluído: {{count}}", guided: "Guiado", independent: "Independente", finish_prompt: "Após surfar, escolha um:", success: "✓ Bom! Impulsos sobem e descem. Você surfou a onda." },
    value_compass: { pick_value: "Escolha um valor que importa para você agora:", your_value: "Seu Valor: {{value}}", pick_action: "Escolha uma pequena ação alinhada com este valor:", success: "✓ Ótimo! Pequenas ações baseadas em valores constroem uma vida significativa.", reset: "Escolher Valor Diferente" },
    tiny_experiment: { belief_label: "Crença a testar:", pick_experiment: "Escolha um pequeno experimento (máx. 2 min):", success: "✓ Experimentos coletam dados. Mesmo resultados 'negativos' ensinam algo valioso." },
    worry_time: { current_worry: "Preocupação Atual:", park_it: "Estacione-a:", tiny_step: "Faça este pequeno passo agora:", success: "✓ Ótimo! Você estacionou a preocupação e tomou uma ação no momento presente." },
    dbt_stop: { trigger: "Gatilho:", next_step: "Escolha um sábio próximo passo:", chosen: "✓ Você escolheu: {{step}}" },
    defusion_cards: { sticky_thought: "Pensamento Pegajoso:", prompt: "Tente uma linha de defusão:", success: "Muito bem! Você criou espaço entre você e o pensamento. Perceba: você pode observá-lo sem ser controlado por ele.", next_card: "Próxima Carta" },
    calm_bingo: { prompt: "Marque 2 ações que você fará agora:", success: "✓ Mini rodada completa! Reserve um momento para fazer isso agora." },
    tipp_skills: { prompt: "Quando você precisa mudar sua química corporal rapidamente:", pick_action: "Escolha um para tentar agora:", success: "✓ Ótimo! As habilidades TIPP mudam sua fisiologia para reduzir a intensidade emocional." },
    accepts: { prompt: "Quando você precisar se distrair de emoções avassaladoras, use ACCEPTS:", try_now: "Tente isso agora:" },
    improve: { prompt: "MELHORE o momento quando você está em crise e precisa mudar seu estado:", quick_action: "Ação Rápida:" },
    self_soothe: { prompt: "Acalme-se com seus 5 sentidos para criar momentos de conforto e segurança.", back: "← Voltar aos sentidos", success: "✓ Reserve um momento para vivenciar isso plenamente. A auto-calmante é um presente que você se dá." },
    mountain_meditation: {
      step_of: "Passo {{current}} de {{total}}",
      steps: ["Feche os olhos ou suavize o olhar.", "Imagine uma montanha—sólida, enraizada, inabalável.", "Sinta seu corpo como a montanha: estável, enraizado.", "O tempo passa sobre a montanha: tempestades, sol, chuva, vento.", "A montanha permanece. Ela não luta contra o tempo—ela o permite.", "Você é como a montanha. Pensamentos e emoções são como o tempo.", "Eles vêm e vão. Você permanece."],
      completion: "Você praticou a Meditação da Montanha. Use esta metáfora sempre que precisar lembrar sua estabilidade."
    },
    check_the_facts: {
      description: "Verificar os fatos ajuda você a determinar se sua emoção se encaixa na situação. Se não, você pode trabalhar para mudá-la.",
      emotion_prompt: "Qual emoção você está sentindo?",
      emotions: ["Medo", "Raiva", "Tristeza", "Culpa", "Vergonha"],
      check_btn: "Verificar os Fatos",
      for_emotion: "Para {{emotion}}, pergunte-se:",
      default_prompts: ["Quais são os fatos?", "Estou adicionando interpretações?", "Esta emoção se encaixa?"],
      tip: "Se os fatos não suportam a intensidade da emoção, use ação oposta ou outras habilidades para mudá-la.",
      emotion_prompts: {
        fear: ["Há um perigo real e imediato?", "Qual é o pior que poderia acontecer?", "Quais são as evidências?"],
        anger: ["Alguém violou meus direitos intencionalmente?", "Essa ameaça aos meus objetivos é real?", "A raiva vai ajudar ou prejudicar?"],
        sadness: ["Eu realmente perdi algo importante?", "É permanente ou posso me recuperar?", "O que me ajudaria a lidar?"],
        guilt: ["Eu realmente fiz algo contra meus valores?", "Estava sob meu controle?", "Qual reparação é necessária?"],
        shame: ["Sou mau como pessoa, ou apenas esta ação?", "Outros veriam da mesma forma?", "Posso separar o comportamento da identidade?"]
      }
    },
    pros_and_cons: {
      description: "Use Prós e Contras quando estiver considerando um comportamento de crise ou decisão difícil.",
      decision_prompt: "Qual decisão você está enfrentando?",
      decision_placeholder: "ex., Devo enviar essa mensagem agora?",
      start_btn: "Iniciar Análise",
      pros_label: "Prós de fazê-lo:",
      pros_placeholder: "Quais são os benefícios de curto prazo?",
      next_cons_btn: "Próximo: Contras",
      cons_label: "Contras de fazê-lo:",
      cons_placeholder: "Quais são os custos de longo prazo?",
      see_result_btn: "Ver Resultado",
      pros_result_label: "Prós:",
      cons_result_label: "Contras:",
      conclusion: "Muitas vezes, o alívio de curto prazo tem custos de longo prazo. Qual escolha serve aos seus valores?"
    },
    values_check: {
      prompt: "Verificação rápida: Qual valor mais importa para você agora?",
      alignment_prompt: "Suas ações recentes estão alinhadas com esse valor?",
      yes: "Sim", somewhat: "Em parte", not_really: "Não realmente",
      result_yes: "✓ Ótimo! Continue se movendo nessa direção.",
      result_somewhat: "→ Boa consciência. Qual é um pequeno passo em direção a mais alinhamento?",
      result_no: "Notou a lacuna? Esse é o primeiro passo. Escolha uma pequena ação hoje.",
      tip: "Valores não são objetivos a alcançar—são direções em que se mover.",
      values: { connection: "Conexão", growth: "Crescimento", authenticity: "Autenticidade", courage: "Coragem", compassion: "Compaixão", creativity: "Criatividade", health: "Saúde", peace: "Paz" }
    },
    expansion: {
      description: "Expansão é dar espaço para emoções difíceis em vez de lutar contra elas.",
      emotion_prompt: "Qual emoção está presente agora?",
      emotion_placeholder: "ex., ansiedade, tristeza, raiva",
      begin_btn: "Começar Prática de Expansão",
      steps: ["Nomeie a emoção que você está sentindo.", "Onde você a sente no corpo?", "Em vez de afastá-la, respire para esse lugar.", "Imagine criar espaço ao redor do sentimento—não encolhendo, apenas permitindo.", "Observe: Você pode sentir isso E ainda avançar."],
      completion: "✓ Você praticou dar espaço para {{emotion}}. A expansão não faz os sentimentos desaparecerem—ajuda você a carregá-los com menos luta."
    },
    leaves_on_stream: {
      description: "Imagine um riacho gentil com folhas flutuando. Coloque pensamentos pegajosos em folhas e observe-os derivar.",
      thought_prompt: "Qual pensamento está te prendendo agora?",
      thought_placeholder: "ex., Não sou bom o suficiente",
      place_btn: "Colocar numa Folha e Ver Flutuar",
      floating: "Flutuando...",
      tip: "Você não está tentando se livrar dos pensamentos—apenas notando-os sem se agarrar."
    },
    half_smile: {
      description: "O Meio Sorriso é uma expressão facial suave que pode mudar seu estado emocional. Mesmo um sorriso pequeno sinaliza segurança ao seu sistema nervoso.",
      feel_now_prompt: "Como você está se sentindo agora?",
      emotions: ["Tenso", "Frustrado", "Ansioso", "Triste", "Neutro"],
      try_prompt: "Experimente isso por 30 segundos:",
      instructions: ["Relaxe o rosto, especialmente a mandíbula.", "Levante levemente os cantos da boca (10%).", "Suavize o olhar.", "Respire devagar."],
      practiced_btn: "Pratiquei por 30 Segundos",
      feel_after_prompt: "Como você está se sentindo agora?",
      result: "✓ Antes: {{before}} → Depois: {{after}}\n\nMesmo uma mudança sutil importa. O Meio Sorriso é uma ferramenta que você pode usar em qualquer lugar."
    },
    willing_hands: {
      description: "Mãos Abertas é uma prática de aceitação baseada no corpo. Sinaliza abertura à realidade, mesmo quando é difícil.",
      steps: ["Vire as palmas das mãos para cima e descanse-as no colo ou ao lado do corpo.", "Relaxe completamente as mãos—deixe a tensão escorrer.", "Suavize o rosto, especialmente a mandíbula e a testa.", "Respire naturalmente e diga (em silêncio): 'Estou disposto/a.'", "Mantenha isso por 30 segundos, notando qualquer mudança."],
      completion: "✓ Ótimo! Mãos Abertas é um gesto físico de aceitação. Pratique sempre que estiver lutando contra a realidade."
    }
  }
};