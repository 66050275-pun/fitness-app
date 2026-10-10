import { exerciseLabel } from '../../i18n/fitnessLabels.ts';
import { tr, trHtml } from '../../i18n/index.ts';
import { muscleLabels, musclesForExercise, type Muscle } from '../../data/exerciseMuscles';
import { escapeHtml } from '../../utils/sanitize';

// Original schematic SVG: symmetric regions, with space between each muscle group.
function body(view: 'front' | 'back', active: Set<Muscle>): string {
  const region = (key: Muscle, d: string) => `<path d="${d}" class="muscle-map-region${active.has(key) ? ' is-active' : ''}" stroke-width="2" stroke-linejoin="round"><title>${trHtml(muscleLabels[key])}${active.has(key) ? tr("— ใช้ในโปรแกรมนี้") : ''}</title></path>`;
  const pair = (key: Muscle, d: string) => region(key, d) + `<g transform="translate(200 0) scale(-1 1)">${region(key, d)}</g>`;
  const arms = view === 'front'
    ? pair('frontDelts', 'M69 65 Q52 62 47 82 L43 101 Q57 104 65 86 Z') + pair('biceps', 'M43 105 Q52 108 60 99 L53 133 Q48 147 36 145 Z')
    : pair('rearDelts', 'M69 65 Q52 62 47 82 L43 101 Q57 104 65 86 Z') + pair('triceps', 'M43 105 Q52 108 60 99 L53 133 Q48 147 36 145 Z');
  const torso = view === 'front'
    ? pair('chest', 'M96 71 L71 68 L64 88 Q72 110 96 103 Z')
      + pair('abs', 'M97 109 L82 109 L84 124 L97 124 Z M97 129 L85 129 L85 144 L97 144 Z M97 149 L85 149 L89 167 L97 176 Z')
      + pair('obliques', 'M66 108 L78 111 L81 144 L86 169 L73 162 L65 135 Z')
      + pair('hipFlexors', 'M73 167 L84 175 L94 184 L78 199 L68 184 Z')
    : pair('traps', 'M91 54 L97 62 L97 100 L75 82 L68 68 Z')
      + pair('midBack', 'M72 89 L95 108 L95 133 L80 125 L69 109 Z')
      + pair('lats', 'M65 100 L75 126 L91 141 L84 159 L70 151 L63 124 Z')
      + pair('lowerBack', 'M97 137 L90 144 L87 163 L97 174 Z')
      + pair('glutes', 'M72 163 L85 170 L97 181 L96 210 Q75 222 64 203 L66 179 Z');
  const legs = view === 'front'
    ? pair('quads', 'M65 199 L78 205 L89 193 L93 218 L87 257 L77 283 L66 281 L60 243 Z')
      + pair('adductors', 'M96 199 L95 241 L88 261 L91 221 Z')
      + pair('calves', 'M66 293 L78 294 L84 307 L76 346 L68 364 L61 360 L59 329 Z')
    : pair('hamstrings', 'M64 215 L78 223 L95 214 L92 246 L80 282 L66 280 L60 245 Z')
      + pair('calves', 'M66 292 L79 294 Q90 312 78 339 L69 364 L61 359 L58 325 Z');
  return `<svg viewBox="0 0 200 405" role="img" aria-label="${trHtml("กล้ามเนื้อ")}${view === 'front' ? tr("ด้านหน้า") : tr("ด้านหลัง")} ${trHtml("ส่วนสีแดงคือกล้ามเนื้อที่ใช้ในโปรแกรม")}">
    <g class="muscle-map-outline" stroke-width="1.2">
      <path d="M100 8 Q80 8 80 29 Q80 46 90 50 L89 57 L66 64 Q49 64 44 82 L32 137 L22 173 L15 190 L18 205 L27 203 L36 181 L46 157 L57 124 L64 143 L66 164 L60 204 L55 244 L61 282 L54 322 L58 365 L55 386 L76 389 L80 380 L75 362 L89 317 L88 287 L98 250 L100 222 L102 250 L112 287 L111 317 L125 362 L120 380 L124 389 L145 386 L142 365 L146 322 L139 282 L145 244 L140 204 L134 164 L136 143 L143 124 L154 157 L164 181 L173 203 L182 205 L185 190 L178 173 L168 137 L156 82 Q151 64 134 64 L111 57 L110 50 Q120 46 120 29 Q120 8 100 8 Z"/>
    </g>${torso}${arms}${pair('sideDelts', 'M48 75 L45 95 L40 105 L40 88 Z')}${pair('forearms', 'M35 151 L46 151 L37 176 L29 190 L24 184 Z')}${legs}
  </svg>`;
}

export function renderWorkoutMuscleMap(exercises: readonly { name: string }[]): string {
  const active = new Set<Muscle>();
  const unknown: string[] = [];
  const rows = exercises.map(exercise => {
    const muscles = musclesForExercise(exercise.name);
    if (!muscles) unknown.push(exercise.name);
    muscles?.forEach(m => active.add(m));
    return `<li><strong>${escapeHtml(exerciseLabel(exercise.name))}</strong><span>${muscles ? muscles.map(m => tr(muscleLabels[m])).join(' · ') : tr("ยังไม่มีข้อมูลกล้ามเนื้อสำหรับท่านี้")}</span></li>`;
  }).join('');
  return `<section class="workout-muscle-map" aria-label="${trHtml("กล้ามเนื้อที่ใช้ในโปรแกรม")}">
    <div class="muscle-map-heading"><span class="material-symbols-outlined" aria-hidden="true">accessibility_new</span><h2>${trHtml("กล้ามเนื้อที่ใช้ในโปรแกรม")}</h2></div>
    <p class="muscle-map-description">${trHtml("รวมกล้ามเนื้อหลักและกล้ามเนื้อช่วยจากทุกท่าที่เลือก")}</p>
    <div class="muscle-map-bodies"><figure>${body('front', active)}<figcaption>${trHtml("ด้านหน้า · Front")}</figcaption></figure><figure>${body('back', active)}<figcaption>${trHtml("ด้านหลัง · Back")}</figcaption></figure></div>
    <div class="muscle-map-legend"><span><i class="muscle-map-red"></i>${trHtml("ใช้ในโปรแกรมนี้")}</span><span><i class="muscle-map-gray"></i>${trHtml("ไม่ได้ระบุในโปรแกรม")}</span></div>
    <div class="muscle-map-tags">${[...active].map(m => `<span>${trHtml(muscleLabels[m])}</span>`).join('') || `<span>${trHtml("เพิ่มท่าเพื่อแสดงกล้ามเนื้อ")}</span>`}</div>
    ${unknown.length ? `<p class="muscle-map-description">${trHtml("ยังไม่รวมท่าที่ไม่มีข้อมูล:")} ${unknown.map(escapeHtml).join(', ')}</p>` : ''}
    <details><summary>${trHtml("ดูว่าแต่ละท่าใช้กล้ามเนื้อส่วนไหน")}</summary><ul>${rows}</ul></details>
    <p class="muscle-map-note">${trHtml("ภาพแผนผัง 2 มิติแบบย่อ ไม่แสดงระดับความหนักหรือกล้ามเนื้อพยุงทั้งหมด การใช้งานจริงขึ้นอยู่กับท่า เทคนิค และช่วงการเคลื่อนไหว")}</p>
  </section>`;
}
