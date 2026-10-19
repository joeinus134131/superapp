/** Original vector illustrations shared by web and native. No remote image dependency. */
const wrap = (content, background = '#f3eddf') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="${background}"/>${content}</svg>`;
export const LANDSCAPE = wrap(`
<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#f6ecd4"/><stop offset="1" stop-color="#f9f6eb"/></linearGradient><linearGradient id="hill" x2="0" y2="1"><stop stop-color="#75916b"/><stop offset="1" stop-color="#193f30"/></linearGradient></defs>
<rect width="800" height="500" fill="url(#sky)"/><circle cx="585" cy="110" r="66" fill="#e8c68e" opacity=".65"/>
<path d="M0 280L100 170 171 238 274 124 389 281 482 162 602 286 702 208 800 275V500H0Z" fill="#d6d8bd"/>
<path d="M0 325L150 251 231 297 350 194 457 313 564 249 668 310 800 215V500H0Z" fill="#b4c1a0"/>
<path d="M0 340Q130 266 277 365Q412 421 529 303Q660 226 800 335V500H0Z" fill="#91a789"/>
<path d="M800 298Q683 294 597 372Q520 423 415 409Q235 388 0 480V500H800Z" fill="url(#hill)"/>
<path d="M800 419Q654 365 577 419L511 455 447 500H800Z" fill="#264e39"/>
<path d="M525 500Q551 456 599 435L663 417 625 438Q589 460 578 500" fill="#d2c69e" opacity=".75"/>
<path d="M704 419L680 397 701 395 675 366 700 370 683 346 707 357 716 326 724 356 743 343 733 372 759 366 740 394 763 397 739 420Z" fill="#416343"/>
<path d="M99 500L76 446 91 451 61 400 92 423 82 372 116 421 136 384 129 440 155 417 143 466 166 453 152 500Z" fill="#2d5439"/>
<path d="M649 374L667 360 688 367 691 387 666 394Z" fill="#34483a"/>
<circle cx="661" cy="299" r="12" fill="#c19b71"/><path d="M653 285Q668 281 674 294L655 297Z" fill="#19372d"/>
<path d="M650 310Q661 304 674 316L686 346 674 363 644 347Z" fill="#8b9f70"/>
<path d="M673 323L690 341 711 343" fill="none" stroke="#c19b71" stroke-width="8" stroke-linecap="round"/>
<path d="M649 346L642 368 670 375 689 369" fill="none" stroke="#1c3830" stroke-width="13" stroke-linecap="round"/>
<path d="M674 355L697 368 707 391" fill="none" stroke="#26473a" stroke-width="12" stroke-linecap="round"/>
<path d="M704 390L718 394" stroke="#172d25" stroke-width="8" stroke-linecap="round"/>
<path d="M644 314Q632 313 632 327L635 345 649 349" fill="#546b4f"/>
`);
export const GOAL_ART = {
  health: wrap(`<circle cx="600" cy="125" r="83" fill="#e7c697"/><path d="M0 303Q180 195 380 298T800 280V500H0Z" fill="#b3b993"/><path d="M0 400Q287 256 800 390V500H0Z" fill="#657f59"/><path d="M0 462L800 409V500H0Z" fill="#3e6349"/><circle cx="393" cy="176" r="29" fill="#b18b65"/><path d="M369 147Q407 124 423 165L377 165Z" fill="#293c32"/><path d="M367 215L415 205 445 290 395 309 355 266Z" fill="#dbb77c"/><path d="M377 230L331 267 283 245M420 224L460 248 490 215" fill="none" stroke="#b18b65" stroke-width="18" stroke-linecap="round"/><path d="M394 299L349 356 297 390M420 294L447 352 510 374" fill="none" stroke="#253f32" stroke-width="24" stroke-linecap="round"/>`),
  career: wrap(`<rect y="340" width="800" height="160" fill="#b49670"/><rect x="68" y="52" width="231" height="220" rx="4" fill="#d7dfce"/><path d="M180 52V272M68 160H299" stroke="#fff9eb" stroke-width="9"/><path d="M304 144H625L650 335H327Z" fill="#39493d"/><path d="M321 158H612L632 319H342Z" fill="#a3b29a"/><path d="M327 335H650L699 368H271Z" fill="#d2cfb7"/><path d="M409 175H520M409 196H571M409 217H544M409 238H582" stroke="#eef1de" stroke-width="7"/><path d="M109 342L96 274H176L165 342Z" fill="#ede4ce"/><path d="M138 278Q80 238 102 195Q144 208 138 278M141 278Q196 235 182 206Q143 212 141 278" fill="#5b7858"/><ellipse cx="713" cy="321" rx="30" ry="13" fill="#f7f1df"/><path d="M683 321L691 361H735L743 321" fill="#eee3cd"/>`),
  finance: wrap(`<rect y="395" width="800" height="105" fill="#d0bd97"/><path d="M122 400L105 285H250L234 400Z" fill="#b79768"/><path d="M179 294V138M179 234Q95 219 107 163Q175 155 179 234M180 187Q263 184 252 124Q186 123 180 187" fill="#557954" stroke="#557954" stroke-width="9"/><path d="M329 397L310 229H479L458 397Z" fill="#e7dfca"/><path d="M393 238V73M393 189Q318 167 329 113Q389 113 393 189M394 135Q472 129 455 67Q397 77 394 135" fill="#78906b" stroke="#78906b" stroke-width="9"/><ellipse cx="618" cy="387" rx="66" ry="17" fill="#a88a58"/><path d="M552 315V386Q616 414 684 386V315Z" fill="#c6ab78"/><ellipse cx="618" cy="315" rx="66" ry="17" fill="#ddc693"/><path d="M552 340Q616 367 684 340M552 362Q616 389 684 362" fill="none" stroke="#ab915e" stroke-width="4"/>`),
  hobby: wrap(`<rect width="800" height="500" fill="#e4e4ce"/><circle cx="622" cy="97" r="53" fill="#ddc696"/><path d="M0 303L186 93 366 280 503 132 800 330V500H0Z" fill="#8eaa9b"/><path d="M186 93L119 203 179 179 203 205 232 190Z" fill="#ecebdd"/><path d="M0 358L300 251 455 356 650 258 800 325V500H0Z" fill="#5d8270"/><path d="M0 376Q300 342 800 395V500H0Z" fill="#9bb7b1"/><path d="M0 435Q203 380 330 447L525 500H0Z" fill="#365e45"/><path d="M800 390Q692 369 578 500H800Z" fill="#284f39"/><path d="M350 413H605M400 438H691M470 466H665" stroke="#d5dac7" stroke-width="3" opacity=".6"/>`),
};
export function goalArt(category = '') {
  const value = String(category || '').toLowerCase();
  if (/health|kesehatan/.test(value)) return GOAL_ART.health;
  if (/career|karir|education|edukasi|kerja/.test(value)) return GOAL_ART.career;
  if (/finance|keuangan/.test(value)) return GOAL_ART.finance;
  return GOAL_ART.hobby;
}
export function svgDataUri(svg) { return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`; }
