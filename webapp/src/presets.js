const wgerImage = (path) => `https://wger.de/media/exercise-images/${path}`;

export const EXERCISE_CATEGORIES = [
  {
    id: "chest",
    name: "Грудь",
    exercises: [
      { name: "Жим лёжа", image: wgerImage("192/Bench-press-1.png.400x400_q85.png") },
      { name: "Жим гантелей лёжа", image: wgerImage("97/Dumbbell-bench-press-1.png.400x400_q85.jpg") },
      { name: "Жим на наклонной скамье", image: wgerImage("16/Incline-press-1.png.400x400_q85.png") },
      { name: "Сведение рук в тренажёре", image: wgerImage("98/Butterfly-machine-2.png.400x400_q85.jpg") },
    ],
  },
  {
    id: "back",
    name: "Спина",
    exercises: [
      { name: "Становая тяга", image: wgerImage("161/Dead-lifts-2.png.400x400_q85.jpg") },
      { name: "Тяга Т-грифа", image: wgerImage("106/T-bar-row-1.png.400x400_q85.png") },
      { name: "Тяга штанги обратным хватом", image: wgerImage("110/Reverse-grip-bent-over-rows-1.png.400x400_q85.jpg") },
      { name: "Тяга штанги к задним дельтам", image: wgerImage("109/Barbell-rear-delt-row-1.png.400x400_q85.jpg") },
    ],
  },
  {
    id: "shoulders",
    name: "Плечи",
    exercises: [
      { name: "Жим штанги сидя", image: wgerImage("119/seated-barbell-shoulder-press-large-1.png.400x400_q85.jpg") },
      { name: "Жим гантелей над головой", image: wgerImage("123/dumbbell-shoulder-press-large-1.png.400x400_q85.jpg") },
      { name: "Подъём гантелей в стороны", image: wgerImage("148/lateral-dumbbell-raises-large-2.png.400x400_q85.jpg") },
      { name: "Жим плеч в тренажёре", image: wgerImage("53/Shoulder-press-machine-2.png.400x400_q85.png") },
    ],
  },
  {
    id: "legs",
    name: "Ноги и ягодицы",
    exercises: [
      { name: "Фронтальные приседания", image: wgerImage("191/Front-squat-1-857x1024.png.400x400_q85.png") },
      { name: "Выпады в движении", image: wgerImage("113/Walking-lunges-1.png.400x400_q85.jpg") },
      { name: "Сгибание ног лёжа", image: wgerImage("154/lying-leg-curl-machine-large-1.png.400x400_q85.jpg") },
      { name: "Подъёмы на носки", image: wgerImage("1243/53d4fabe-c994-4907-873f-8d82813a9832.png.400x400_q85.jpg") },
    ],
  },
  {
    id: "biceps",
    name: "Бицепс",
    exercises: [
      { name: "Сгибание рук со штангой", image: wgerImage("129/Standing-biceps-curl-1.png.400x400_q85.png") },
      { name: "Сгибание рук с гантелями", image: wgerImage("81/Biceps-curl-1.png.400x400_q85.png") },
      { name: "Молотковые сгибания", image: wgerImage("86/Bicep-hammer-curl-1.png.400x400_q85.png") },
      { name: "Сгибание рук на скамье Скотта", image: wgerImage("193/Preacher-curl-3-1.png.400x400_q85.png") },
    ],
  },
  {
    id: "triceps",
    name: "Трицепс",
    exercises: [
      { name: "Жим узким хватом", image: wgerImage("88/Narrow-grip-bench-press-1.png.400x400_q85.png") },
      { name: "Отжимания от скамьи", image: wgerImage("83/Bench-dips-1.png.400x400_q85.png") },
      { name: "Французский жим лёжа", image: wgerImage("84/Lying-close-grip-triceps-press-to-chin-1.png.400x400_q85.png") },
    ],
  },
  {
    id: "core",
    name: "Пресс и корпус",
    exercises: [
      { name: "Скручивания", image: wgerImage("91/Crunches-1.png.400x400_q85.png") },
      { name: "Скручивания на наклонной скамье", image: wgerImage("93/Decline-crunch-1.png.400x400_q85.png") },
      { name: "Подъём ног лёжа", image: wgerImage("125/Leg-raises-2.png.400x400_q85.png") },
      { name: "Скручивания с поворотом", image: wgerImage("176/Cross-body-crunch-1.png.400x400_q85.png") },
    ],
  },
];

export const BUILTIN_PRESETS = [
  {
    id: "fullbody",
    name: "Full Body",
    description: "Силовая тренировка на всё тело",
    exercises: [
      "Приседания",
      "Жим лёжа",
      "Тяга штанги в наклоне",
      "Жим стоя",
      "Румынская тяга",
      "Подтягивания",
    ],
  },
  {
    id: "push",
    name: "Push",
    description: "Push / Pull / Legs — жимовой день",
    exercises: ["Жим лёжа", "Жим стоя", "Отжимания на брусьях", "Разведения гантелей", "Французский жим"],
  },
  {
    id: "pull",
    name: "Pull",
    description: "Push / Pull / Legs — тяговый день",
    exercises: ["Становая тяга", "Подтягивания", "Тяга штанги", "Тяга верхнего блока", "Сгибания рук"],
  },
  {
    id: "legs",
    name: "Legs",
    description: "Push / Pull / Legs — ноги",
    exercises: ["Приседания", "Румынская тяга", "Выпады", "Жим ногами", "Подъёмы на носки"],
  },
  {
    id: "upper",
    name: "Верх",
    description: "Сплит верх / низ — верх тела",
    exercises: ["Жим лёжа", "Тяга штанги", "Жим стоя", "Подтягивания", "Подъём гантелей на бицепс"],
  },
  {
    id: "lower",
    name: "Низ",
    description: "Сплит верх / низ — низ тела",
    exercises: ["Приседания", "Румынская тяга", "Выпады", "Сгибания ног", "Подъёмы на носки"],
  },
];
