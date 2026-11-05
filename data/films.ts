export type Credit = { role: string; names: string };

export type Film = {
  slug: string;
  title: string;
  year: string;
  src: string;
  language: string;
  release?: string;
  runtime?: string;
  status?: string;
  tagline: string;
  /** 1-2 lines, bottom-right of the section */
  short: string;
  /** drawer description */
  long: string;
  /** 3-4 rows, bottom-right of the section */
  micro: Credit[];
  /** full list, drawer */
  credits: Credit[];
};

export const FILMS: Film[] = [
  {
    slug: "arjun-reddy",
    title: "Arjun Reddy",
    year: "2017",
    src: "/images/films/arjun-reddy.jpg",
    language: "Telugu",
    release: "25 Aug 2017",
    runtime: "182 min",
    tagline: "He doesn't do halfway.",
    short: "A brilliant surgeon. A love he can't hold. He burns it all down, himself included.",
    long: "A gifted surgeon with a short fuse falls hard, then falls apart. Raw, loud and unapologetic about love and the wreckage it leaves behind. The debut that introduced a new voice.",
    micro: [
      { role: "Starring", names: "Vijay Deverakonda, Shalini Pandey" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Music", names: "Radhan" },
      { role: "Cinematography", names: "Raj Thota" },
    ],
    credits: [
      { role: "Starring", names: "Vijay Deverakonda, Shalini Pandey" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Writer", names: "Sandeep Reddy Vanga" },
      { role: "Cinematography", names: "Raj Thota, Nagesh Banell" },
      { role: "Editor", names: "Shashank Mali" },
      { role: "Music", names: "Songs: Radhan / Score: Harshavardhan Rameshwar" },
      { role: "Producer", names: "Pranay Reddy Vanga" },
      { role: "Banner", names: "Bhadrakali Pictures" },
    ],
  },
  {
    slug: "kabir-singh",
    title: "Kabir Singh",
    year: "2019",
    src: "/images/films/kabir-singh.jpg",
    language: "Hindi",
    release: "21 Jun 2019",
    runtime: "172 min",
    tagline: "Same fire. New language.",
    short: "The same fire, retold in Hindi. His Hindi-cinema debut.",
    long: "Arjun Reddy, retold for Hindi cinema. The same burning heart on a bigger stage, and his first film in Hindi.",
    micro: [
      { role: "Starring", names: "Shahid Kapoor, Kiara Advani" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Music", names: "Mithoon, Amaal Mallik, Vishal Mishra" },
      { role: "Cinematography", names: "Santhana Krishnan Ravichandran" },
    ],
    credits: [
      { role: "Starring", names: "Shahid Kapoor, Kiara Advani" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Cinematography", names: "Santhana Krishnan Ravichandran" },
      { role: "Editors", names: "Aarif Sheikh, Sandeep Reddy Vanga" },
      {
        role: "Music",
        names:
          "Score: Harshavardhan Rameshwar / Songs: Mithoon, Amaal Mallik, Vishal Mishra, Sachet-Parampara, Akhil Sachdeva",
      },
      { role: "Producers", names: "Murad Khetani, Ashwin Varde, Bhushan Kumar, Krishan Kumar" },
      { role: "Banner", names: "T-Series Films, Cine1 Studios" },
    ],
  },
  {
    slug: "animal",
    title: "Animal",
    year: "2023",
    src: "/images/films/animal.jpg",
    language: "Hindi",
    release: "1 Dec 2023",
    runtime: "201 min",
    tagline: "Devotion, taken to its edge.",
    short: "A son's devotion, pushed to its edge. No filter, no apology.",
    long: "A son's devotion to his father, pushed past every limit. Love, rage and obsession with the volume turned all the way up.",
    micro: [
      { role: "Starring", names: "Ranbir Kapoor, Anil Kapoor, Bobby Deol" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Music", names: "Score: Harshavardhan Rameshwar" },
      { role: "Cinematography", names: "Amit Roy" },
    ],
    credits: [
      {
        role: "Starring",
        names: "Ranbir Kapoor, Anil Kapoor, Bobby Deol, Rashmika Mandanna, Triptii Dimri",
      },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Screenplay", names: "Sandeep Reddy Vanga, Pranay Reddy Vanga, Saurabh Gupta" },
      { role: "Cinematography", names: "Amit Roy" },
      { role: "Editor", names: "Sandeep Reddy Vanga" },
      {
        role: "Music",
        names: "Score: Harshavardhan Rameshwar / Songs: Pritam, Vishal Mishra, Manan Bhardwaj, Jaani & more",
      },
      { role: "Producers", names: "Bhushan Kumar, Krishan Kumar, Murad Khetani, Pranay Reddy Vanga" },
      { role: "Banner", names: "T-Series Films, Bhadrakali Pictures, Cine1 Studios" },
    ],
  },
  {
    slug: "spirit",
    title: "Spirit",
    year: "2027",
    src: "/images/spirit-poster.jpg",
    language: "8 languages",
    release: "29 Oct 2027",
    status: "In production",
    tagline: "Two loud names. One film.",
    short: "Prabhas meets Vanga. A cop drama in eight languages, still in the making.",
    long: "Prabhas and Sandeep Reddy Vanga, together for the first time. A high-octane cop drama built for eight languages. Still in the making.",
    micro: [
      { role: "Starring", names: "Prabhas, Triptii Dimri, Vivek Oberoi" },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Written + Edited", names: "Sandeep Reddy Vanga" },
      { role: "Release", names: "29 Oct 2027" },
    ],
    credits: [
      {
        role: "Starring",
        names: "Prabhas, Triptii Dimri, Vivek Oberoi, Prakash Raj, Kanchana",
      },
      { role: "Director", names: "Sandeep Reddy Vanga" },
      { role: "Writer + Editor", names: "Sandeep Reddy Vanga" },
      {
        role: "Producers",
        names: "Bhushan Kumar, Pranay Reddy Vanga, Krishan Kumar, Prabhakar Reddy Vanga",
      },
      { role: "Banner", names: "T-Series, Bhadrakali Pictures" },
    ],
  },
];