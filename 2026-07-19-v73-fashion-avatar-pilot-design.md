# Famous or Forgotten — v73 Fashion Avatar Pilot Design

Date: 2026-07-19
Status: approved visual direction, waiting for final user review

## Goal
Replace the current simple SVG avatar in a new v73 build with one high-quality semi-realistic fashion avatar matching the approved dark runway/editorial reference.

## Pilot scope
- One adult male base avatar first.
- One body shape and one controlled front-facing pose.
- Three hairstyles.
- Separate wardrobe slots: top, bottom, jacket, shoes, bag, jewelry.
- Six old outfit presets remain usable by mapping them to slot combinations.
- Full-body view in Wardrobe and Character Creator.
- Bust crop in the sidebar.
- Existing career, money, projects, calendar, relationships, save/load, and quests remain unchanged.
- Old saves load through safe appearance migration.

## Visual target
- Semi-realistic fashion illustration, not a cartoon and not a photo.
- Long realistic legs, adult face, clear jaw, controlled pose.
- Dark luxury styling with visible leather, fabric, metal, and jewelry.
- Thin outlines and soft shading.
- The avatar should stay readable at full-body and sidebar sizes.

## Asset system
The avatar is built from aligned transparent layers on one fixed canvas:
1. body base
2. face base and facial details
3. back hair
4. top
5. bottom
6. shoes
7. jacket
8. front hair
9. bag
10. jewelry

Each item uses the same canvas size and anchor points, so switching an item does not move the body.

## Data model
The save stores item IDs, not rendered images:

```js
game.avatarV73 = {
  version: 1,
  base: "male_editorial_01",
  hair: "messy_01",
  top: "black_tee_01",
  bottom: "black_trouser_01",
  jacket: "leather_biker_01",
  shoes: "black_boot_01",
  bag: "none",
  jewelry: "layered_chain_01"
};
```

## Renderer
One public renderer is used everywhere:

```js
renderAvatarV73(avatarData, {
  mode: "full" | "bust" | "thumbnail",
  age: game.ageY
});
```

The pilot uses one adult age appearance. The API already accepts age so later v74 can add age stages without changing wardrobe code.

## Wardrobe behavior
- Clicking an item updates the preview immediately.
- Purchased and owned item logic stays compatible with the existing wardrobe economy.
- Old presets map to exact slot combinations.
- Unknown or missing item IDs fall back safely.
- Mix Outfit remains a single button and does not duplicate after rerenders.

## Save compatibility
- Do not overwrite v72.
- Create a new v73 HTML build.
- Preserve old custom fields during migration.
- Migration must not modify money, fame, projects, people, career, timeline, calendar, or quests.
- Saving and loading must reproduce the exact selected appearance.

## Pilot content
Hairstyles:
- messy runway
- slick back
- medium layered

Wardrobe minimum:
- 4 tops
- 3 bottoms
- 3 jackets
- 3 shoes
- 2 bags
- 3 jewelry options

## Testing
- Test every item ID and fallback.
- Test all old preset mappings.
- Test save → reload equality.
- Test full, bust, and thumbnail modes.
- Test Character Creator, sidebar, and Wardrobe use the same avatar data.
- Test existing game start, action buttons, projects, save/load, and screen navigation.
- Visual review: no cut head, floating hair, clothing gaps, broken hands, or item misalignment.

## Not included in v73 pilot
- Female base avatar.
- Multiple body types.
- Full ageing art stages.
- Hundreds of clothing items.
- Animated walking or city scenes.
- AI image generation during gameplay.

## Next phase after approval
v74 expands the approved base with age stages 16, 25, 45, 65, and 80, then adds the female base and more body types.
