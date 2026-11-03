'use strict';

const elements = {
  grid: document.querySelector('#project-grid'),
  search: document.querySelector('#search'),
  category: document.querySelector('#category'),
  level: document.querySelector('#level'),
  filters: document.querySelector('#filters'),
  count: document.querySelector('#results-count'),
  empty: document.querySelector('#empty-state'),
  dialog: document.querySelector('#passport-dialog'),
  dialogContent: document.querySelector('#dialog-content'),
  closeDialog: document.querySelector('#close-dialog'),
  print: document.querySelector('#print-passport'),
  copy: document.querySelector('#copy-passport')
};

let projects = [];
let selectedProject = null;
let previousFocus = null;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function normalized(value) {
  return value.toLocaleLowerCase('uk').normalize('NFC').trim();
}

function renderCard(project) {
  const article = createElement('article', 'project-card');
  const top = createElement('div', 'card-top');
  top.append(
    createElement('span', 'number', `ПРОЄКТ ${String(project.id).padStart(2, '0')}`),
    createElement('span', 'level', project.level)
  );

  const title = createElement('h3', '', project.name);
  const subtitle = createElement('p', 'subtitle', project.subtitle);
  const summary = createElement('p', 'summary', project.problem);
  const meta = createElement('div', 'card-meta', `${project.category} · ${project.team}`);
  const button = createElement('button', 'card-button', 'Переглянути паспорт →');
  button.type = 'button';
  button.setAttribute('aria-label', `Переглянути паспорт проєкту ${project.name}`);
  button.addEventListener('click', () => openPassport(project));

  article.append(top, title, subtitle, summary, meta, button);
  return article;
}

function renderProjects() {
  const query = normalized(elements.search.value);
  const category = elements.category.value;
  const level = elements.level.value;

  const filtered = projects.filter(project => {
    const searchable = normalized([
      project.name, project.subtitle, project.problem,
      project.audience, project.features, project.tech
    ].join(' '));

    return (!query || searchable.includes(query)) &&
      (!category || project.category === category) &&
      (!level || project.level === level);
  });

  elements.grid.replaceChildren(...filtered.map(renderCard));
  elements.count.textContent = `Знайдено ${filtered.length} із ${projects.length}`;
  elements.empty.hidden = filtered.length !== 0;
}

function addSection(parent, title, value, asList = false) {
  const section = createElement('section');
  section.append(createElement('h3', '', title));

  if (asList) {
    const list = createElement('ul');
    value.split(';').map(item => item.trim()).filter(Boolean).forEach(item => {
      list.append(createElement('li', '', item));
    });
    section.append(list);
  } else {
    section.append(createElement('p', '', value));
  }

  parent.append(section);
}

function passportAsText(project) {
  return [
    `ПАСПОРТ ВИПУСКНОГО ПРОЄКТУ № ${project.id}`,
    `Назва: ${project.name} — ${project.subtitle}`,
    `Напрям: ${project.category}`,
    `Складність: ${project.level}`,
    `Команда: ${project.team}`,
    `Проблема: ${project.problem}`,
    `Цільова аудиторія: ${project.audience}`,
    `Основні функції: ${project.features}`,
    `Мінімальний продукт (MVP): ${project.mvp}`,
    `Технології: ${project.tech}`,
    `Можливості розвитку: ${project.growth}`,
    `Контрольний сценарій: ${project.test}`
  ].join('\n');
}

function openPassport(project) {
  selectedProject = project;
  previousFocus = document.activeElement;

  const heading = createElement('div', 'passport-heading');
  const title = createElement('h2', '', project.name);
  title.id = 'dialog-title';
  heading.append(title, createElement('p', '', project.subtitle));

  const metadata = createElement('div', 'passport-meta');
  [project.category, `Рівень: ${project.level}`, `Команда: ${project.team}`]
    .forEach(value => metadata.append(createElement('span', '', value)));

  const details = createElement('div', 'passport-details');
  addSection(details, 'Проблема', project.problem);
  addSection(details, 'Цільова аудиторія', project.audience);
  addSection(details, 'Основні функції', project.features, true);
  addSection(details, 'Мінімальний продукт (MVP)', project.mvp);
  addSection(details, 'Орієнтовні технології', project.tech);
  addSection(details, 'Можливості розвитку', project.growth);
  addSection(details, 'Контрольний сценарій для захисту', project.test);

  elements.dialogContent.replaceChildren(heading, metadata, details);
  elements.dialog.showModal();
}

function closePassport() {
  elements.dialog.close();
}

async function copyPassport() {
  if (!selectedProject) return;
  const original = elements.copy.textContent;
  try {
    await navigator.clipboard.writeText(passportAsText(selectedProject));
    elements.copy.textContent = 'Скопійовано ✓';
  } catch (error) {
    const text = passportAsText(selectedProject);
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('aria-label', 'Текст паспорта для копіювання');
    elements.dialogContent.append(fallback);
    fallback.select();
    elements.copy.textContent = 'Виділіть текст і скопіюйте';
  }
  window.setTimeout(() => { elements.copy.textContent = original; }, 2500);
}

function initialize(data) {
  projects = data;
  const categories = [...new Set(projects.map(project => project.category))];
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.category.append(option);
  });
  renderProjects();
}

async function loadProjects() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Некоректний формат даних');
    initialize(data);
  } catch (error) {
    elements.count.textContent = 'Не вдалося завантажити каталог';
    elements.empty.hidden = false;
    elements.empty.textContent = 'Для роботи каталогу відкрийте сайт через локальний вебсервер або опублікуйте його на хостингу. Наприклад: python -m http.server 8000';
    console.error('Помилка завантаження проєктів:', error);
  }
}

elements.search.addEventListener('input', renderProjects);
elements.category.addEventListener('change', renderProjects);
elements.level.addEventListener('change', renderProjects);
elements.filters.addEventListener('reset', () => window.setTimeout(renderProjects, 0));
elements.closeDialog.addEventListener('click', closePassport);
elements.dialog.addEventListener('close', () => previousFocus?.focus());
elements.dialog.addEventListener('click', event => {
  if (event.target === elements.dialog) closePassport();
});
elements.print.addEventListener('click', () => window.print());
elements.copy.addEventListener('click', copyPassport);

loadProjects();
