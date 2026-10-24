import { WordMode } from "../types/game";

/**
 * Multilingual word banks organized by language and category.
 */
export const MULTILINGUAL_WORDS: Record<string, Record<string, readonly string[]>> = {
  en: {
    animals: [
      "elephant", "butterfly", "octopus", "dinosaur", "dragon", "penguin", "turtle", "giraffe",
      "cat", "dog", "lion", "tiger", "bear", "monkey", "rabbit", "kangaroo", "dolphin", "whale",
      "zebra", "eagle", "parrot", "shark", "panda", "fox", "wolf", "horse", "snake", "frog",
      "duck", "owl", "crocodile", "squirrel", "camel", "koala", "peacock", "flamingo", "hedgehog",
      "gorilla", "spider", "crab", "jellyfish", "bee", "ant", "hamster", "deer", "sheep", "goat",
      "pig", "cow", "chicken", "cheetah", "hippopotamus", "rhinoceros", "sloth", "otter", "lobster",
      "seal", "bat", "chameleon", "swan"
    ],
    objects: [
      "guitar", "computer", "basketball", "toothbrush", "spaceship", "bicycle", "telescope",
      "camera", "umbrella", "rocket", "skateboard", "key", "clock", "book", "chair", "phone",
      "shoe", "crown", "candle", "backpack", "flashlight", "hammer", "scissors", "glasses",
      "lamp", "mirror", "bottle", "keyboard", "headphones", "pencil", "wallet", "watch",
      "fan", "pillow", "blanket", "ladder", "cup", "spoon", "fork", "knife", "door", "window",
      "balloon", "trophy", "anchor", "sword", "shield", "compass", "magnet", "battery", "flag",
      "drum", "whistle", "tent", "suitcase", "microscope", "calculator", "radio", "teapot",
      "bell", "helmet", "ring", "broom", "comb"
    ],
    food: [
      "hamburger", "watermelon", "pineapple", "sandwich", "pizza", "ice cream", "cookie", "cake",
      "banana", "apple", "donut", "sushi", "taco", "chocolate", "pancake", "waffle", "cheese",
      "strawberry", "popcorn", "bread", "carrot", "egg", "spaghetti", "hotdog", "grapes", "cherry",
      "muffin", "soup", "potato", "orange", "lemon", "lollipop", "croissant", "salad", "burrito"
    ],
    general: [
      "rainbow", "airplane", "volcano", "mountain", "pyramid", "snowman", "lighthouse",
      "football", "sunflower", "tree", "house", "bridge", "moon", "castle", "train",
      "firefighter", "cloud", "campfire", "island", "stars"
    ]
  },
  es: {
    animals: [
      "elefante", "mariposa", "pulpo", "dinosaurio", "dragon", "pinguino", "tortuga", "jirafa",
      "gato", "perro", "leon", "tigre", "oso", "mono", "conejo", "canguro", "delfin", "ballena",
      "cebra", "aguila", "loro", "tiburon", "panda", "zorro", "lobo", "caballo", "serpiente", "rana",
      "pato", "buho", "cocodrilo", "ardilla", "camello", "koala", "flamenco", "arana", "abeja"
    ],
    objects: [
      "guitarra", "computadora", "baloncesto", "cepillo", "bicicleta", "telescopio", "camara",
      "paraguas", "cohete", "reloj", "libro", "silla", "telefono", "zapato", "corona", "vela",
      "martillo", "tijeras", "gafas", "lampara", "espejo", "botella", "lapiz", "cartera"
    ],
    food: [
      "hamburguesa", "sandia", "pina", "sandwich", "pizza", "helado", "galleta", "pastel",
      "platano", "manzana", "dona", "taco", "chocolate", "queso", "fresa", "pan", "zanahoria", "huevo"
    ],
    general: [
      "arcoiris", "avion", "volcan", "montana", "piramide", "faro", "girasol", "arbol", "casa",
      "puente", "luna", "castillo", "tren", "nube", "fogata", "isla", "estrella"
    ]
  },
  fr: {
    animals: [
      "elephant", "papillon", "pieuvre", "dinosaure", "dragon", "pingouin", "tortue", "girafe",
      "chat", "chien", "lion", "tigre", "ours", "singe", "lapin", "kangourou", "dauphin", "baleine",
      "zebre", "aigle", "perroquet", "requin", "panda", "renard", "loup", "cheval", "serpent", "grenouille"
    ],
    objects: [
      "guitare", "ordinateur", "ballon", "brosse", "velo", "telescope", "camera", "parapluie",
      "fusee", "horloge", "livre", "chaise", "telephone", "chaussure", "couronne", "bougie",
      "marteau", "ciseaux", "lunettes", "lampe", "miroir", "bouteille", "crayon"
    ],
    food: [
      "hamburger", "pasteque", "ananas", "sandwich", "pizza", "glace", "biscuit", "gateau",
      "banane", "pomme", "chocolat", "fromage", "fraise", "pain", "carotte", "oeuf", "croissant"
    ],
    general: [
      "arc en ciel", "avion", "volcan", "montagne", "pyramide", "phare", "tournesol", "arbre", "maison",
      "pont", "lune", "chateau", "train", "nuage", "etoile", "ile"
    ]
  },
  de: {
    animals: [
      "elefant", "schmetterling", "krake", "dinosaurier", "drache", "pinguin", "schildkroete", "giraffe",
      "katze", "hund", "loewe", "tiger", "baer", "affe", "hase", "kaenguru", "delfin", "wal",
      "zebra", "adler", "papagei", "hai", "panda", "fuchs", "wolf", "pferd", "schlange", "frosch"
    ],
    objects: [
      "gitarre", "computer", "basketball", "zahnbuerste", "fahrrad", "teleskop", "kamera", "regenschirm",
      "rakete", "uhr", "buch", "stuhl", "telefon", "schuh", "krone", "kerze", "hammer", "schere", "brille"
    ],
    food: [
      "hamburger", "wassermelone", "ananas", "sandwich", "pizza", "eis", "keks", "kuchen",
      "banane", "apfel", "donut", "schokolade", "kaese", "erdbeere", "brot", "karotte", "ei"
    ],
    general: [
      "regenbogen", "flugzeug", "vulkan", "berg", "pyramide", "leuchtturm", "sonnenblume", "baum", "haus",
      "bruecke", "mond", "schloss", "zug", "wolke", "stern", "insel"
    ]
  },
  pt: {
    animals: [
      "elefante", "borboleta", "polvo", "dinossauro", "dragao", "pinguim", "tartaruga", "girafa",
      "gato", "cachorro", "leao", "tigre", "urso", "macaco", "coelho", "canguru", "golfinho", "baleia",
      "zebra", "aguia", "papagaio", "tubarao", "panda", "raposa", "lobo", "cavalo", "cobra", "sapo"
    ],
    objects: [
      "violao", "computador", "basquete", "escova", "bicicleta", "telescopio", "camera", "guarda-chuva",
      "foguete", "relogio", "livro", "cadeira", "telefone", "sapato", "coroa", "vela", "martelo", "tesoura"
    ],
    food: [
      "hamburguer", "melancia", "abacaxi", "sanduiche", "pizza", "sorvete", "biscoito", "bolo",
      "banana", "maca", "chocolate", "queijo", "morango", "pao", "cenoura", "ovo"
    ],
    general: [
      "arco-iris", "aviao", "vulcao", "montanha", "piramide", "farol", "girassol", "arvore", "casa",
      "ponte", "lua", "castelo", "trem", "nuvem", "estrela", "ilha"
    ]
  },
  hi: {
    animals: [
      "elephant", "lion", "tiger", "monkey", "cat", "dog", "bear", "snake", "frog",
      "hathi", "sher", "cheetah", "bandar", "billi", "kutta", "bhalu", "saanp", "mendhak",
      "ghoda", "mor", "tota", "machli", "magarmachh", "oomth", "gadha", "bakri"
    ],
    objects: [
      "guitar", "computer", "bicycle", "rocket", "clock", "book", "chair", "phone",
      "kitab", "kalam", "ghadi", "kursi", "chashma", "gadi", "patang", "chhatri",
      "tala", "chaabi", "botal", "joota", "pankha", "chammach"
    ],
    food: [
      "pizza", "burger", "ice cream", "cake", "banana", "apple", "mango",
      "samosa", "jalebi", "roti", "chai", "dosa", "pani puri", "mithai", "seb", "aam"
    ],
    general: [
      "rainbow", "airplane", "mountain", "tree", "house", "moon", "star",
      "suraj", "chand", "sitara", "pahad", "ped", "ghar", "baadal", "nadi"
    ]
  }
};

