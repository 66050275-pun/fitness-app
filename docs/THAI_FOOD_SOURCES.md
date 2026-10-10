# Thai foods and Open Food Facts

## Bundled Thai dish estimates

`src/data/thaiFoodCatalog.ts` contains six recipes using the nutrition numbers
supplied in the feature request on 10 October 2026. They are identified as
`dataProvenance.provider: user_estimate` and `calorieSource: manual`.

These figures have **not** been matched to individual records in the Mahidol
Thai Food Composition Database or Open Food Facts. The application displays
them as estimates; no measured glycemic index is assigned. Recipes, oil,
seasonings, and plate sizes can change the actual nutrition.

Each recipe has a basis of 100 g of prepared food. Protein, carbohydrate, fat,
and fibre are grams; sodium is milligrams. The first portion is the default
plate or bowl. Larger or smaller portions scale the same recipe by mass.
Skinless chicken and lean pork are not offered as size presets because those
recipe changes need their own nutrition records.

| Dish | Regular portion | Other sizes |
| --- | --- | --- |
| Pad Krapow Minced Pork with Fried Egg | 350 g | 450 g, 100 g |
| Hainanese Chicken Rice | 350 g | 450 g, 100 g |
| Pad Thai with Fresh Shrimp | 320 g | 420 g, 100 g |
| Braised Pork Leg on Rice | 380 g | 100 g |
| Thai Boat Noodles with Beef | 280 g | 120 g, 100 g |
| Som Tum Thai | 200 g | 100 g |

The catalog is bundled with the application and works offline. It is not
seeded into a second plaintext database. `ThaiFoodService.seedThaiFoods` is
available to integrations that explicitly need a seed callback; that callback
must use the application's encrypted persistence.

## Reference directories

- [Online Thai Food Composition Database, Mahidol Institute of Nutrition](https://inmu.mahidol.ac.th/thaifcd/)
- [Open Food Facts Thailand](https://th.openfoodfacts.org/)

These are reference directories, not citations for the six supplied estimates.
Before replacing an estimate with Thai FCD data, record the specific food
identifier, preparation, nutrition basis, retrieval date, and applicable reuse
permission. Public availability alone does not establish an open data licence.

## Optional Open Food Facts product search

`ThaiFoodService.searchOpenFoodFactsThailand` searches products explicitly
tagged as sold in Thailand. These are packaged products, not validated
restaurant recipes. The browser sends the requested food search directly to
Open Food Facts only when the user invokes that search. It sends no profile,
workout history, diary, credentials, or page referrer. Open Food Facts can see
the search and network address. No product images or tracking pixels are
loaded by the adapter.

The request asks for a limited set of fields, returns at most ten products,
has a 12-second timeout, and supports caller cancellation. HTTP, network, and
malformed-response errors are propagated so the UI can distinguish a failed
search from no matches. Query data and results remain in memory until a food
is selected; saving uses the existing encrypted vault.

Imported records include a stable barcode ID, the product page URL,
`dataProvenance.provider: open_food_facts`, an ISO retrieval time, and
`license: ODbL-1.0`. Missing or invalid nutrients remain `null`, including
missing energy. kJ energy is converted to kcal when kcal is unavailable.
Normalized OFF sodium is converted from grams to milligrams. An explicit
nutrition basis of 100 g or 100 ml takes priority over package units. Where
that declaration is absent, the adapter uses recorded package/serving units,
falling back to the normal 100 g basis. It does not assume a density to
convert between mass and volume.

Open Food Facts product information is contributed by its community and may
be incomplete or outdated. Check the package label where available.

### Attribution and reuse

Product data: **© Open Food Facts contributors**, available under the
[Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).
See [Open Food Facts terms of use](https://world.openfoodfacts.org/terms-of-use)
and [API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/).

Display the Open Food Facts attribution and product link alongside imported
food information. Preserve that metadata through encrypted save/reload and
exports. Public redistribution of an adapted database can carry ODbL
attribution and share-alike obligations. This feature does not import images;
their separate licence is not assumed to be the database licence.
