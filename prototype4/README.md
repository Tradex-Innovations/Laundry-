# Laundry Management · Prototype 4

Next.js App Router, React, TypeScript and Tailwind CSS. All demo data is persisted in localStorage; there are no API routes or database services. The interface uses a light frosted-glass theme over soft teal and blue gradients. Navigation, dashboard cards and outer panel frames share translucent surfaces, bright edges and gentle shadows; tables, keypads and entry controls stay solid and readable. The operator home screen has six large action tiles with short descriptions, without statistics or activity panels. Touch keypads and spacious controls serve floor operations. Receiving and packing use frosted panel frames with white data areas and a frosted action bar that stays visible on desktop and tablet and stacks in the page on mobile. The Admin (laundry owner) dashboard retains daily statistics, detailed workflow cards, recent dispatches and ownership totals. Its administration screens use compact desktop controls. Selecting a demo role opens that role’s home screen, and the selected role is restored on reload. Navigation switches to a modal drawer on smaller screens, supports Escape and restores focus when closed. Glass effects have solid fallbacks for unsupported browsers, reduced transparency and increased contrast; motion respects the system preference. No backup files are created.

## Run

```sh
cd prototype4
npm install
npm run dev -- --port 3004
```

Open http://127.0.0.1:3004. For a production build, run `npm run build`, then `npm start -- --port 3004`.

## Included

- Operations dashboard; Linen In receiving, Linen Out packing, packed carts, shipping manifests, separate delivery assignments and history.
- Custom linen SVG icons with two-tone glass settings on dashboards and category cards, matching outlines in navigation, and clear selected states. Uploaded item photos keep priority over category artwork.
- Item-based incoming carts: customer/site selection, category and item tiles, quantity keypads with addition, optional item weights, automatic cart number, date, and optional tare/gross weighing with calculated net weight. Save or Save & Print creates an immutable receipt with item and document snapshots. Original kg/lb units are preserved, and switching units converts entered weights. Older batch receipts remain readable.
- Customer and delivery site creation, editing, searching and deactivation.
- Categories and item catalogue, image uploads, allowed quantity methods and default bundle sizes.
- Independent customer-owned and laundry-pool assignments for the same catalogue item.
- Touch Linen Out: route/customer/site selection, split item table and category tiles, grid/list display, direct ownership toggle, addition keypads, cart comments and optional kg/lb weighing. Multiple carts receive automatic numbers on save; historical references are preserved.
- Original quantities and bundle sizes, calculated equivalent pieces, and separate kg/lb linen quantities.
- Manifest review and immutable document snapshots. New manifests are Ready for delivery; legacy Dispatched records retain their original status. Admin cancellation requires a reason and removes the manifest from delivery assignment.
- A4 shipping manifest preview, CODE128 barcode, browser printing and Save as PDF through the print dialog.
- Five filtered reports and CSV downloads. Cancelled records are excluded by default.
- Systems Administrator laundry inspection: open a laundry to browse its company details, items, categories, ownership assignments, customers, sites, receiving records, dispatches and manifests, people, activity, and settings in read-only tabs.
- Delivery assignment by manifest, individually or in bulk, with date, route, driver and customer filters. Reassignment preserves the locked document and records activity. Owner-managed drivers support contact/vehicle details and active/inactive status.
- Admin and Operator demo roles. This is browser-side demonstration permission handling, not authentication.

The Alexandra Hotel example is available under **Shipping manifests**, using **Reprint** on LM-001001: 100 customer-owned pieces, 90 pool pieces, 190 equivalent pieces overall, and 12.5 kg separately. Two cart weighings total 34 kg tare, 90.5 kg gross and 56.5 kg net; these are independent of item quantities.

## Systems Administrator interface

The platform console shares the glass navigation shell and frosted panel theme and keeps its compact desktop layout. Its overview shows live laundry and user counts, plan distribution, suspended or expiring trial workspaces, and recent platform changes. The laundry directory has status tabs, plan filters and search. User management supports role, laundry and status filtering, while the audit log supports search, action/workspace filters and CSV export.

Laundry detail pages use a compact profile header, record counts, and vertical navigation for read-only workspace inspection. Profile and user forms group related fields, and status changes sit under the laundry's **Manage status** menu. Data-screen styles remain scoped to platform pages while typography, navigation and color tokens are shared across roles.

## Platform laundry inspection

As **Systems Administrator**, open **Laundries → Open** for a business. Its detail page includes searchable read-only sections for all saved operational records. Dispatch and receiving records open in detail dialogs; dispatches also include their original shipping manifest. Existing platform controls for laundry profiles, status and users remain available.

