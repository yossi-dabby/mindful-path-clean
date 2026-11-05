/* Mindful Path offline review form. No network or automatic storage. */
(function (root) {
  'use strict';
  function exceeds(field) {
    return field.scrollHeight > field.clientHeight + 1 ||
      field.scrollWidth > field.clientWidth + 1;
  }
  function inspect(fields) {
    const list = Array.from(fields);
    return { count: list.length, overflowing: list.filter(exceeds) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { exceeds, inspect };
  if (!root.document) return;
  const doc = root.document;
  function validate() {
    const fields = Array.from(doc.querySelectorAll('[contenteditable="true"]'));
    const state = inspect(fields);
    fields.forEach(field => field.classList.toggle('field-overflow', state.overflowing.includes(field)));
    doc.body.classList.toggle('has-overflow', state.overflowing.length > 0);
    const status = doc.getElementById('fill-status');
    if (status) status.textContent = state.overflowing.length ?
      'יש תשובה שחורגת. קצרו או שמרו כטקסט והעבירו לדף המשך; התוכן לא נמחק.' :
      'לא נמצאה חריגה בשורות. בדקו תצוגה מקדימה לפני הדפסה.';
    return !state.overflowing.length;
  }
  function answers() {
    const id = doc.querySelector('article')?.dataset.template || 'MindfulPath';
    return id + '\nנתוני מילוי מקומי - יש לשמור במקום מתאים\n\n' +
      Array.from(doc.querySelectorAll('[contenteditable="true"]')).map((field, index) =>
        (field.getAttribute('aria-label') || 'שדה ' + (index + 1)) + '\n' + field.innerText
      ).join('\n\n');
  }
  doc.getElementById('print-form')?.addEventListener('click', () => {
    if (validate()) root.print();
    else { doc.querySelector('.field-overflow')?.focus(); root.alert('ההדפסה נעצרה בגלל תשובה שחורגת. התוכן לא נמחק. קצרו או שמרו כטקסט והעבירו לדף המשך.'); }
  });
  doc.getElementById('save-answers')?.addEventListener('click', () => {
    const blob = new Blob(['\ufeff' + answers()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = doc.createElement('a');
    link.href = url; link.download = (doc.querySelector('article')?.dataset.template || 'MindfulPath') + '-answers.txt';
    doc.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  doc.addEventListener('input', validate);
  root.addEventListener('beforeprint', validate);
  root.MindfulPathForm = { validate, answers };
  validate();
})(typeof window !== 'undefined' ? window : globalThis);
