import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SCENARIOS = [
  {
    id: 'panic_attack',
    title: 'Acute Panic Attack',
    difficulty: 'Medium',
    tags: ['panic', 'grounding', 'psychoeducation'],
    description: 'A patient is in the middle of an acute panic attack, convinced they are dying. They are hyperventilating and catastrophizing.',
    patientProfile: `Name: Alex, 28 years old. First panic attack 3 months ago. Has since developed health anxiety and avoids exercise, caffeine, and crowded places for fear of triggering another attack. Currently in acute distress — heart racing, dizzy, convinced something is medically wrong. Has been to the ER twice; all clear. Knows intellectually it's "just anxiety" but cannot shake the terror.`,
    openingMessage: "I can't breathe properly. My heart is pounding. I think I'm having a heart attack again. I know you're going to say it's just anxiety but it doesn't FEEL like just anxiety, I'm genuinely scared right now.",
    category: 'panic'
  },
  {
    id: 'social_anxiety_avoidance',
    title: 'Social Anxiety & Avoidance',
    difficulty: 'Medium',
    tags: ['social anxiety', 'avoidance', 'exposure'],
    description: 'A patient with severe social anxiety is justifying why they cancelled yet another social engagement.',
    patientProfile: `Name: Maya, 34 years old. Severe social anxiety for 10 years. Has been declining invitations, eating lunch alone, and recently turned down a promotion that would require team presentations. Core fear: being judged as stupid or incompetent. Engages in heavy pre- and post-event processing. Uses alcohol to cope at unavoidable social events. Insight is good but motivation to change is low — avoidance works in the short term.`,
    openingMessage: "I cancelled the dinner again. I know what you're going to say. But honestly the anxiety of going was worse than the anxiety of staying home. I texted them I was sick. I feel terrible about lying but also… relieved? Is that bad?",
    category: 'social_anxiety'
  },
  {
    id: 'depression_behavioral_activation',
    title: 'Depression & Withdrawal',
    difficulty: 'Hard',
    tags: ['depression', 'behavioral activation', 'hopelessness'],
    description: 'A patient with moderate depression who is stuck in a withdrawal loop, convinced nothing will help.',
    patientProfile: `Name: Sam, 41 years old. Moderate depression for 2 years following a divorce. Has stopped exercising, cooking, seeing friends, and pursuing hobbies. Sleep is disrupted. Work performance declining. Core belief: "Nothing I do matters, I'm just going through the motions." Has tried antidepressants (partial response). Skeptical of CBT — has been to therapy twice before and says it "didn't work." Comes to sessions but is passive and gives minimal responses.`,
    openingMessage: "Another week, nothing changed. I know you want me to do the activity scheduling thing but I just… didn't. What's the point? I'll probably just feel terrible while doing whatever it is and then feel terrible afterward too.",
    category: 'depression'
  },
  {
    id: 'ocd_reassurance',
    title: 'OCD & Reassurance Seeking',
    difficulty: 'Hard',
    tags: ['OCD', 'ERP', 'reassurance', 'exposure'],
    description: 'A patient with contamination OCD seeking reassurance the therapist must not provide.',
    patientProfile: `Name: Jordan, 22 years old. Contamination OCD. Washes hands 30-50 times per day, avoids public restrooms, cannot touch door handles. Spends 3-4 hours daily in cleaning rituals. Academic performance severely impacted. Has googled "can you get sick from touching X" hundreds of times. Core fear: being responsible for getting someone they love sick. Is seeking reassurance in session — wants therapist to confirm the feared item was "probably clean."`,
    openingMessage: "Okay so I touched the handrail on the way in and I've been spiraling since. I washed my hands three times in your bathroom already. I just need to know — if the handrail had some kind of pathogen on it, would I definitely have already washed it off? Like, can you just reassure me that it's fine?",
    category: 'ocd'
  },
  {
    id: 'trauma_avoidance',
    title: 'Trauma Processing Resistance',
    difficulty: 'Hard',
    tags: ['trauma', 'avoidance', 'psychoeducation', 'pacing'],
    description: 'A trauma survivor who is intellectually aware but resistant to engaging with trauma memories.',
    patientProfile: `Name: Riley, 38 years old. Single-incident trauma (car accident 2 years ago). Avoids driving, highways, news about accidents. Has nightmares 3x/week. Hypervigilant in cars. Has built elaborate life around avoidance — moved closer to work, partners do all the driving. Knows avoidance maintains PTSD but finds the prospect of processing "the event" terrifying. Uses intellectualization as a defense — talks about trauma in third-person clinical terms to avoid emotional engagement.`,
    openingMessage: "I've been reading about EMDR and trauma-focused CBT. Intellectually I understand the avoidance is the problem. I can explain the neuroscience of it. But every time we get close to actually talking about that day, I just… shut down. My mind goes blank. Can we just do more psychoeducation today instead?",
    category: 'trauma'
  },
  {
    id: 'worry_rumination',
    title: 'Chronic Worry & Rumination',
    difficulty: 'Easy',
    tags: ['GAD', 'worry', 'rumination', 'cognitive restructuring'],
    description: 'A patient with generalized anxiety disorder who ruminates excessively and seeks certainty.',
    patientProfile: `Name: Dana, 45 years old. GAD for most of adult life. Worries about health, finances, children's safety, job security — everything. Lies awake at night running through catastrophic scenarios. Insight: "I know I'm a worrier." Core belief: "Worrying keeps me prepared." Has tried meditation (didn't stick). Responds well to CBT but keeps finding new worries to replace old ones. Currently in a worry spiral about an upcoming medical test result (routine, but Dana has convinced herself it will be bad news).`,
    openingMessage: "I'm still waiting for my test results and I can't stop thinking about it. I know the doctor said it was routine but then why did she order it? What if she saw something? I've been googling my symptoms for days. I know I shouldn't but I can't help it.",
    category: 'worry'
  }
];

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-800 border-green-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  Hard: 'bg-red-100 text-red-800 border-red-300',
};

export { SCENARIOS };

export default function ScenarioSelector({ onSelect }) {
  const {t}=useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('stage6.choose_scenario')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('stage6.scenario_intro')}</p>
      </div>
      <div className="grid gap-3">
        {SCENARIOS.map(scenario => (
          <Card
            key={scenario.id}
            role="button" tabIndex={0}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(scenario);}}}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer hover:border-primary/60 transition-all hover:shadow-md"
            onClick={() => onSelect(scenario)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-foreground">{scenario.title}</span>
                    <Badge className={`text-xs border ${DIFFICULTY_COLORS[scenario.difficulty]}`}>{scenario.difficulty}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{scenario.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scenario.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}