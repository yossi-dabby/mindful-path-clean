/* Shared offline review behavior. Messages belong to each translation packet. */
(function () {
  'use strict';
  const doc = document;
  const status = doc.getElementById('fill-status');
  const messages = status.dataset;
  const fields = () => Array.from(doc.querySelectorAll('[contenteditable="true"]'));
  function validate() {
    const overflowing = fields().filter(field => field.scrollHeight > field.clientHeight + 1 || field.scrollWidth > field.clientWidth + 1);
    fields().forEach(field => field.classList.toggle('field-overflow', overflowing.includes(field)));
    doc.body.classList.toggle('has-overflow', overflowing.length > 0);
    status.textContent = overflowing.length ? messages.overflow : messages.ok;
    return !overflowing.length;
  }
  function answers() {
    const id = doc.querySelector('article').dataset.template;
    return id + '\n' + messages.answersHeader + '\n\n' + fields().map((field, index) =>
      (field.getAttribute('aria-label') || messages.fieldLabel + ' ' + (index + 1)) + '\n' + field.innerText
    ).join('\n\n');
  }
  doc.getElementById('print-form').addEventListener('click', () => {
    if (validate()) window.print();
    else { doc.querySelector('.field-overflow').focus(); window.alert(messages.printBlocked); }
  });
  doc.getElementById('save-answers').addEventListener('click', () => {
    const blob = new Blob(['\ufeff' + answers()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = doc.createElement('a');
    link.href = url; link.download = doc.querySelector('article').dataset.template + '-answers.txt';
    doc.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  doc.addEventListener('input', validate);
  window.addEventListener('beforeprint', validate);
  window.MindfulPathForm = { validate, answers };
  validate();
})();
