/**
 * Word categories and word banks for Skribbl game.
 */
export const CATEGORY_WORDS: Record<string, readonly string[]> = {
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
};

const GENERAL_WORDS: readonly string[] = [
  "rainbow", "airplane", "volcano", "mountain", "pyramid", "snowman", "lighthouse",
  "football", "sunflower", "tree", "house", "bridge", "moon", "castle", "train",
  "firefighter", "cloud", "campfire", "island"
];

const ALL_WORDS: readonly string[] = Array.from(
  new Set([
    ...CATEGORY_WORDS.animals,
    ...CATEGORY_WORDS.objects,
    ...CATEGORY_WORDS.food,
    ...GENERAL_WORDS,
  ])
);

/**
 * Encapsulates the word bank, category selection, and word randomization algorithms.
 */
export class WordService {
  private category = "all";
  private customWords: string[] = [];
  private customWordsOnly = false;

  constructor(category = "all", customWords?: string[]) {
    this.setCategory(category);
    if (customWords && customWords.length > 0) {
      this.setCustomWords(customWords);
    }
  }

  setCategory(category?: string): void {
    const cleaned = String(category || "all").trim().toLowerCase();
    if (CATEGORY_WORDS[cleaned]) {
      this.category = cleaned;
    } else {
      this.category = "all";
    }
  }

  getCategory(): string {
    return this.category;
  }

  setCustomWords(words: string[], customWordsOnly = false): void {
    const cleaned = words
      .map((w) => String(w || "").trim().toLowerCase())
      .filter((w) => w.length >= 2 && w.length <= 30 && /^[a-zA-Z0-9\s-]+$/.test(w));
    this.customWords = Array.from(new Set(cleaned));
    this.customWordsOnly = customWordsOnly;
  }

  /**
   * Returns a random selection of distinct words for the drawer to choose from based on active category.
   */
  getRandomOptions(count: number): string[] {
    const limit = Math.max(1, Math.min(5, count));
    let pool: string[];

    if (this.customWordsOnly && this.customWords.length > 0) {
      pool = [...this.customWords];
    } else {
      const categoryWords = this.category === "all"
        ? ALL_WORDS
        : (CATEGORY_WORDS[this.category] || ALL_WORDS);

      if (this.customWords.length > 0) {
        // Mix category words and custom words (avoid duplicates)
        pool = Array.from(new Set([...categoryWords, ...this.customWords]));
      } else {
        pool = [...categoryWords];
      }
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }
}
