import image0_1 from '@bryllim/workout-guide/assets/barbell-row/frame-1.png?inline';
import image0_3 from '@bryllim/workout-guide/assets/barbell-row/frame-3.png?inline';
import image1_1 from '@bryllim/workout-guide/assets/bench-press/frame-1.png?inline';
import image1_3 from '@bryllim/workout-guide/assets/bench-press/frame-3.png?inline';
import image2_1 from '@bryllim/workout-guide/assets/bicep-curl/frame-1.png?inline';
import image2_3 from '@bryllim/workout-guide/assets/bicep-curl/frame-3.png?inline';
import image3_1 from '@bryllim/workout-guide/assets/bulgarian-split-squat/frame-1.png?inline';
import image3_3 from '@bryllim/workout-guide/assets/bulgarian-split-squat/frame-3.png?inline';
import image4_1 from '@bryllim/workout-guide/assets/cable-lateral-raise/frame-1.png?inline';
import image4_3 from '@bryllim/workout-guide/assets/cable-lateral-raise/frame-3.png?inline';
import image5_1 from '@bryllim/workout-guide/assets/cable-woodchop/frame-1.png?inline';
import image5_3 from '@bryllim/workout-guide/assets/cable-woodchop/frame-3.png?inline';
import image6_1 from '@bryllim/workout-guide/assets/dip/frame-1.png?inline';
import image6_3 from '@bryllim/workout-guide/assets/dip/frame-3.png?inline';
import image7_1 from '@bryllim/workout-guide/assets/dumbbell-fly/frame-1.png?inline';
import image7_3 from '@bryllim/workout-guide/assets/dumbbell-fly/frame-3.png?inline';
import image8_1 from '@bryllim/workout-guide/assets/face-pull/frame-1.png?inline';
import image8_3 from '@bryllim/workout-guide/assets/face-pull/frame-3.png?inline';
import image9_1 from '@bryllim/workout-guide/assets/hammer-curl/frame-1.png?inline';
import image9_3 from '@bryllim/workout-guide/assets/hammer-curl/frame-3.png?inline';
import image10_1 from '@bryllim/workout-guide/assets/hanging-leg-raise/frame-1.png?inline';
import image10_3 from '@bryllim/workout-guide/assets/hanging-leg-raise/frame-3.png?inline';
import image11_1 from '@bryllim/workout-guide/assets/incline-dumbbell-press/frame-1.png?inline';
import image11_3 from '@bryllim/workout-guide/assets/incline-dumbbell-press/frame-3.png?inline';
import image12_1 from '@bryllim/workout-guide/assets/lat-pulldown/frame-1.png?inline';
import image12_3 from '@bryllim/workout-guide/assets/lat-pulldown/frame-3.png?inline';
import image13_1 from '@bryllim/workout-guide/assets/lateral-raise/frame-1.png?inline';
import image13_3 from '@bryllim/workout-guide/assets/lateral-raise/frame-3.png?inline';
import image14_1 from '@bryllim/workout-guide/assets/leg-curl/frame-1.png?inline';
import image14_3 from '@bryllim/workout-guide/assets/leg-curl/frame-3.png?inline';
import image15_1 from '@bryllim/workout-guide/assets/leg-press/frame-1.png?inline';
import image15_3 from '@bryllim/workout-guide/assets/leg-press/frame-3.png?inline';
import image16_1 from '@bryllim/workout-guide/assets/overhead-press/frame-1.png?inline';
import image16_3 from '@bryllim/workout-guide/assets/overhead-press/frame-3.png?inline';
import image17_1 from '@bryllim/workout-guide/assets/plank/frame-1.png?inline';
import image17_3 from '@bryllim/workout-guide/assets/plank/frame-3.png?inline';
import image18_1 from '@bryllim/workout-guide/assets/preacher-curl/frame-1.png?inline';
import image18_3 from '@bryllim/workout-guide/assets/preacher-curl/frame-3.png?inline';
import image19_1 from '@bryllim/workout-guide/assets/romanian-deadlift/frame-1.png?inline';
import image19_3 from '@bryllim/workout-guide/assets/romanian-deadlift/frame-3.png?inline';
import image20_1 from '@bryllim/workout-guide/assets/seated-calf-raise/frame-1.png?inline';
import image20_3 from '@bryllim/workout-guide/assets/seated-calf-raise/frame-3.png?inline';
import image21_1 from '@bryllim/workout-guide/assets/seated-row/frame-1.png?inline';
import image21_3 from '@bryllim/workout-guide/assets/seated-row/frame-3.png?inline';
import image22_1 from '@bryllim/workout-guide/assets/skull-crusher/frame-1.png?inline';
import image22_3 from '@bryllim/workout-guide/assets/skull-crusher/frame-3.png?inline';
import image23_1 from '@bryllim/workout-guide/assets/squat/frame-1.png?inline';
import image23_3 from '@bryllim/workout-guide/assets/squat/frame-3.png?inline';
import image24_1 from '@bryllim/workout-guide/assets/standing-calf-raise/frame-1.png?inline';
import image24_3 from '@bryllim/workout-guide/assets/standing-calf-raise/frame-3.png?inline';
import image25_1 from '@bryllim/workout-guide/assets/tricep-pushdown/frame-1.png?inline';
import image25_3 from '@bryllim/workout-guide/assets/tricep-pushdown/frame-3.png?inline';

