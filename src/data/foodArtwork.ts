import thaiDishes from '../assets/food/thai-dishes.png?no-inline';
import proteinFoods from '../assets/food/protein-foods.png?no-inline';
import oats from '../assets/food/oats.webp?inline';
import rice from '../assets/food/rice.webp?inline';
import eggs from '../assets/food/eggs.webp?inline';
import tofu from '../assets/food/tofu.webp?inline';
import yogurt from '../assets/food/yogurt.webp?inline';
import milk from '../assets/food/milk.webp?inline';
import avocado from '../assets/food/avocado.webp?inline';
import oliveOil from '../assets/food/olive_oil.webp?inline';
import banana from '../assets/food/banana.webp?inline';
import almonds from '../assets/food/almonds_pile.webp?inline';

export type FoodArtwork = { src: string; column?: number; row?: number };

// The two local contact sheets contain six equal cells in reading order.
const sheet = (src: string, column: number, row: number): FoodArtwork => ({ src, column, row });
const artwork: Readonly<Record<string, FoodArtwork>> = {
  thai_dish_pad_krapow_pork_egg: sheet(thaiDishes, 0, 0),
  thai_dish_khao_man_gai: sheet(thaiDishes, 1, 0),
  thai_dish_pad_thai_shrimp: sheet(thaiDishes, 2, 0),
  thai_dish_khao_kha_mu: sheet(thaiDishes, 0, 1),
  thai_dish_boat_noodles_beef: sheet(thaiDishes, 1, 1),
  thai_dish_som_tum_thai: sheet(thaiDishes, 2, 1),
  'food-chicken-breast': sheet(proteinFoods, 0, 0),
  'food-salmon-atlantic': sheet(proteinFoods, 1, 0),
  'food-lean-beef': sheet(proteinFoods, 2, 0),
  'food-canned-tuna': sheet(proteinFoods, 0, 1),
  'food-whey-protein': sheet(proteinFoods, 1, 1),
  'food-sweet-potato': sheet(proteinFoods, 2, 1),
  'food-rolled-oats': { src: oats },
  'food-brown-rice': { src: rice },
  'food-eggs-large': { src: eggs },
  'food-tofu-firm': { src: tofu },
  'food-greek-yogurt': { src: yogurt },
  'food-whole-milk': { src: milk },
  'food-avocado': { src: avocado },
  'food-extra-virgin-olive-oil': { src: oliveOil },
  'food-banana-cavendish': { src: banana },
  'food-almonds-raw': { src: almonds }
};

export function getFoodArtwork(id: string): FoodArtwork | undefined {
  return artwork[id];
}
