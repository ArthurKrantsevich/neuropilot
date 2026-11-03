// Компоненты, сделанные для роликов канала (старый вариант главной-меню). Карточка ведёт на компонент на этом сайте.
export const DEMO_BASE = "https://arthurkrantsevich.github.io/neuropilot/";

export type Item = { id: string; title: string; about: string };
export const ITEMS: Item[] = [
  { id: "hamburger-eras", title: "Гамбургер-меню старше веба", about: "Тяни ширину — меню прячется за три полоски. Одно правило @container." },
  { id: "ua-mask", title: "Почему Chrome называет себя Mozilla", about: "Твоя строка User-Agent по именам — и ответ «Netscape» из консоли." },
  { id: "link-eras", title: "Почему ссылки синие", about: "Одна ссылка в пяти браузерах: от чёрной 1990 до #0000EE." },
  { id: "rolling-like", title: "Лайк со счётчиком-барабаном", about: "Цифры крутятся, как просмотры на YouTube. Только transform." },
  { id: "peek-login", title: "Робот не подглядывает в пароль", about: "Юнит закрывает экран ладонями на поле пароля." },
  { id: "reactions", title: "Реакции как в Telegram", about: "Перенос, активация, эффект — три анимации без библиотек." },
  { id: "eras", title: "Кожа → плоско → стекло", about: "Один экран айфона в трёх эпохах интерфейса." },
  { id: "clay", title: "Клейморфизм", about: "Пластилиновая кнопка — это три тени." },
  { id: "brutal", title: "Необрутализм", about: "Ноль размытий, ноль градиентов, жёсткая тень." },
  { id: "neu", title: "Неоморфизм", about: "Найди кнопки: того же цвета, что фон." },
  { id: "bento", title: "Бенто-сетка", about: "Коллаж, бенто и телефон — две строки CSS." },
  { id: "material", title: "Material You", about: "Один цвет обоев → 29 ролей интерфейса." },
  { id: "card", title: "Карточка → страница", about: "Картинка перелетает на новую страницу. View Transitions." },
  { id: "island", title: "Dynamic Island", about: "Капсула превращается в таймер, плеер и звонок." },
  { id: "range-picker", title: "Выбор диапазона дат", about: "Два месяца, подсветка при наведении, пресеты." },
  { id: "magnetic", title: "Магнитная кнопка", about: "Тянется за курсором и пружинит обратно." },
  { id: "tilt", title: "3D-карточка", about: "Наклоняется за курсором: perspective + rotate." },
  { id: "password", title: "Поле пароля с лицом", about: "Лицо пугается слабого пароля." },
  { id: "toggle", title: "Переключатель день/ночь", about: "Солнце становится луной одной тенью." },
  { id: "runaway", title: "Убегающая кнопка", about: "«Подписаться», которую нельзя нажать." },
];
