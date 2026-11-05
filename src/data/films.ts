export interface FilmCredit {
  role: string;
  names: string;
}

export interface FilmMicro {
  role: string;
  names: string;
}

export interface CastMember {
  actor: string;
  character: string;
  roleType?: string;
}

export interface FilmProduction {
  banner: string;
  producers: string;
  budget?: string;
  boxOffice?: string;
  locations?: string;
  certification?: string;
}

export interface Film {
  title: string;
  year: string;
  src: string;
  language: string;
  release: string;
  runtime: string;
  status: string;
  tagline: string;
  short: string;
  paragraphs: string[];
  long: string;
  micro: FilmMicro[];
  credits: FilmCredit[];
  cast: CastMember[];
  production: FilmProduction;
  trivia?: string[];
}

export const FILMS: Film[] = [
  {
    title: "Arjun Reddy",
    year: "2017",
    src: "/images/films/arjun reddy.jpg",
    language: "Telugu",
    release: "25 August 2017",
    runtime: "182 min",
    status: "Cult Classic · Debut Feature",
    tagline: "He is rogue, violent, intense, and hopelessly in love.",
    short:
      "A fiercely unconventional, raw, and unfiltered love story tracking the self-destructive spiral and redemption of an elite orthopedic surgeon.",
    paragraphs: [
      "Dr. Arjun Reddy Deshmukh is a top-ranking house surgeon at St. Mary's Medical College whose extraordinary surgical acumen is matched only by his explosive temper. When his junior and soulmate, Preethi Shetty, is forced by her orthodox family into an arranged marriage with another man, Arjun's universe collapses into a downward spiral of chronic substance abuse, clinical malpractice allegations, and primal emotional anguish.",
      "Written, directed, and edited by Sandeep Reddy Vanga, the film rebelled against the sanitized conventions of commercial Telugu cinema. Vanga anchored the narrative in real-time conversations, unbroken master shots, and unapologetic character vulnerability. Vijay Deverakonda's feral, volatile performance coupled with Harshavardhan Rameshwar's electric acoustic score gave Indian cinema an anti-hero whose pain felt intensely authentic.",
      "Produced on a modest budget of ₹4 crore by Pranay Reddy Vanga under Bhadrakali Pictures, the film grossed over ₹51 crore worldwide, delivering a monumental 10x return on investment. Arjun Reddy became an immediate cultural watershed, winning multiple Filmfare Awards South and fundamentally resetting modern Indian romance.",
    ],
    long:
      "Arjun Reddy broke Telugu cinema conventions on arrival. Built on a grounded aesthetic, long uncut takes, and an unapologetic portrayal of anger and emotional devastation, Sandeep Reddy Vanga's debut film redefined modern Indian romantic storytelling.",
    micro: [
      { role: "Starring", names: "Vijay Deverakonda, Shalini Pandey" },
      { role: "Music", names: "Radhan · Harshavardhan Rameshwar" },
      { role: "Craft", names: "Direction, Screenplay & Film Editing" },
    ],
    credits: [
      { role: "Director & Screenplay", names: "Sandeep Reddy Vanga" },
      { role: "Editor", names: "Sandeep Reddy Vanga" },
      { role: "Cinematography", names: "Raju Thota" },
      { role: "Music (Songs)", names: "Radhan" },
      { role: "Original Score", names: "Harshavardhan Rameshwar" },
      { role: "Sound Design", names: "Sachin Sudhakaran (Sync Cinema)" },
      { role: "Costume Design", names: "Harmann Kaur" },
      { role: "Art Direction", names: "Gowtham Nerusu" },
    ],
    cast: [
      { actor: "Vijay Deverakonda", character: "Dr. Arjun Reddy Deshmukh", roleType: "Protagonist" },
      { actor: "Shalini Pandey", character: "Dr. Preethi Shetty", roleType: "Female Lead" },
      { actor: "Rahul Ramakrishna", character: "Shiva", roleType: "Loyal Best Friend" },
      { actor: "Jia Sharma", character: "Jia Sharma", roleType: "Actress & Patient" },
      { actor: "Sanjay Swaroop", character: "Dhanunjay Reddy Deshmukh", roleType: "Arjun's Father" },
      { actor: "Kamal Kamaraju", character: "Gautam Reddy Deshmukh", roleType: "Elder Brother" },
      { actor: "Kanchana", character: "Grandmother", roleType: "Arjun's Confidante" },
      { actor: "Gopinath Bhat", character: "Devdas Shetty", roleType: "Preethi's Father" },
      { actor: "Priyadarshi Pulikonda", character: "VIP Lawyer", roleType: "Cameo" },
    ],
    production: {
      banner: "Bhadrakali Pictures",
      producers: "Pranay Reddy Vanga",
      budget: "₹4.5 Crore",
      boxOffice: "₹51.0 Crore (Global Gross)",
      locations: "Hyderabad, Mangalore, Dehradun, New Delhi, Italy",
      certification: "A (Adults Only) · CBFC India",
    },
    trivia: [
      "Sandeep Reddy Vanga worked on the script for over two years, pitching to multiple producers before founding Bhadrakali Pictures with his brother Pranay.",
      "The entire Italy portion was shot with a lean crew of less than 15 members to capture intimate European realism.",
      "Harshavardhan Rameshwar composed the background score in a record 14 days, creating the iconic guitar and whistle themes that became a cultural sensation.",
    ],
  },
  {
    title: "Kabir Singh",
    year: "2019",
    src: "/images/films/kabir sigh.jpg",
    language: "Hindi",
    release: "21 June 2019",
    runtime: "172 min",
    status: "All-Time Blockbuster (₹379+ Cr)",
    tagline: "A storm of uncontrolled passion and fierce longing.",
    short:
      "The Hindi adaptation that took the country by storm, capturing the raw intensity of a heartbroken genius surgeon spiraling through grief.",
    paragraphs: [
      "Following the thunderous legacy of Arjun Reddy, Kabir Singh transported the narrative to the sprawling medical campuses of Delhi and Mumbai. Shahid Kapoor stepped into the shoes of Dr. Kabir Rajdheer Singh, delivering a powerhouse performance that captured the unbearable gravity of romantic separation and unchecked self-destruction.",
      "Sandeep Reddy Vanga maintained an unyielding creative grip over the Hindi adaptation, refusing industry pressure to soften Kabir's flawed psychological edges. The narrative was elevated by an all-time multi-platinum soundtrack featuring Mithoon, Sachet–Parampara, and Vishal Mishra, with anthems like 'Bekhayali' and 'Tujhe Kitna Chahne Lage' becoming defining youth anthems of the decade.",
      "Co-produced by T-Series Films and Cine1 Studios with a budget of ₹60 crore, Kabir Singh grossed a staggering ₹379 crore worldwide, emerging as the second highest-grossing Hindi film of 2019. It proved that Vanga's director-driven, visceral storytelling resonated with equal ferocity across the Hindi heartland and global diaspora.",
    ],
    long:
      "Refusing to sanitize the source material for mainstream Bollywood sensibilities, Sandeep Reddy Vanga delivered an incendiary, record-breaking blockbuster that dominated cultural conversations and solidified his status as an uncompromising pan-Indian filmmaker.",
    micro: [
      { role: "Starring", names: "Shahid Kapoor, Kiara Advani" },
      { role: "Music", names: "Mithoon, Amaal Mallik, Vishal Mishra" },
      { role: "Craft", names: "Direction & Screenplay" },
    ],
    credits: [
      { role: "Director & Screenplay", names: "Sandeep Reddy Vanga" },
      { role: "Dialogue (Hindi)", names: "Siddharth–Garima" },
      { role: "Cinematography", names: "Santhana Krishnan Ravichandran" },
      { role: "Original Score", names: "Harshavardhan Rameshwar" },
      { role: "Music Directors", names: "Mithoon, Amaal Mallik, Vishal Mishra, Sachet–Parampara, Akhil Sachdeva" },
      { role: "Editor", names: "Aarif Sheikh" },
      { role: "Production Design", names: "Mansi Dhruv Mehta" },
      { role: "Producers", names: "Bhushan Kumar, Murad Khetani, Krishan Kumar, Ashwin Varde" },
    ],
    cast: [
      { actor: "Shahid Kapoor", character: "Dr. Kabir Rajdheer Singh", roleType: "Protagonist" },
      { actor: "Kiara Advani", character: "Dr. Preeti Sikka", roleType: "Female Lead" },
      { actor: "Soham Majumdar", character: "Shiva", roleType: "Kabir's Loyal Friend" },
      { actor: "Arjan Bajwa", character: "Karan Rajdheer Singh", roleType: "Elder Brother" },
      { actor: "Suresh Oberoi", character: "Rajdheer Singh", roleType: "Kabir's Father" },
      { actor: "Kamini Kaushal", character: "Sadhna Kaur", roleType: "Grandmother" },
      { actor: "Adil Hussain", character: "College Dean", roleType: "Authority Figure" },
      { actor: "Nikita Dutta", character: "Jiah Sharma", roleType: "Film Actress" },
    ],
    production: {
      banner: "T-Series Films & Cine1 Studios",
      producers: "Bhushan Kumar, Murad Khetani, Krishan Kumar, Ashwin Varde",
      budget: "₹60.0 Crore",
      boxOffice: "₹379.0 Crore (Global Gross)",
      locations: "Mumbai, Delhi, Mussoorie",
      certification: "A (Adults Only) · CBFC India",
    },
    trivia: [
      "Shahid Kapoor spent months visiting medical hospitals to understand surgical procedures and surgeon mannerisms.",
      "The album generated over 5 billion cumulative music streams across digital platforms, becoming one of Indian cinema's biggest musical hits.",
      "The film ran for over 100 days in several North Indian cinema halls despite initial critical controversies.",
    ],
  },
  {
    title: "Animal",
    year: "2023",
    src: "/images/films/animal.jpg",
    language: "Hindi / Multi-lingual",
    release: "01 December 2023",
    runtime: "204 min",
    status: "Global Phenomenon (₹917+ Cr)",
    tagline: "When a son's love for his father turns feral.",
    short:
      "A visceral, generational psychological crime saga chronicling the ruthless metamorphosis of a devoted son defending his father's industrial empire.",
    paragraphs: [
      "Conceived as an unapologetic, three-and-a-half-hour generational crime epic, Animal dissects the toxic, obsessive devotion of a son toward his emotionally unreachable industrialist father. When an assassination attempt leaves Balbir Singh critically wounded, Ranvijay Singh undergoes a savage metamorphosis, plunging into an uninhibited, blood-soaked war of vengeance against global adversaries.",
      "Sandeep Reddy Vanga executed the monumental project with audacious cinematic authority, serving as director, writer, and editor. The film introduced groundbreaking set-pieces including the iconic 18-minute pre-interval axe-machine gun battle orchestrated against eclectic musical choices ranging from Iranian folk melody 'Jamal Kudu' to thunderous Punjabi war chants by Bhupinder Babbal.",
      "Starring Ranbir Kapoor in a feral, career-defining dual role alongside Anil Kapoor and a menacingly mute Bobby Deol, Animal became a global box office juggernaut, shattering records to accumulate over ₹917 crore worldwide. It stands as the third highest-grossing Indian film of 2023 and solidified Vanga's reputation as one of Indian cinema's boldest visionaries.",
    ],
    long:
      "Unapologetic, ferocious, and operating on an epic cinematic scale, Animal proved Sandeep Reddy Vanga's mastery of narrative pacing, audacious sound design, and character conviction. Running over three hours and twenty minutes, the film shattered box-office milestones across the world.",
    micro: [
      { role: "Starring", names: "Ranbir Kapoor, Anil Kapoor, Rashmika, Bobby Deol" },
      { role: "Music", names: "Pritam, JAM8, Harshavardhan Rameshwar" },
      { role: "Craft", names: "Direction, Screenplay & Film Editing" },
    ],
    credits: [
      { role: "Director & Screenplay", names: "Sandeep Reddy Vanga" },
      { role: "Editor", names: "Sandeep Reddy Vanga" },
      { role: "Cinematography", names: "Amit Roy" },
      { role: "Background Score", names: "Harshavardhan Rameshwar" },
      { role: "Songs", names: "JAM8, Vishal Mishra, Jaani, Manan Bhardwaj, Shreyas Puranik, Bhupinder Babbal" },
      { role: "Action Directors", names: "Supreme Sundar" },
      { role: "Production Design", names: "Suresh Selvarajan" },
      { role: "Sound Design", names: "Sachin Sudhakaran, Hariharan M" },
      { role: "Producers", names: "Bhushan Kumar, Pranay Reddy Vanga, Krishan Kumar, Murad Khetani" },
    ],
    cast: [
      { actor: "Ranbir Kapoor", character: "Ranvijay Singh / Aziz Haque", roleType: "Dual Role Protagonist / Antagonist" },
      { actor: "Anil Kapoor", character: "Balbir Singh / Kailash Petkar", roleType: "Father / Lookalike" },
      { actor: "Rashmika Mandanna", character: "Geetanjali Singh", roleType: "Ranvijay's Wife" },
      { actor: "Bobby Deol", character: "Abrar Haque", roleType: "Mute Nemesis" },
      { actor: "Triptii Dimri", character: "Zoya Riaz", roleType: "Mole / Lover" },
      { actor: "Charu Shankar", character: "Jyoti Singh", roleType: "Mother" },
      { actor: "Babloo Prithiveeraj", character: "Asrar Haque", roleType: "Elder Brother of Abrar" },
      { actor: "Shakti Kapoor", character: "PK Mishra", roleType: "Swastik Steel COO" },
      { actor: "Suresh Oberoi", character: "Dadaji", roleType: "Grandfather" },
      { actor: "Prem Chopra", character: "Bade Dadaji", roleType: "Family Patriarch" },
    ],
    production: {
      banner: "T-Series Films, Bhadrakali Pictures & Cine1 Studios",
      producers: "Bhushan Kumar, Pranay Reddy Vanga, Krishan Kumar",
      budget: "₹100.0 Crore",
      boxOffice: "₹917.8 Crore (Global Gross)",
      locations: "Manali, Mumbai, Delhi, Pataudi Palace, Scotland, England",
      certification: "A (Adults Only) · CBFC India",
    },
    trivia: [
      "The custom 500-kg war machine gun featured in the interval action sequence took four months to design and fabricate using genuine steel alloy.",
      "Bobby Deol's entry song 'Jamal Kudu' is a vintage 1950s Iranian chorus track discovered and rearranged specifically by Vanga.",
      "The post-credits sequence teasing Aziz Haque and Animal Park was conceived during the final editing stage in Mumbai.",
    ],
  },
  {
    title: "Spirit",
    year: "2026",
    src: "/images/films/spirit poster.jpg",
    language: "Telugu / Multi-lingual",
    release: "Upcoming",
    runtime: "TBA",
    status: "In Pre-Production · Magnum Opus",
    tagline: "A relentless cop. An unyielding moral crucible.",
    short:
      "A dark, intense action-thriller plunging into the brutal psyche of an uncompromising police officer confronting ruthless criminal underbellies.",
    paragraphs: [
      "Marking the monumental collaboration between Sandeep Reddy Vanga and Rebel Star Prabhas, Spirit plunges headfirst into the brutal, morally ambiguous psyche of an unbending police officer. Far removed from cinematic tropes of glorification, the narrative examines the psychological toll of institutional corruption and organized cartel wars on a deeply conflicted protagonist.",
      "Backed by T-Series Films and Bhadrakali Pictures on a colossal budget exceeding ₹300 crore, Spirit is planned as a pan-world theatrical spectacle across Telugu, Hindi, Tamil, Malayalam, Kannada, and international languages. The project brings Vanga's intense character conviction and signature sound design to a sprawling canvas of high-octane police procedural action.",
      "With music composed by Harshavardhan Rameshwar and Vanga at the editing table, Spirit is poised to push the envelope of raw action cinema, promising relentless pacing, brutal hand-to-hand combat choreography, and an uncompromising exploration of law enforcement.",
    ],
    long:
      "A raw, relentless cop thriller exploring the unyielding moral and psychological limits of institutional justice under ruthless criminal pressure.",
    micro: [
      { role: "Starring", names: "Rebel Star Prabhas" },
      { role: "Music", names: "Harshavardhan Rameshwar" },
      { role: "Craft", names: "Direction, Screenplay & Film Editing" },
    ],
    credits: [
      { role: "Director & Screenplay", names: "Sandeep Reddy Vanga" },
      { role: "Editor", names: "Sandeep Reddy Vanga" },
      { role: "Original Score", names: "Harshavardhan Rameshwar" },
      { role: "Producers", names: "Bhushan Kumar, Pranay Reddy Vanga" },
      { role: "Banner", names: "T-Series Films & Bhadrakali Pictures" },
    ],
    cast: [
      { actor: "Rebel Star Prabhas", character: "IPS Officer", roleType: "Protagonist" },
      { actor: "To be announced", character: "Antagonist / Key Ensemble", roleType: "Cast in finalization" },
    ],
    production: {
      banner: "T-Series & Bhadrakali Pictures",
      producers: "Bhushan Kumar, Pranay Reddy Vanga",
      budget: "₹300+ Crore (Estimated)",
      boxOffice: "Awaiting Theatrical Release",
      locations: "Hyderabad, International Schedules",
      certification: "A (Expected)",
    },
    trivia: [
      "Prabhas personally praised the bound script as one of the most intense and original cop narratives in Indian cinema history.",
      "The film marks Sandeep Reddy Vanga's 4th directorial venture and his highest-budgeted project to date.",
    ],
  },
];