Pure Linen reads the original operational collections, so existing owner/operator data stays intact. Each other laundry has separate persisted collections under `laundryWorkspaces`, and inspection never falls back to Pure Linen's records. Laundries that previously had summary snapshots only show empty operational sections until their detailed records are available. Counts now come from actual saved records rather than snapshot estimates.

The inventory view shows catalogue items, customer-owned and pool assignments, saved received pieces and item weights, and confirmed dispatched quantities by item. Cart net weights are not allocated to individual items. Drafts and cancellations are excluded from dispatch movement totals; pieces, kg and lb stay separate. This does not calculate on-hand stock. Browser role switching remains demonstration access handling rather than server authentication.

## Receiving demo

Open **Linen In**, filter or search for a customer, and choose a collection site when more than one is available. Choose a category and tap an item to open its quantity keypad. Add further items across categories; existing rows remain in the cart. Tap a row quantity or weight to edit it, and use the grid/list controls to change the item display.

The bottom strip shows the next cart number automatically; it is assigned when saving and cannot be edited. Unsaved carts do not consume numbers, and numbering continues after existing saved carts. Enter the receiving date. Optional tare and gross weights calculate the net automatically; leave gross empty and tare at zero for a piece-only cart. Choose **Save** to view the saved receipt, or **Save & Print** to open its print preview. **Records** supports searching, viewing and reprinting saved receipts after reload. Leaving an unsaved cart asks whether to discard it. Receiving does not create clean stock or automatically match a dispatch.

## Complete dispatch demo journey

1. As Admin, open **Customer List → Create Customer** and save a unique code and name. Use **Add Site** to enter a site name and delivery address.
2. In **Item Catalogue → Create Item**, create a unique item with pieces, bundles and weight enabled, and a bundle size of 10.
3. In **Customer-owned Linen**, select your customer and assign the item. In **Laundry Pool Linen**, enable the same item for the pool.
4. Switch to Operator. Open **Linen Out**, select the customer and site. In Cart 1 add 100 customer-owned pieces and 5 bundles of pool linen using 10 pieces per bundle. The same item appears separately for each ownership type.
5. Select **Add Cart**. Add 12.5 kg of customer-owned linen to Cart 2. Optional tare and gross values require both fields; gross must be at least tare.
6. **Save** keeps the packed carts in **Packed carts**, accessible from **Shipping Manifest → Prepare manifest from packed carts** or the navigation drawer. **Save & Print** saves and opens a draft manifest preview labelled **NOT DISPATCHED**. Reopen with **Resume Draft** after reload; entries, automatic cart numbers and original units remain available.
7. Select **Create Manifest**. Review all carts, delivery details, shipping date and notes. Select **Save Manifest** or **Save & Print**. The document becomes **Ready for delivery**, with locked item and delivery-site details.
8. Open **Print Preview / Reprint**, then **Print / Save as PDF**. Select A4 portrait and the printer or Save as PDF. Printing is read-only.
9. Close preview. In **Dispatch History**, filter by customer, date, document number or cart reference, and select **Reprint**.
10. Switch to Admin, open the record and select **Cancel Manifest** (or **Cancel Dispatch** for an older dispatched record). Enter a reason. In **Reports**, filter to the customer: operational quantities now exclude the cancelled record. Enable **Include cancelled records** to inspect it.

## Delivery assignment demo

As the owner, open **Administration → Drivers** to add drivers, phone/vehicle details and availability. Fresh demo workspaces include two clearly named demo drivers. Existing browser data gets an empty driver directory during migration; other laundry workspaces never borrow those drivers.

After saving a manifest, choose **Assign Delivery** on its record, or open **Assign Deliveries** from the operator home. Pick the driver, route and scheduled date, then **Save Assignment**. The Today/Tomorrow shortcuts simplify touch scheduling. The assignment card shows the customer/site, manifest, cart count, pieces, route, driver and scheduled date. Filters include Due Today, Due Tomorrow, Custom Date and All Dates, plus driver, route and customer. Driver filtering includes Unassigned.

For a delivery run, choose **Assign Multiple**, select cards or **Select all visible**, then **Assign selected**. One driver, route and date apply to every selected manifest. Validation checks all targets before saving, including inactive drivers, cancelled records and concurrent assignment edits. Use **Reassign Delivery** to change an existing assignment. Saved assignments and activity persist after reload; driver names/contact details are snapshotted at assignment time.

