// Anticipation / curiosity Q&A, each tied to the gestational week it's about.
// General, reassuring info — not medical advice, and not copied from any book.
export interface FunFact { week: number; emoji: string; q: string; a: string; }

export const FUN_FACTS: FunFact[] = [
  { week: 6,  emoji: "💓", q: "When does the heartbeat start?", a: "A flickering heartbeat can often be seen on ultrasound around week 6, sometimes a little later. It's one of the first things you'll spot at an early scan." },
  { week: 8,  emoji: "🤸", q: "Is my baby moving yet?", a: "Tiny movements begin around weeks 7–8, but your baby is far too small for you to feel them this early." },
  { week: 10, emoji: "🎀", q: "When can we find out the sex?", a: "A cell-free DNA blood test (NIPT) can reveal sex as early as ~10 weeks. On ultrasound it's usually visible around the 18–20 week anatomy scan." },
  { week: 12, emoji: "🤢", q: "When will morning sickness ease up?", a: "For many people nausea starts to settle as the first trimester ends, around weeks 12–14 — though everyone is different." },
  { week: 13, emoji: "👣", q: "When will my baby have fingerprints?", a: "Unique little fingerprints form around weeks 13–16 and stay with your baby for life." },
  { week: 14, emoji: "🤰", q: "When will I start to show?", a: "First-time parents often begin showing between weeks 12 and 16. It can happen earlier in later pregnancies." },
  { week: 16, emoji: "🦋", q: "When will I start feeling my baby?", a: "Those first flutters — called quickening — usually arrive between weeks 16 and 22, and often earlier if you've been pregnant before. Early on they can feel like gas bubbles or popcorn." },
  { week: 18, emoji: "👂", q: "When can my baby hear me?", a: "Hearing develops around week 18, and by the third trimester your baby may recognize your voice and even calm to it." },
  { week: 20, emoji: "🎉", q: "When is the halfway point?", a: "Week 20 is the midpoint of a 40-week pregnancy — you're halfway there. It's also typically when the detailed anatomy scan happens." },
  { week: 21, emoji: "👅", q: "Can my baby taste what I eat?", a: "Taste buds develop early, and by the second trimester your baby can taste flavors from your meals through the amniotic fluid." },
  { week: 24, emoji: "🌱", q: "When is my baby considered 'viable'?", a: "Around week 24 is often described as the threshold of viability, when survival outside the womb becomes possible with intensive newborn care." },
  { week: 25, emoji: "🫧", q: "What are those little rhythmic jumps?", a: "Baby hiccups! Many people start feeling these rhythmic little twitches in the late second or third trimester. They're completely normal." },
  { week: 28, emoji: "👀", q: "When do my baby's eyes open?", a: "Eyelids, which fused shut earlier in pregnancy, reopen around week 28, and your baby can begin to sense light." },
  { week: 28, emoji: "🦶", q: "When should I start counting kicks?", a: "Many providers suggest paying attention to your baby's movements daily from around week 28. The kick counter in Tools makes it easy." },
  { week: 30, emoji: "🧠", q: "Can my baby dream?", a: "By the third trimester your baby has sleep and wake cycles, including REM sleep — so in a sense, they may be dreaming." },
  { week: 32, emoji: "🙃", q: "When will my baby settle head-down?", a: "Most babies move into a head-down position sometime around weeks 32–36, getting ready for birth." },
  { week: 36, emoji: "🎒", q: "When should I pack a hospital bag?", a: "Many people have a bag ready by around week 36, just in case your little one decides to arrive early." },
  { week: 37, emoji: "🍼", q: "When is my baby 'full term'?", a: "37 weeks is 'early term', and 39–40 weeks is 'full term'. Your baby keeps maturing right up to birth." },
  { week: 40, emoji: "📅", q: "Will my baby come on the due date?", a: "Only about 1 in 20 babies arrive on their exact due date — most show up within a couple of weeks on either side." },
  // earliest sex determination
  { week: 7, emoji: "🔬", q: "What's the earliest I can find out the sex?", a: "A blood test called NIPT (cell-free DNA) can reveal it as early as about 9 to 10 weeks by reading your baby's DNA from a sample of your blood - well before an ultrasound can tell." },
  // weight-gain expectations (general IOM/ACOG ranges, not personalized)
  { week: 8,  emoji: "🍃", q: "Should I be gaining weight yet?", a: "Not much - first-trimester gain is usually small, often just 1 to 5 lb total. Nausea can even keep it flat, and that's perfectly okay." },
  { week: 10, emoji: "⚖️", q: "How much weight will I gain overall?", a: "It depends on your starting weight, but a common guide is about 25 to 35 lb total for an average BMI (more if you started underweight, less if overweight). Most of it comes later in pregnancy." },
  { week: 12, emoji: "🌿", q: "Is it normal if I haven't gained weight?", a: "Early on, yes - especially with morning sickness. Your provider watches the trend over time, not any single week, so try not to fixate on the number." },
  { week: 17, emoji: "📈", q: "How fast should the weight come on now?", a: "In the second and third trimesters, slow and steady is the goal - roughly half a pound to a pound a week for an average BMI." },
  { week: 26, emoji: "🤍", q: "Where does all the pregnancy weight go?", a: "Only a few pounds are the baby. The rest is the placenta, extra blood and fluid, a larger uterus, amniotic fluid, growing breasts, and some fat stores for breastfeeding." },
];

import { writable } from "svelte/store";

// One dismissible fact per app open. Picked once per page load from a window
// around the current week (current + "about to be"), rotating each load via a
// stored cursor so it differs over time. No browse-all.
export const factDismissed = writable(false);

let _chosen: FunFact | null | undefined;
export function sessionFact(currentWeek: number): FunFact | null {
  if (_chosen !== undefined) return _chosen;
  const near = FUN_FACTS.filter((f) => f.week >= currentWeek - 1 && f.week <= currentWeek + 8);
  const upcoming = FUN_FACTS.filter((f) => f.week >= currentWeek);
  const pool = (near.length ? near : upcoming.length ? upcoming : FUN_FACTS).slice().sort((a, b) => a.week - b.week);
  let cursor = 0;
  try { cursor = parseInt(localStorage.getItem("baby.ff.cursor") || "0", 10) || 0; } catch {}
  _chosen = pool[cursor % pool.length] ?? null;
  try { localStorage.setItem("baby.ff.cursor", String(cursor + 1)); } catch {}
  return _chosen;
}
