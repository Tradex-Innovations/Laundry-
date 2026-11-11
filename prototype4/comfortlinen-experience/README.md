# ComfortLinen — Comfort, by nature

An immersive marketing website following Unseen Studio’s spatial storytelling: a quiet entry, a continuous 3D environment, a camera journey through water, editorial sustainability scenes and a floating service gallery. The laundry landscape, models, textures, animation and ambient audio are original code created for ComfortLinen.

## Run

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173/ and choose to enter with or without ambient sound.

## Check and build

```sh
npx tsc --noEmit
npm run build
```

The application uses the supplied Sites Vinext/Cloudflare starter, React and Three.js.

- `app/page.tsx`: entry, content, service filtering, dialogs, FAQs and enquiry draft.
- `app/ExperienceScene.tsx`: reflective water, animated linen, instanced trees, pointer interaction and the scroll camera.
- `app/LaundryBuilding.ts`: original laundry building, roof-mounted solar arrays, visible washers, timber facade, landscape and sunset shaders.
- `app/ServicesGallery.tsx` and `app/ServicesGalleryCanvas.tsx`: pinned filters, recycled service rows, curved textured surfaces and accessible selection targets.
- `app/galleryMotion.ts`: frame-rate-independent scroll easing and card projection for matching selection targets.
- `app/services-gallery.css`: gallery layout, responsive treatment and static fallback.
- `app/useAmbientSound.ts`: opt-in stereo wind, leaf rustle and occasional birdsong, with smooth muting and background suspension.
- `app/globals.css`: responsive layout, typography and motion controls.

## Experience

- A full-screen entry with sound choice and reduced-motion option.
- A real-time laundry building with rooftop solar panels, a glazed laundry area, fuller trees, a low sunset sun, water reflections, drifting leaves and moving linen.
- Scroll-driven camera positions, a near-water transition, and two sustainability chapters.
- Pointer parallax, drag-to-look and press-and-hold water ripples.
- A pinned service gallery with continuous recycled rows, curved images and captions, scroll inertia and velocity-driven bending. It uses native page scrolling and releases into the next section.
- Four service categories, working filters, photographic service dialogs and service-specific enquiries. Motion pause removes curvature and inertia; WebGL failure falls back to ordinary service cards.
- A local film background and a controlled 1:43 company film dialog.
- Full-screen navigation, FAQs, contact details and mobile layouts.
- Motion pause, system reduced-motion preference, keyboard controls and a WebGL fallback.

The enquiry form validates inputs and prepares an email draft for the visitor to review and send through their email app. It does not submit or store form data on a backend.

## Source material

- Design reference: https://unseen.co/
- Reference process: https://www.awwwards.com/unseen-studio-by-unseen-studio-wins-sotm-february-2023.html
- Business details: https://comfortlinen.co.uk/
- Sustainability statements: https://comfortlinen.co.uk/commercial-laundry-services/

The existing ComfortLinen site was checked on 10 November 2026. Its stated one-third water reuse and 40% gas reduction through a heat exchanger inform the two care chapters. Photographs and video are public assets from that existing business site, compressed locally under `public/media/`. No Unseen source code, models, images or audio are bundled.

Fonts: DM Sans and Instrument Serif, locally served with their licenses under `public/fonts/`.

This is a separate marketing website under `comfortlinen-experience/`. The parent laundry app excludes this independent app from its TypeScript project.

## Validation

- TypeScript and production build pass. The build reports a large Three.js chunk advisory.
- Desktop and 390 × 844 layouts visually inspected in Safari, including entry, hero and sustainability content.
- Navigation, curved gallery at multiple scroll positions, dining filter, service dialog and service-specific enquiry selection verified in the browser. The gallery was also checked at 390 × 844 with motion paused and with its continuation link.
- Film controls report a 1:43 duration and playback elapsed time advances. Local H.264 assets decode successfully and the server supports byte ranges.
- The enquiry flow prepares a local email draft; no test message was sent.

## Publication status

This revision is implemented locally. The existing registered Sites project returns `project_not_found` (404) through the connected account, so it has not been published. No live ComfortLinen website was changed. Hosting identity remains in `.openai/hosting.json`.

## Service gallery revision — 11 November 2026

The former staggered grid has been replaced by a curved project-wall presentation following the supplied Unseen Projects reference. Heading and filters stay fixed during the gallery sequence. Text and divider lines bend with the photographs, and service selection still opens the existing detail/enquiry flow. The four services recycle through the pinned sequence; continuing to scroll exits naturally to the company film.