export const COMBINATION_WORDS: readonly string[] = [
  "flying car", "fire dragon", "rainbow bridge", "space rocket", "moon castle",
  "sun flower", "ice cream tree", "camp fire guitar", "snow man pizza", "sea turtle",
  "tree house", "gold crown", "spider web", "water melon island", "magic wand",
  "polar bear", "banana boat", "star fish", "light house", "cloud train",
  "robot dog", "alien spaceship", "chocolate mountain", "crystal ball"
];

/**
 * Encapsulates the word bank, category selection, language, and word randomization algorithms.
 */
export class WordService {
  private category = "all";
  private language = "en";
  private wordMode: WordMode = "normal";
  private customWords: string[] = [];
  private customWordsOnly = false;

  constructor(category = "all", customWords?: string[], language = "en", wordMode: WordMode = "normal") {
    this.setLanguage(language);
    this.setCategory(category);
    this.setWordMode(wordMode);
    if (customWords && customWords.length > 0) {
      this.setCustomWords(customWords);
    }
  }

  setCategory(category?: string): void {
    const cleaned = String(category || "all").trim().toLowerCase();
    this.category = cleaned;
  }

  getCategory(): string {
    return this.category;
  }

  setLanguage(lang?: string): void {
    const cleaned = String(lang || "en").trim().toLowerCase();
    this.language = MULTILINGUAL_WORDS[cleaned] ? cleaned : "en";
  }