Delivery assignment is separate from packing and manifest data. It does not mark a vehicle as departed or confirm customer delivery. Ready manifests are excluded from dispatched-quantity reports, including after cancellation. Existing Dispatched documents and their totals are retained. Systems Administrator laundry inspection includes read-only Drivers and Delivery assignments tabs.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Tests cover mixed ownership, bundle conversion, incompatible units, cart-weight counting, validations, stale drafts, duplicate confirmation, immutable snapshots, cancellation and CSV handling. Receiving tests cover legacy compatibility, item/cart validation, repeated saves, canonical historical snapshots, unit conversion, sequential receipt numbers, persistence, print rendering and received inventory movements. A persistence integration test exercises setup, a multi-cart dispatch, saving/reopening, confirmation, rendering/reprinting the manifest, history filtering and report updates after cancellation. It uses an isolated in-memory localStorage adapter and does not change the browser's demo data.

The production build and 40 automated tests pass. Delivery tests cover manifest readiness, immutability, owner-only driver changes, atomic bulk assignment, stale edits, cancellation, historical assignment snapshots, legacy migration and per-laundry isolation. Outgoing tests cover automatic numbering on save, reloads, repeated saves, cancellation, legacy references, physical weight-unit conversion, draft preview and immutable confirmed manifests. Laundry inspection tests cover tenant isolation with overlapping local IDs, detached read-only data, unit-separated movements, scoped manifests, empty workspaces, and persistence migration. Safari checks covered the incoming-cart customer/site steps, category changes, quantity keypad addition, tare/gross/net calculation, Save & Print preview and reload persistence in an isolated local origin. Linen Out Safari checks covered addition, separate ownership rows, bundle conversion, cart weighing, Save & Print, reload/resume, two-cart confirmation, and the locked manifest. The packing layout was also inspected at 1024 × 768. Delivery Safari checks covered owner driver creation, manifest preparation, individual assignment, bulk reassignment, and persistence after reload. Earlier checks covered desktop administration. Responsive dashboard layouts were visually checked at 1024 × 768 and 390 × 844. Actual printer output and physical touchscreen hardware were not tested.

## Structure

- `lib/types.ts`: models and contracts.
- `lib/domain.ts`: validation, document transitions, totals, filters and CSV serialization.
- `lib/deliveries.ts`: driver validation, atomic assignments, optimistic version checks and compatibility migration.
- `components/DeliveryAssignments.tsx`: touch assignment board, filters and individual/bulk assignment dialogs.
- `components/Drivers.tsx`: owner driver directory and editing.
- `app/deliveries.css`: assignment cards, controls and responsive layout.
- `lib/outgoing.ts`: automatic outgoing cart numbering and physical cart weight-unit conversion.
- `components/DispatchEditor.tsx`: touch packing and the shipping-manifest review.
- `app/outgoing.css`: scoped outgoing-cart and manifest-review styles.
- `lib/laundry-workspace.ts`: isolated read-only laundry data and inventory movement summaries.
- `components/LaundryDetails.tsx`: searchable read-only laundry tabs and record/manifest dialogs.
- `lib/receiving.ts`: incoming-cart validation, weight conversion, saving and immutable snapshots, with legacy batch compatibility.
- `components/Receiving.tsx`: customer/site selection, touch cart entry and receipt records.
- `components/ReceivingKeypad.tsx`: isolated receiving quantity/arithmetic and weight keypad.
- `components/ReceivingDocument.tsx`: receipt details and printable incoming-linen document.
- `app/receiving.css`: scoped incoming-cart layouts and touch controls.
- `lib/repository.ts`: localStorage repository boundary; replace this adapter to connect a backend.
- `lib/seed.ts`: demonstration records, seeded once on first load using the browser's date.
- `components/`: operational screens and printable document.
- `components/Navbar.tsx`: operations rail, desktop administration navigation and mobile drawer.
- `components/AdminDashboard.tsx`: detailed owner dashboard with daily statistics and recent dispatches.
- `components/Dashboard.tsx`: simple operator tiles for receiving, clean linen, dispatches, manifests and records.
- `app/globals.css`: Tailwind theme and shared component styles.
- `app/workspace.css`: shared glass navigation, responsive shell, drawer and accessibility fallbacks.
- `app/dashboard.css`: responsive operator action tiles.
- `components/LinenIcons.tsx`: shared linen, category and operation SVG symbols.
- `app/icons.css`: icon glass settings, category colors and selected navigation styling.
- `app/print.css`: separate A4 document layout and print visibility.

Browser storage key: `laundry.prototype4.v1`. Clearing that origin's localStorage reseeds the demonstration on the next reload. Data remains on the current browser/origin. No stock availability, receiving-to-dispatch reconciliation, balances, prices or invoicing are implemented. Older browser data remains compatible; the optional receipts collection is created when linen is first received.
