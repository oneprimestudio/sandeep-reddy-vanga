/**
 * Verified against public records (Wikipedia / IMDb / Film Companion).
 * `q` is the question put to him, `a` is the answer in the page's voice
 * (not a quote). Swap `a` for real, sourced interview lines whenever you have them.
 */
export type Award = {
  id: string;
  year: string;
  award: string;
  category: string;
  film: string;
  result: "won" | "nominated";
  count?: number; // how many nominations this row stands for
  q: string;
  a: string;
};

export const AWARDS: Award[] = [
  {
    id: "phalke-2024",
    year: "2024",
    award: "Dadasaheb Phalke Awards",
    category: "Best Director",
    film: "Animal",
    result: "won",
    q: "Everyone argued about Animal. Then this happened. Thoughts?",
    a: "Argue all you want. The film kept talking and the theatres kept filling. A Best Director award for it is just the loudest way to close the debate.",
  },
  {
    id: "iifa-2024-edit",
    year: "2024",
    award: "IIFA, 24th edition",
    category: "Best Editing",
    film: "Animal",
    result: "won",
    q: "Director, writer, and the one cutting the film. Why take all three?",
    a: "Because the cut is where the film decides what it is. If someone else holds the scissors, they hold the rhythm. I would rather own every frame and every second between them.",
  },
  {
    id: "siima-2018",
    year: "2018",
    award: "SIIMA, 7th edition",
    category: "Best Debut Director (Telugu)",
    film: "Arjun Reddy",
    result: "won",
    q: "First film. First trophy. Did you see that coming?",
    a: "Nobody hands a first-timer a safe script. The film was made the way it could not stop being thought about, and the room answered. A debut that gets a name on the board is proof the instinct was right.",
  },
  {
    id: "cinegoers-2018",
    year: "2018",
    award: "Cinegoers Awards, 49th edition",
    category: "Best Debut Director",
    film: "Arjun Reddy",
    result: "won",
    q: "Two debut awards in one year. Coincidence?",
    a: "Once is a result. Twice is a pattern. The film travelled, the crowd stayed loud, and the second statue just said it again in a different room.",
  },
  {
    id: "filmfare-69",
    year: "2024",
    award: "Filmfare Awards, 69th edition",
    category: "Best Director, Best Screenplay, Best Editing",
    film: "Animal",
    result: "nominated",
    count: 3,
    q: "Three nominations. Anything missing?",
    a: "Three chairs at the table for one man. Direction, screenplay and edit all in the room at once. Being counted in every one of them says the whole film was seen, not just its noise.",
  },
  {
    id: "iifa-2024-dir",
    year: "2024",
    award: "IIFA, 24th edition",
    category: "Best Director",
    film: "Animal",
    result: "nominated",
    count: 1,
    q: "Best Director and Best Editing at the same ceremony. How does that sit?",
    a: "One night, two calls to the stage for the same film. The edit took the trophy, and the director's chair was in the room right beside it.",
  },
  {
    id: "screen-2019",
    year: "2019",
    award: "Screen Awards, 26th edition",
    category: "Best Director",
    film: "Kabir Singh",
    result: "nominated",
    count: 1,
    q: "Hindi audiences. Same story. Did it cross over?",
    a: "A story that is true in Telugu stays true in Hindi. A Best Director nomination for the remake was the answer.",
  },
  {
    id: "iifa-2019",
    year: "2019",
    award: "IIFA, 21st edition",
    category: "Best Director",
    film: "Kabir Singh",
    result: "nominated",
    count: 1,
    q: "Another ceremony, same film. What does that say?",
    a: "One nomination is a nod. Two ceremonies in the same year is the industry agreeing with the box office.",
  },
  {
    id: "filmfare-south-65",
    year: "2018",
    award: "Filmfare Awards South, 65th edition",
    category: "Best Director (Telugu)",
    film: "Arjun Reddy",
    result: "nominated",
    count: 1,
    q: "A debut film in the Best Director race. How did that feel?",
    a: "Standing next to veterans with a first film is the whole point. You do not ask permission to be in that list. You make the film that puts you there.",
  },
  {
    id: "siima-2018-dir",
    year: "2018",
    award: "SIIMA, 7th edition",
    category: "Best Director (Telugu)",
    film: "Arjun Reddy",
    result: "nominated",
    count: 1,
    q: "Debut award and Best Director nomination, same night. Which one stays?",
    a: "The win said he arrived. The nomination said he belonged in the main race. They are not the same sentence, and he got both.",
  },
];

export const WINS = AWARDS.filter((a) => a.result === "won").length;
export const NOMINATIONS = AWARDS.filter((a) => a.result === "nominated").reduce(
  (n, a) => n + (a.count ?? 1),
  0
);