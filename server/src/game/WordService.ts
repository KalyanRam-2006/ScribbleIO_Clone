/**
 * Encapsulates the word bank and word selection algorithms.
 */
export class WordService {
  private static readonly DEFAULT_WORDS: readonly string[] = [
    "elephant", "rainbow", "airplane", "hamburger", "guitar", "volcano", "butterfly", "computer", "basketball", "watermelon",
    "mountain", "toothbrush", "spaceship", "pyramid", "octopus", "snowman", "bicycle", "pineapple", "telescope", "firefighter",
    "dinosaur", "helicopter", "sandwich", "backpack", "candle", "castle", "dragon", "camera", "pizza", "umbrella",
    "rocket", "penguin", "skateboard", "turtle", "lighthouse", "football", "ice cream", "sunflower", "key", "clock",
    "book", "cat", "dog", "tree", "house", "fish", "chair", "phone", "shoe", "crown", "giraffe", "train", "bridge", "moon"
  ];

  private words: string[];

  constructor(customWords?: string[]) {
    this.words = customWords && customWords.length > 0 ? [...customWords] : [...WordService.DEFAULT_WORDS];
  }

  /**
   * Returns a random selection of distinct words for the drawer to choose from.
   */
  getRandomOptions(count: number): string[] {
    const limit = Math.max(1, Math.min(5, count));
    const shuffled = [...this.words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }
}