export interface ExerciseArtwork {
  frames: readonly [string, string];
  sourceName: string;
  credit: string;
  sourceUrl: string;
  note?: string;
}
export const exerciseArtwork: Record<string, ExerciseArtwork> = {
  "Barbell Squat": { frames: [image23_1, image23_3], sourceName: "Squat", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0122-tension.svg" },
  "Bench Press": { frames: [image1_1, image1_3], sourceName: "Bench Press", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0042-tension.svg" },
  "Barbell Bench Press": { frames: [image1_1, image1_3], sourceName: "Bench Press", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0042-tension.svg" },
  "Lat Pulldown": { frames: [image12_1, image12_3], sourceName: "Lat Pulldown", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0093-tension.svg" },
  "Romanian Deadlift": { frames: [image19_1, image19_3], sourceName: "Romanian Deadlift", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0118-tension.svg" },
  "Plank": { frames: [image17_1, image17_3], sourceName: "Plank", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Incline Dumbbell Press": { frames: [image11_1, image11_3], sourceName: "Incline Dumbbell Press", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0061-tension.svg" },
  "Overhead Press": { frames: [image16_1, image16_3], sourceName: "Overhead Press", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Lateral Raise": { frames: [image13_1, image13_3], sourceName: "Lateral Raise", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0018-tension.svg" },
  "Triceps Pushdown": { frames: [image25_1, image25_3], sourceName: "Tricep Pushdown", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0205-tension.svg" },
  "Barbell Row": { frames: [image0_1, image0_3], sourceName: "Barbell Row", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0026-tension.svg" },
  "Seated Cable Row": { frames: [image21_1, image21_3], sourceName: "Seated Cable Row", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0025-tension.svg" },
  "Face Pull": { frames: [image8_1, image8_3], sourceName: "Face Pull", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Dumbbell Curl": { frames: [image2_1, image2_3], sourceName: "Bicep Curl", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0224-tension.svg" },
  "Leg Press": { frames: [image15_1, image15_3], sourceName: "Leg Press", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0127-tension.svg" },
  "Leg Curl": { frames: [image14_1, image14_3], sourceName: "Leg Curl", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0117-tension.svg" },
  "Standing Calf Raise": { frames: [image24_1, image24_3], sourceName: "Standing Calf Raise", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0282-tension.svg" },
  "Dumbbell Incline Fly": { frames: [image7_1, image7_3], sourceName: "Dumbbell Fly", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0056-tension.svg", note: "Incline bench variation of the dumbbell fly illustration." },
  "Dips (Chest / Triceps)": { frames: [image6_1, image6_3], sourceName: "Dip", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0172-tension.svg" },
  "Cable Lateral Raise": { frames: [image4_1, image4_3], sourceName: "Cable Lateral Raise", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Hammer Curl": { frames: [image9_1, image9_3], sourceName: "Hammer Curl", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0227-tension.svg" },
  "Preacher Curl": { frames: [image18_1, image18_3], sourceName: "Preacher Curl", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0236-tension.svg" },
  "Skull Crushers": { frames: [image22_1, image22_3], sourceName: "Skull Crusher", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0183-tension.svg" },
  "Bulgarian Split Squat": { frames: [image3_1, image3_3], sourceName: "Bulgarian Split Squat", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Hanging Leg Raise": { frames: [image10_1, image10_3], sourceName: "Hanging Leg Raise", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Cable Woodchopper": { frames: [image5_1, image5_3], sourceName: "Cable Woodchop", credit: "Bryl Lim", sourceUrl: "https://bryllim.github.io/workout-guide/" },
  "Seated Calf Raise": { frames: [image20_1, image20_3], sourceName: "Seated Calf Raise", credit: "Bryl Lim / Everkinetic", sourceUrl: "https://github.com/everkinetic/data/blob/main/dist/svg/0279-tension.svg" },
};

export function findExerciseArtwork(name: string): ExerciseArtwork | undefined {
  const normalized = name.trim().toLowerCase().replace(/[ -]+/g, ' ');
  return Object.entries(exerciseArtwork).find(([label]) => label.toLowerCase().replace(/[ -]+/g, ' ') === normalized)?.[1];
}
