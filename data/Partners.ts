/**
 * Production banners behind Sandeep Reddy Vanga's films.
 *
 * Sources: Animal credits (T-Series, Cine1Studios, Bhadrakali Pictures), Arjun Reddy
 * background (Wikipedia, interviews with Pranay Reddy Vanga), IANS / Udayavani on the
 * Allu Arjun project, Variety India on Spirit, Animal Park and the newcomer films.
 * Check dates and statuses before publishing: Spirit and the Allu Arjun film are still moving.
 *
 * LOGOS:  /public/logos/*.png          (transparent PNG, about 800px wide)
 * IMAGES: /public/images/production/*  (see `image` below; a placeholder shows until they exist)
 */
export type PartnerFilm = {
  title: string;
  year: string; // "2017" | "Upcoming" | "Announced"
  lead: string;
  lang?: string;
};

export type Partner = {
  id: string;
  name: string;
  led: string;
  since: string;
  logo: string;
  dark?: boolean; // true = logo is light-coloured, so the shader card is black
  image: string;
  pull: string;
  facts: { k: string; v: string }[];
  chapters: { title: string; text: string }[];
  films: PartnerFilm[];
};

export const PARTNERS: Partner[] = [
  {
    id: "bhadrakali",
    name: "Bhadrakali Pictures",
    led: "Pranay Reddy Vanga",
    since: "2017",
    logo: "/logos/bhadrakali-pictures.png",
    image: "/images/production/bhadrakali.png",
    pull: "Producers passed on Arjun Reddy for years. His brother didn't.",
    facts: [
      { k: "Founded by", v: "Sandeep Reddy Vanga & Pranay Reddy Vanga" },
      { k: "Producer", v: "Pranay Reddy Vanga" },
      { k: "First film", v: "Arjun Reddy (2017)" },
      { k: "Latest release", v: "Animal (December 2023)" },
      { k: "Next", v: "Spirit, then Animal Park, per Pranay" },
    ],
    chapters: [
      {
        title: "The Origin",
        text: "Sandeep began the Arjun Reddy script in 2013 and spent years pitching it to producers who would not finance it. His brother Pranay said yes. Pranay and their father invested equally, and the family banner, Bhadrakali Pictures, was born.",
      },
      {
        title: "The Pairing",
        text: "Sandeep writes and directs, and on Animal he edited the film too. Pranay produces. Pranay has said the pace is slow on purpose, because Sandeep writes slowly and the team will not rush him into production.",
      },
      {
        title: "The Banner Today",
        text: "Bhadrakali now co-produces with T-Series on Animal and Spirit, with an Allu Arjun film announced alongside T-Series and Shiv Chanana as co-producer. It has also backed the Telugu film Romanchakam and, as Variety India reported, three small films with newcomers.",
      },
    ],
    films: [
      { title: "Arjun Reddy", year: "2017", lead: "Vijay Deverakonda", lang: "Telugu" },
      { title: "Animal", year: "2023", lead: "Ranbir Kapoor", lang: "5 languages" },
      { title: "Spirit", year: "Upcoming", lead: "Prabhas" },
    ],
  },
  {
    id: "t-series",
    name: "T-Series",
    led: "Bhushan Kumar & Krishan Kumar",
    since: "2019",
    logo: "/logos/t-series.png",
    image: "/images/production/t-series.jpg",
    pull: "The label that carried Arjun Reddy into Hindi and stayed for every Vanga film since.",
    facts: [
      { k: "Led by", v: "Bhushan Kumar & Krishan Kumar" },
      { k: "First film with Vanga", v: "Kabir Singh (2019)" },
      { k: "Collaborations", v: "Four, including the announced ones" },
      { k: "Latest release", v: "Animal (December 2023)" },
      { k: "Next", v: "Spirit" },
    ],
    chapters: [
      {
        title: "The Pairing",
        text: "Bhushan Kumar's T-Series produced Kabir Singh in 2019, the Hindi remake of Arjun Reddy. Animal was the second collaboration between Vanga and Bhushan Kumar, this time with Bhadrakali and Cine1Studios alongside.",
      },
      {
        title: "The Slate",
        text: "Spirit with Prabhas is the third collaboration. A film with Allu Arjun, announced in 2023 by T-Series and Bhadrakali, was named as the fourth.",
      },
    ],
    films: [
      { title: "Kabir Singh", year: "2019", lead: "Shahid Kapoor", lang: "Hindi" },
      { title: "Animal", year: "2023", lead: "Ranbir Kapoor", lang: "5 languages" },
      { title: "Spirit", year: "Upcoming", lead: "Prabhas" },
      { title: "Untitled", year: "Announced", lead: "Allu Arjun" },
    ],
  },
  {
    id: "cine1",
    name: "Cine1 Studios",
    led: "Murad Khetani",
    since: "2019",
    logo: "/logos/cine1-studios.png",
    image: "/images/production/cine1.jpg",
    pull: "Murad Khetani's studio, on board for the Hindi remake and for Animal.",
    facts: [
      { k: "Led by", v: "Murad Khetani" },
      { k: "First film with Vanga", v: "Kabir Singh (2019)" },
      { k: "Films with Vanga", v: "Kabir Singh, Animal" },
      { k: "Latest release", v: "Animal (December 2023)" },
    ],
    chapters: [
      {
        title: "The Pairing",
        text: "Cine1Studios produced Kabir Singh alongside T-Series and came back for Animal, which released in Hindi, Telugu, Tamil, Kannada and Malayalam.",
      },
    ],
    films: [
      { title: "Kabir Singh", year: "2019", lead: "Shahid Kapoor", lang: "Hindi" },
      { title: "Animal", year: "2023", lead: "Ranbir Kapoor", lang: "5 languages" },
    ],
  },
];

export const BANNER = PARTNERS[0];

export const TIMELINE: { year: string; label: string; image : string }[] = [
  { year: "2013", label: "Arjun Reddy script begins", image:"/images/arjun reddy.jpg"},
  { year: "2017", label: "Bhadrakali's first film, Arjun Reddy",image:"/images/arjun reddy.jpg" },
  { year: "2019", label: "T-Series & Cine1: Kabir Singh",image:"/images/animal.jpg" },
  { year: "2021", label: "Animal and Spirit announced",image:"/images/spirit poster.jpg" },
  { year: "2023", label: "Animal, in five languages",image:"/images/animal.jpg" },
  { year: "Next", label: "Spirit, then Animal Park",image:"/images/animal.jpg" },
];