  getLanguage(): string {
    return this.language;
  }

  setWordMode(mode?: WordMode): void {
    if (mode === "hidden" || mode === "combination" || mode === "normal") {
      this.wordMode = mode;
    } else {
      this.wordMode = "normal";
    }
  }

  getWordMode(): WordMode {
    return this.wordMode;
  }

  setCustomWords(words: string[], customWordsOnly = false): void {
    const cleaned = words
      .map((w) => String(w || "").trim().toLowerCase())
      .filter((w) => w.length >= 2 && w.length <= 30 && /^[a-zA-Z0-9\s-]+$/.test(w));
    this.customWords = Array.from(new Set(cleaned));
    this.customWordsOnly = customWordsOnly;
  }

  /**
   * Returns a random selection of distinct words for the drawer to choose from based on active settings.
   */
  getRandomOptions(count: number): string[] {
    const limit = Math.max(1, Math.min(5, count));

    if (this.customWordsOnly && this.customWords.length > 0) {
      const shuffled = [...this.customWords].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    }

    if (this.wordMode === "combination") {
      const combinedPool = this.customWords.length > 0
        ? Array.from(new Set([...COMBINATION_WORDS, ...this.customWords]))
        : [...COMBINATION_WORDS];
      const shuffled = [...combinedPool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    }

    const dict = MULTILINGUAL_WORDS[this.language] || MULTILINGUAL_WORDS.en;
    let pool: string[];

    if (this.category === "all") {
      pool = Array.from(
        new Set([
          ...(dict.animals || []),
          ...(dict.objects || []),
          ...(dict.food || []),
          ...(dict.general || [])
        ])
      );
    } else {
      pool = [...(dict[this.category] || dict.animals || MULTILINGUAL_WORDS.en.animals)];
    }

    if (this.customWords.length > 0) {
      pool = Array.from(new Set([...pool, ...this.customWords]));
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }
}

