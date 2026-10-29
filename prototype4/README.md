# Laundry Management · Prototype 4

Next.js App Router, React, TypeScript and Tailwind CSS. All demo data is persisted in localStorage; there are no API routes or database services. The interface uses a warm background, white workspace cards, green navigation and mint/yellow status treatments inspired by the Choreless dashboard design series. A simple top navbar and contextual tabs connect every screen, with a collapsible menu on tablets and phones. No backup files are created.

## Run

```sh
cd prototype4
npm install
npm run dev -- --port 3004
```

Open http://127.0.0.1:3004. For a production build, run `npm run build`, then `npm start -- --port 3004`.

## Included

- Dashboard; dispatch creation, drafts, history and locked confirmed records.
- Customer and delivery site creation, editing, searching and deactivation.
- Categories and item catalogue, image uploads, allowed quantity methods and default bundle sizes.
- Independent customer-owned and laundry-pool assignments for the same catalogue item.
- Multiple cart entries, internal UUIDs, optional cart references, comments and optional kg/lb weighing.
- Original quantities and bundle sizes, calculated equivalent pieces, and separate kg/lb linen quantities.
- Confirmation summary, immutable document snapshots, Admin cancellation with mandatory reasons, and activity history.
- A4 shipping manifest preview, CODE128 barcode, browser printing and Save as PDF through the print dialog.
- Five filtered reports and CSV downloads. Cancelled records are excluded by default.
- Admin and Operator demo roles. This is browser-side demonstration permission handling, not authentication.

The Alexandra Hotel example is available from the Dashboard's **Preview Shipping Manifest** button: 100 customer-owned pieces, 90 pool pieces, 190 equivalent pieces overall, and 12.5 kg separately. Two cart weighings total 34 kg tare, 90.5 kg gross and 56.5 kg net; these are independent of item quantities.

## Complete demo journey

1. As Admin, open **Customer List → Create Customer** and save a unique code and name. Use **Add Site** to enter a site name and delivery address.
2. In **Item Catalogue → Create Item**, create a unique item with pieces, bundles and weight enabled, and a bundle size of 10.
3. In **Customer-owned Linen**, select your customer and assign the item. In **Laundry Pool Linen**, enable the same item for the pool.
4. Switch to Operator. Open **Create Dispatch**, select the customer and site. In Cart 1 add 100 customer-owned pieces and 5 bundles of pool linen using 10 pieces per bundle. The same item appears separately for each ownership type.
5. Select **Add Cart**. Add 12.5 kg of customer-owned linen to Cart 2. Optional tare and gross values require both fields; gross must be at least tare.
6. **Save Draft**, open **Draft Dispatches**, then **Resume Draft**. All entries and original units remain available.
7. **Confirm Dispatch**, review the summary, and select **Confirm Linen Out**. The record is locked.
8. Open **Print Preview / Reprint**, then **Print / Save as PDF**. Select A4 portrait and the printer or Save as PDF. Printing is read-only.
9. Close preview. In **Dispatch History**, filter by customer, date, document number or cart reference, and select **Reprint**.
10. Switch to Admin, open the record and select **Cancel Dispatch**. Enter a reason. In **Reports**, filter to the customer: operational quantities now exclude the cancelled record. Enable **Include cancelled records** to inspect it.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Tests cover mixed ownership, bundle conversion, incompatible units, cart-weight counting, validations, stale drafts, duplicate confirmation, immutable snapshots, cancellation and CSV handling. A persistence integration test exercises setup, a multi-cart dispatch, saving/reopening, confirmation, rendering/reprinting the manifest, history filtering and report updates after cancellation. It uses an isolated in-memory localStorage adapter and does not change the browser's demo data.

The build and HTTP readiness check are verified. Interactive browser/print-dialog and visual checks were unavailable in this session because browser access was denied and the in-app browser provider was unavailable.

## Structure

- `lib/types.ts`: models and contracts.
- `lib/domain.ts`: validation, document transitions, totals, filters and CSV serialization.
- `lib/repository.ts`: localStorage repository boundary; replace this adapter to connect a backend.
- `lib/seed.ts`: demonstration records, seeded once on first load using the browser's date.
- `components/`: operational screens and printable document.
- `components/Navbar.tsx`: responsive top navigation and section tabs.
- `components/Dashboard.tsx`: live daily metrics, recent records and workflow shortcuts.
- `app/globals.css`: Tailwind theme and shared component styles.
- `app/print.css`: separate A4 document layout and print visibility.

Browser storage key: `laundry.prototype4.v1`. Clearing that origin's localStorage reseeds the demonstration on the next reload. Data remains on the current browser/origin. No stock availability, incoming linen, balances, prices or invoicing are implemented.
