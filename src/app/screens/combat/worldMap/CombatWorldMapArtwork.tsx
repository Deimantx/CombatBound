interface CombatWorldMapArtworkProps {
  backgroundKey: string
  backgroundAsset?: string
}

interface MapArtworkShape {
  land: string
  secondary?: string
  river?: string
  road?: string
  ridges: string[]
  forests: Array<[number, number, number]>
}

const artworkByKey: Record<string, MapArtworkShape> = {
  world: {
    land: 'M88 151 C142 82 229 70 294 111 C345 49 442 45 490 105 C555 40 680 55 720 123 C806 107 890 166 866 234 C939 283 915 377 836 397 C810 470 704 493 636 442 C567 509 459 488 416 430 C332 464 247 429 231 365 C148 364 76 274 88 151 Z',
    secondary: 'M92 428 C173 369 265 382 315 430 C365 472 314 529 218 520 C130 515 61 476 92 428 Z',
    river: 'M290 103 C352 171 334 241 386 285 C430 322 482 333 506 449',
    road: 'M126 300 C253 273 319 289 408 255 C511 217 589 240 705 191 C779 160 829 189 875 231',
    ridges: ['M142 178 L180 131 L207 181 L235 122 L270 179', 'M564 145 L601 94 L632 149 L664 101 L701 157', 'M696 365 L731 315 L764 369 L801 320 L833 374'],
    forests: [[172, 270, 1], [235, 218, 1.2], [756, 263, .9], [430, 176, .8]],
  },
  greenvale: {
    land: 'M112 117 C197 76 266 91 328 120 C389 72 489 74 548 122 C628 88 741 118 779 188 C861 224 862 321 793 361 C760 440 655 467 580 431 C500 487 391 453 354 401 C276 433 186 397 173 334 C101 308 70 185 112 117 Z',
    secondary: 'M224 329 C283 292 349 320 376 368 C394 404 348 437 284 426 C225 415 190 367 224 329 Z',
    river: 'M418 82 C395 165 465 205 450 276 C438 338 481 381 530 449',
    road: 'M107 288 C226 268 302 291 386 267 C493 236 585 247 706 201 C762 180 811 205 850 242',
    ridges: ['M574 159 L612 104 L643 160 L676 116 L715 170', 'M222 162 L255 119 L283 167 L313 127 L345 177'],
    forests: [[244, 246, 1.1], [314, 203, .9], [382, 181, 1], [669, 279, .8]],
  },
  northwood: {
    land: 'M117 115 C186 63 279 84 335 131 C411 74 510 91 551 151 C623 109 726 139 760 209 C846 238 837 344 760 370 C722 444 616 445 554 408 C475 466 367 429 335 372 C255 422 153 374 170 304 C90 275 70 169 117 115 Z',
    river: 'M447 82 C418 148 467 202 445 271 C426 334 479 377 521 445',
    road: 'M109 302 C218 271 317 295 408 267 C503 236 609 244 752 188',
    ridges: ['M598 153 L633 103 L661 157 L690 117 L723 170', 'M177 201 L210 157 L240 206 L270 167 L300 219'],
    forests: [[208, 237, 1.2], [276, 177, 1.1], [344, 222, 1.2], [654, 265, .8], [712, 320, .9]],
  },
  southfen: {
    land: 'M101 153 C156 89 262 86 324 137 C401 92 502 100 551 158 C636 115 759 155 770 231 C844 268 826 376 743 383 C695 445 587 442 528 409 C447 462 350 423 317 368 C235 414 142 365 161 302 C80 281 62 205 101 153 Z',
    secondary: 'M213 281 C274 237 356 254 378 312 C398 368 342 411 270 396 C202 380 175 316 213 281 Z',
    river: 'M425 83 C391 152 465 196 438 264 C414 325 468 372 516 449',
    road: 'M125 275 C219 296 281 278 373 303 C474 331 587 280 743 328',
    ridges: ['M608 164 L640 124 L668 169 L698 133 L729 182'],
    forests: [[198, 221, .8], [625, 240, .8]],
  },
  'deep-woods': {
    land: 'M88 171 C155 88 276 89 341 140 C412 92 530 108 578 167 C673 127 805 173 827 270 C884 344 805 443 713 420 C649 480 535 457 485 409 C392 464 280 425 268 359 C170 378 75 291 88 171 Z',
    river: 'M364 74 C393 143 350 208 401 259 C449 307 420 364 478 446',
    road: 'M120 332 C230 298 312 319 384 291 C487 250 586 260 791 198',
    ridges: ['M149 181 L189 124 L222 185 L259 137 L291 192', 'M646 326 L681 276 L716 329 L751 281 L789 340'],
    forests: [[195, 248, 1.4], [271, 198, 1.4], [346, 245, 1.2], [632, 226, .9], [719, 257, .9], [750, 350, 1]],
  },
  'old-road': {
    land: 'M96 145 C157 82 267 78 326 129 C406 78 506 92 552 149 C635 110 753 144 781 213 C858 254 832 350 761 382 C711 450 599 440 542 402 C462 459 355 422 319 365 C230 413 137 364 155 300 C81 278 61 194 96 145 Z',
    river: 'M443 79 C415 148 466 196 439 259 C418 319 473 371 519 451',
    road: 'M101 254 C204 237 290 253 374 277 C463 303 552 271 643 244 C726 219 784 245 842 302',
    ridges: ['M610 151 L645 102 L675 157 L706 114 L741 166', 'M173 201 L205 158 L236 209 L266 169 L298 220'],
    forests: [[204, 254, .9], [272, 183, .8], [711, 349, .8]],
  },
}

export function CombatWorldMapArtwork({ backgroundKey, backgroundAsset }: CombatWorldMapArtworkProps) {
  if (backgroundAsset) return <div className="combat-world-map-artwork combat-world-map-artwork-image" data-map-background={backgroundKey} style={{ backgroundImage: `url(${backgroundAsset})` }} aria-hidden="true" />
  const art = artworkByKey[backgroundKey] ?? artworkByKey.world
  return <svg className="combat-world-map-artwork" data-map-background={backgroundKey} viewBox="0 0 900 540" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id={`map-grain-${backgroundKey}`} width="38" height="38" patternUnits="userSpaceOnUse"><path d="M0 12h2M17 29h1M31 8h2M24 2h1" stroke="rgba(226,208,158,.16)" strokeWidth="1" /></pattern>
    </defs>
    <rect width="900" height="540" fill="url(#map-grain-${backgroundKey})" />
    <path className="map-art-secondary" d={art.secondary ?? art.land} />
    <path className="map-art-land" d={art.land} />
    {art.river && <path className="map-art-river" d={art.river} />}
    {art.road && <path className="map-art-road" d={art.road} />}
    {art.ridges.map((ridge) => <path key={ridge} className="map-art-ridge" d={ridge} />)}
    {art.forests.map(([x, y, scale]) => <g key={`${x}-${y}`} className="map-art-forest" transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 31 L16 0 L32 31 Z M8 31 L23 9 L38 31 Z" /><path d="M13 31 V40 M28 31 V40" /></g>)}
  </svg>
}
