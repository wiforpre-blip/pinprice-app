# PinPrice — Project Direction

PinPrice is a mobile-first utility app for online sellers who need to add price and status tags onto product photos quickly.

## Positioning

A fast visual price tagging tool for sellers who sell multiple items in one image.

Not a general photo editor.
Not a marketplace.
Not an inventory system.
Not an AI-first app.

## Target Users

Initial target users:
- TCG card sellers
- Collectibles sellers
- Second-hand clothing sellers
- Shoes / denim / accessories sellers
- Live sale sellers
- Online sellers who post product photos in Facebook groups, LINE groups, or social channels

## Core Problem

Sellers often have one photo with many items. They need to show:
- price
- sold status
- reserved status

Existing tools like Canva, Phonto, PicsArt, or story editors can do this manually, but they are slow because sellers must create and position each text label one by one.

## Core Value

PinPrice should make this flow faster:

Take or choose photo → tap item → add price/status tag → adjust position → export/share.

## MVP Scope

MVP includes:
- Choose image from device
- Take photo
- Add price tag by tapping on image
- Edit tag text
- Drag tag position
- Delete tag
- Undo at least 1 step
- Tag types:
  - Price
  - Sold
  - Reserved
- Quick status change:
  - long press tag to enter multi-select mode
  - tap tag to edit or change status
- Pinch-to-zoom on the photo for accurate tag placement
- Preview before export
- Save image to gallery
- Share exported image
- Basic style presets by tag type

## Out of Scope for MVP

Do not build these in MVP:
- User accounts
- Login
- Backend
- Supabase
- Cloud sync
- Recent project state restore
- Web support
- AI item detection
- Inventory system
- Marketplace
- Payment
- Subscription
- Template marketplace

## Product Principles

- Mobile-first
- Fast before fancy
- Seller workflow first
- Reduce taps
- Avoid becoming Canva
- Tag types must be semantic, not only visual styles
- Price, Sold, and Reserved must keep separate styling logic
- Export must match what the user sees in the editor
- The app should remember lightweight settings only, such as last used style

## MVP Screens

1. Home
   - Take photo
   - Choose photo

2. Editor
   - Image canvas
   - Add tag
   - Drag/edit/delete tag
   - Undo
   - Style
   - Preview

3. Tag editor
   - Price text
   - Tag type: Price / Sold / Reserved
   - Confirm / Delete

4. Preview / Export
   - Preview final image
   - Save
   - Share

## Technical Direction

Use:
- React Native + Expo
- TypeScript
- Expo Router
- Local-first state
- No backend for MVP

Likely libraries:
- expo-image-picker
- expo-camera
- expo-image
- react-native-gesture-handler
- react-native-reanimated
- react-native-view-shot
- expo-media-library

## Development Strategy

Build in phases:
1. Static UI shell
2. Image picker and editor screen
3. Add/edit/delete tags
4. Drag tags
5. Tag type logic
6. Undo
7. Preview/export
8. Save/share
9. Polish and test on real devices
