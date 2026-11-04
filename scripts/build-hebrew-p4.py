"""Build editable review sources from an authored P4 or series unit specification.

No patient data, network access or PDF rewriting. Run the separate render command
with --write-pdfs only when deliberately producing a new pinned catalog release.
"""
from pathlib import Path
import html
import json
import re
import argparse

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--wave', choices=['p4-01', 'p4-02', 'series-01', 'series-02', 'series-03'], default='p4-01')
wave = parser.parse_args().wave
SOURCE = ROOT / 'content/hebrew-forms' / wave
BASE = ROOT / 'content/hebrew-forms/mood-01'
spec = json.loads((SOURCE / 'units.json').read_text())
AGES = ['CH', 'TE', 'AD', 'OA']
LABELS = dict(zip(AGES, ['ילדים', 'מתבגרים', 'מבוגרים', 'מבוגרים יותר']))
LABELS['ALL'] = 'מטפל בלבד - כל קבוצות הגיל'
e = html.escape
template = (BASE / 'forms/MP-MOOD-01-W-CH-HE.html').read_text()
toolbar = re.search(r'(<aside class="guard-toolbar">.*?</div>)<article', template, re.S).group(1)
(SOURCE / 'forms').mkdir(exist_ok=True)


def section(title, *paragraphs):
    return '<section><h2>' + e(title) + '</h2>' + ''.join('<p>' + e(p) + '</p>' for p in paragraphs) + '</section>'


def sheet(unit, form, title, subtitle, body, page=1):
    age = form['age']
    cls = {'CH': 'children', 'OA': 'older', 'ALL': 'guide'}.get(age, '')
    return f'''<article class="sheet {cls}" data-template="{form['id']}"><main class="content">
<div class="brandbar"><div class="brand">Mindful Path</div><div class="edition">ערכת טפסים בעברית<br>טיוטת תוכן 0.1 | 04.11.2026</div></div>
<div class="eyebrow"><bdi>{unit['code']}</bdi> | {e(unit.get('ageLabels', {}).get(age, LABELS[age]))}</div><h1>{e(title)}</h1><p class="subtitle">{e(subtitle)}</p>{body}</main>
<footer class="footer"><span>טיוטה לסקירה בלבד - לא להפצה | לא כלי אבחוני</span><span><bdi class="code">{form['id']}</bdi> | {page} מתוך {form['pages']}</span></footer></article>'''


def write(form, pages):
    document = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'">