## Solar laundry landscape revision — 11 November 2026

The abstract arches are replaced with an original conceptual laundry building. Sixteen roof-mounted solar modules use a locally drawn photovoltaic cell texture. A glazed front reveals three washers and clean-linen shelving; timber details, a rainwater tank and a linen drying line complete the building. Ten trees, a planted bank, a stepping-stone path and a low warm sun surround the reflective pond.

The architecture is a sustainability-inspired visual concept, not a surveyed model of the actual ComfortLinen premises or a claim about its installed solar capacity. Existing business sustainability copy remains unchanged.

The camera now stays outside the building throughout the scroll journey. The headline sits over the evening sky; responsive camera distance, sun placement and fog keep the building visible on mobile. A ResizeObserver sizes the drawing surface from its actual container, including Safari responsive mode. Scene textures, geometry and materials are disposed on unmount. Desktop and 390 × 844 hero views, animation pause/resume and the care-section camera transition were checked in Safari.

## Nature sound revision — 11 November 2026

The ambient soundtrack now layers soft wind, gentle leaf rustling and eight varied phrases of bird chirps across a 53-second stereo soundscape. Independently looping wind prevents the layers from repeating in lockstep. Both layers are synthesized locally in `app/natureSound.ts`; no external audio assets or requests are needed. Bird calls occupy about 13% of the soundscape, leaving generous quiet gaps.

Audio remains opt-in through the entry button or speaker control. It fades in and out, suspends when the document is hidden, resumes the visitor's enabled preference on return and cleans up audio resources on unmount. TypeScript, production build and signal checks for stereo variation, finite samples, clipping headroom and smooth loop boundaries pass. Browser checks confirmed opt-in playback and mute/resume control states without a runtime error.

## Services leaf interaction — 11 November 2026

`app/ServicesLeaves.tsx` adds an independent 2D leaf layer over the Services gallery. Cursor entry introduces a light breeze; movement leaves a sparse trail and nudges nearby leaves. Each leaf tumbles, drifts and fades, with a cap of 28 particles. Heading and filters stay above the layer, and pointer events pass through to the existing cards and links.

The effect runs only while the gallery is visible and the pointer or fading leaves are present. Leaving the stage fades the remaining leaves. Animation pause, system reduced motion, hidden tabs and unmount clear the effect and release its observers/listeners. Touch scrolling does not spawn cursor particles. TypeScript and production build pass. Initial browser capture failures were resolved during the smooth-gallery revision below. Cursor-triggered leaves and service selection were then verified together in Safari.


## Smooth Services gallery revision — 11 November 2026

The gallery now eases toward native scroll position with an exact critically damped spring. Rows keep stable mesh identities as they recycle, and hover scale settles gradually. The centre stays readable while the upper and lower rows follow a monotonic curve, avoiding the old back-folding behavior. A subtle color fringe appears only on moving curved edges. The heading is slightly smaller and the two-column wall is wider to follow the supplied reference more closely.

Deformation runs in the vertex shader on static geometry. The CPU samples a small set of points for matching accessible click targets, rather than rewriting every mesh vertex. Offscreen cards are skipped, the gallery stops requesting frames once movement settles, and the background 3D landscape does not redraw on scroll while the Services stage fills the viewport. Leaf pointer updates now share the animation-frame loop.

Validation: TypeScript and production build pass (the existing Three.js chunk-size advisory remains). Numerical checks cover settling without overshoot, reversals and equivalent results at simulated 30, 60, 120 and 144 Hz, plus monotonic projection at four viewport sizes. These are motion-math checks, not a measured browser frame-rate claim. Live Safari checks covered rendered cards at multiple scroll positions, Dining filtering, opening and closing service details, floating leaves, animation pause/resume, and the pinned single-column gallery at 390 × 844. A reserved GLSL uniform name found during browser verification was corrected before final validation.


## Visible returning underside — 11 November 2026

The Services wall now turns through a half-circle at its upper and lower edges. Its textured reverse travels behind the front row with real depth testing, a slight perspective taper and soft underside shading. The rear surface remains visible through the row gaps rather than flattening or disappearing at the fold. This replaces the previous monotonic edge projection while retaining the same damped scrolling and stable recycled rows.

Front captions have a soft paper backing for readability; reversed captions are subdued. Only front-facing surface samples contribute to service click targets. The fold is removed when motion is paused. The mesh uses more vertical segments for a smoother turning edge, while all deformation remains on the GPU.