<title>{e(form['title'])} | Mindful Path</title><link rel="stylesheet" href="../../mood-01/style.css"></head><body>{toolbar}{''.join(pages)}<script src="../../mood-01/print_guard.js"></script></body></html>'''
    (SOURCE / 'forms' / (form['id'] + '.html')).write_text(document)


forms = []
for unit in spec['units']:
    code = unit['code']
    guide = dict(id=f'MP-{code}-G-ALL-HE', title='הנחיות למטפל: ' + unit['title'], age='ALL', kind='G', pages=4, unit=code, track=unit['track'])
    pages = [sheet(unit, guide, unit['title'], '1 | מטרה, התאמה וגבולות',
        section('מטרת היחידה', unit['purpose']) +
        section('בחירה והתאמה', 'בחרו בדף לאחר הערכה מקצועית ובהסכמה. אפשר לדלג, להשיב בעל פה או לבחור כלי אחר. זהו חומר מקורי מוצע לסקירה; אין ציון, אבחון או הבטחה לתוצאה.') +
        section('גבולות ייחודיים ליחידה', unit['limits']) +
        section('שימוש חוזר בחומר הקיים', unit['overlap']) +
        (section('דוגמה בדויה לשיחה', unit['fictionalExample']) if 'fictionalExample' in unit else '') +
        '<div class="note">טיוטה לסקירת מנהל. סקירה קלינית ואישור זכויות סופיים טרם הושלמו.</div>')]
    prompts = unit['worksheet']['AD']
    pages.append(sheet(unit, guide, 'לעבוד יחד עם דף העבודה', '2 | שיחה סביב מצב אחד',
        section('פתיחה', 'בחרו מצב שהאדם מעוניין לבדוק. אין צורך לבחור את המצב הקשה ביותר. ודאו שהשאלה מובנת ושהמילים מתאימות לאדם; תיאורו קודם לפרשנות המטפל.') +
        ''.join(section(f'{i + 1} | שאלה לשיחה', prompt) for i, prompt in enumerate(prompts)) +
        section('סיום', 'סכמו מה הובן ומה נשאר פתוח. היעזרו ב־SES-S01 וב־SES-S02 הקיימים למעטפת המפגש. אין צורך למלא שוב הערכה או תוכנית שכבר תועדה.') +
        (section('קשיים אפשריים', unit['difficulties']) if 'difficulties' in unit else ''), 2))
    pages.append(sheet(unit, guide, 'התאמה לארבע קבוצות גיל', '3 | גיל הוא נקודת מוצא, לא הנחה על יכולת',
        section(unit.get('childHeading', 'CH | ילדים, בקירוב 6 עד 11'), unit['adaptations']['CH'], 'הציעו שאלה אחת בכל פעם ומעט כתיבה. תיווך מבוגר לא יחליף את קול הילד.') +
        section('TE | מתבגרים, בקירוב 12 עד 17', unit['adaptations']['TE'], 'סכמו מראש מה משתפים ועם מי, ואת גבולות הפרטיות במסגרת. אין להבטיח סודיות מוחלטת.') +
        section('AD | מבוגרים', unit['adaptations']['AD']) +
        section('OA | מבוגרים יותר', unit['adaptations']['OA'], 'אפשר להציע קריאה, זמן ושיחה לפי העדפה. סיוע מאדם אחר ייבחר עם המשתתף ובהתאם לפרטיותו.') +
        '<div class="note">נדרשת סקירה נפרדת לכל גרסת גיל. אישור לגרסה אחת אינו אישור אוטומטי לאחרות.</div>', 3))
    source_list = '<p class="source-ref">' + '<br>'.join(e(s.replace('https://', '')) for s in unit['sources']) + '</p>'
    pages.append(sheet(unit, guide, 'תרגול, סקירה והמשך', '4 | בחירה משותפת ולמידה מהניסיון',
        section('לפני מסירת דף P', unit.get('practiceIntro', 'בחרו יחד אם בכלל מתאים תרגול בין מפגשים. הגדירו הזדמנות אחת, גבולות ותמיכה רצויה. אפשר לתרגל רק בפגישה. אין רצף יומי מחייב או דרישה לשתף את הדף עם אחרים.')) +
        section('במפגש הבא', unit['reflection']) +
        section('תיעוד מקצועי וטכני', 'קיימת רשומת סקירה נפרדת לכל גרסה: התאמת גיל, מקוריות, זכויות ומילוי בדוי. סוקר ותאריך שטרם נקבעו נשארים ריקים. בדיקת קבצים או מיזוג קוד אינם אישור קליני. מידע טיפולי נשמר רק במסגרת המורשית, מחוץ למאגר הקוד.') +
        section('מקורות עיון', 'הקישורים הבאים שימשו לרקע בלבד. השאלות וההתאמות נכתבו מחדש לפי תוכנית ההרחבה; לא הועתק שאלון, מדד או פרוטוקול. מקורות למבוגרים אינם מתקפים את גרסאות הילדים. אין בחומר זה קביעה של מספר מפגשים או יעילות טיפולית.') +
        source_list, 4))
    write(guide, pages)
    forms.append(guide)
    for kind, key, title_key in [('W', 'worksheet', 'worksheetTitles'), ('P', 'practice', 'practiceTitles')]:
        for age in AGES:
            form = dict(id=f'MP-{code}-{kind}-{age}-HE', title=unit[title_key][age], age=age, kind=kind, pages=1, unit=code, track=unit['track'])
            meta = ''.join(f'<div class="meta">{label}<span class="write" contenteditable="true" role="textbox" aria-label="{label}"></span></div>' for label in ['קוד מטופל מקומי', 'תאריך', 'מספר סשן'])
            body = '<div class="metadata">' + meta + '</div>'
            for i, prompt in enumerate(unit[key][age]):
                body += f'<section class="section"><div class="section-title"><span class="num">{i + 1:02}</span>{e(prompt)}</div>'
                for n in range(1 if age == 'CH' and kind == 'P' else 2):
                    body += f'<div class="line" contenteditable="true" role="textbox" aria-label="{e(prompt)} - שורת מילוי {n + 1}"><br></div>'
                body += '</section>'
            subtitle = 'נבחר מצב אחד עם המטפל. אפשר לענות בכתב או בשיחה, לדלג או לעצור.' if kind == 'W' else 'תרגול שנבחר יחד עם המטפל. אפשר לכתוב מעט או לספר בפגישה, גם אם לא התאפשר לנסות.'
            if kind == 'P':
                subtitle = unit.get('practiceSubtitle', subtitle)
            write(form, [sheet(unit, form, form['title'], subtitle, body)])
            forms.append(form)
(SOURCE / 'forms.json').write_text(json.dumps(forms, ensure_ascii=False, indent=2) + '\n')
print(f'Built {len(forms)} editable review forms / {sum(f["pages"] for f in forms)} pages.')