Validation: Safari rendered the returning surface on desktop and at 390 × 844. The Dining filter and its front-facing service dialog were verified after the geometry change. Numerical checks cover visible back-facing geometry behind the crest, continuous flat-to-curl seams, finite bounds across four viewport sizes, pause flattening and preserved easing at simulated 30–144 Hz. TypeScript and production build pass; the existing large Three.js chunk advisory remains.

## Linen flow revision — 11 November 2026

The service surfaces now billow like soft fabric. Travelling waves, a changing fold radius and a gentle twist create uneven edges, with different wave phases in the two columns. Scroll speed strengthens the ripples while the centre stays restrained for reading and selection. Surface lighting follows the changing cloth, and the textured reverse remains visible behind each row. Caption backing fades across its width to let the returning surface show through.

A slow breeze now continues while the gallery is visible, replacing the earlier stop-at-rest behavior. Pausing or enabling reduced motion flattens the panels and stops the breeze; hidden tabs and offscreen sections stop requesting animation frames. Click targets use the same projection as the shader.

Validation: TypeScript and production build pass, with the existing Three.js chunk-size advisory. Safari checks cover the moving desktop gallery, opening and closing a service dialog, pause/resume, and the single-column flow at 390 × 844. Numerical checks cover idle motion, restrained centre movement, visible reverse geometry, finite coordinates across four viewport sizes in both scroll directions, a static paused state and consistent easing at simulated 30–144 Hz. These checks do not constitute a measured browser frame-rate claim.

## Green ComfortLinen logo — 11 November 2026

The supplied ComfortLinen LTD wave logo is recoloured to forest green and saved with a transparent background at `public/brand/comfortlinen-green.png` (2172 × 724). Header, footer, expanded navigation and entry-screen branding use this local PNG, with explicit image dimensions and responsive sizing. Desktop and 390 × 844 header placement were visually checked in Safari; TypeScript and production build pass.

Asset editing used the built-in image tool. Prompt: preserve the supplied ComfortLinen LTD lettering and two wave strokes, recolour the blue/cyan to deep forest green #25382e, remove the white background, and crop excess margins with safe padding.

## About us and Our story — 11 November 2026

`app/OurCompany.tsx` and `app/our-company.css` add two linked company chapters between Services and the company film. About us introduces the business and its principles beside the actual Axminster premises. Our story follows the roots in Galle, Sri Lanka, through to Axminster, using a sticky desktop introduction, scroll progress and restrained photo parallax. Mobile uses a single-column layout. The existing animation-pause and system reduced-motion controls remove the parallax.

Main navigation and the full-screen menu now include About us and Our story; the Services continuation leads into the new chapters. The six-entry menu uses compact responsive typography. The position indicator follows the added sections, and the header retains a readable background over them.

Content and three photographs were sourced from https://comfortlinen.co.uk/about-us/ and checked on 11 November 2026. Local assets: `about-comfortlinen.webp` (premises), `story-galle.webp` (Sri Lanka coast) and `story-laundry.webp` (solar installation). Copy paraphrases the existing company history and practices; no founding dates, testimonials or new performance claims were added.

Validation: TypeScript and production build pass, with the existing Three.js chunk-size advisory. Safari checks covered desktop About us, the story link, scrolling from Galle to the solar photograph, and both chapters via the mobile menu at 390 × 844.

## Building façade logo — 11 November 2026

The laundry building’s sign now uses `public/brand/comfortlinen-green.png`, proportionally fitted to a cream sign surface. The sign is slightly taller to accommodate both wave strokes and the LTD lettering. Its canvas texture participates in scene lighting and water reflections. Image loading requests a redraw even when animations are paused; cleanup removes the image callback and disposes the texture with the scene. Safari visually confirmed the logo on the façade and in the pond reflection. TypeScript and production build pass, with the existing Three.js chunk-size advisory.

## Co-founder portrait and story — 11 November 2026

The supplied corporate portrait is included as `public/media/co-founder.jpg`, compressed to 1000 × 1249 for web use. A portrait-and-story section between About us and Our story introduces the co-founder’s Galle-to-UK journey. The About us call to action now opens `#co-founder`, with a continuation into the company story. The caption identifies Mr. Gayanath Nanayakkara as Co-founder, ComfortLinen, using the name provided by the user.

The biography uses the user-supplied role and Galle-to-UK background together with the company’s published About Us history at https://comfortlinen.co.uk/about-us/. The name and co-founder role were supplied by the user. The story adds no dates, awards, attributed quotations or unverified milestones. Desktop and 390 × 844 portrait/text layouts and the About us link were checked in Safari. TypeScript and production build pass; the existing Three.js chunk-size advisory remains.
