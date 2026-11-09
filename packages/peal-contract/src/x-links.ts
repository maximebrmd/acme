// The links X finds in a post's text, as its open text library finds them
// (twitter-text 3.1, Apache-2.0, `extractUrlsWithIndices`): with or without
// a scheme, on a domain whose top-level domain X knows, so `peal.social`
// is a link and `localhost` is not. X counts each one as 23 characters.

// The top-level domains X knows, generic then country codes, longest
// first where one begins another, as twitter-text lists them.
const genericDomains = [
  "삼성|닷컴|닷넷|香格里拉|餐厅|食品|飞利浦|電訊盈科|集团|通販|购物|谷歌|诺基亚|联通|网络|网站|网店|网址|组织机构|",
  "移动|珠宝|点看|游戏|淡马锡|机构|書籍|时尚|新闻|政府|政务|招聘|手表|手机|我爱你|慈善|微博|广东|工行|家電|娱乐|",
  "天主教|大拿|大众汽车|在线|嘉里大酒店|嘉里|商标|商店|商城|公益|公司|八卦|健康|信息|佛山|企业|中文网|中信|世界|",
  "ポイント|ファッション|セール|ストア|コム|グーグル|クラウド|みんな|คอม|संगठन|नेट|कॉम|همراه|موقع|",
  "موبايلي|كوم|كاثوليك|عرب|شبكة|بيتك|بازار|العليان|ارامكو|اتصالات|",
  "ابوظبي|קום|сайт|рус|орг|онлайн|москва|ком|католик|дети|zuerich|",
  "zone|zippo|zip|zero|zara|zappos|yun|youtube|you|yokohama|yoga|",
  "yodobashi|yandex|yamaxun|yahoo|yachts|xyz|xxx|xperia|xin|xihuan|",
  "xfinity|xerox|xbox|wtf|wtc|wow|world|works|work|woodside|",
  "wolterskluwer|wme|winners|wine|windows|win|williamhill|wiki|wien|",
  "whoswho|weir|weibo|wedding|wed|website|weber|webcam|",
  "weatherchannel|weather|watches|watch|warman|wanggou|wang|walter|",
  "walmart|wales|vuelos|voyage|voto|voting|vote|volvo|volkswagen|",
  "vodka|vlaanderen|vivo|viva|vistaprint|vista|vision|visa|virgin|",
  "vip|vin|villas|viking|vig|video|viajes|vet|versicherung|",
  "vermögensberatung|vermögensberater|verisign|ventures|vegas|",
  "vanguard|vana|vacations|ups|uol|uno|university|unicom|uconnect|",
  "ubs|ubank|tvs|tushu|tunes|tui|tube|trv|trust|travelersinsurance|",
  "travelers|travelchannel|travel|training|trading|trade|toys|toyota|",
  "town|tours|total|toshiba|toray|top|tools|tokyo|today|tmall|tkmaxx|",
  "tjx|tjmaxx|tirol|tires|tips|tiffany|tienda|tickets|tiaa|theatre|",
  "theater|thd|teva|tennis|temasek|telefonica|telecity|tel|",
  "technology|tech|team|tdk|tci|taxi|tax|tattoo|tatar|tatamotors|",
  "target|taobao|talk|taipei|tab|systems|symantec|sydney|swiss|",
  "swiftcover|swatch|suzuki|surgery|surf|support|supply|supplies|",
  "sucks|style|study|studio|stream|store|storage|stockholm|stcgroup|",
  "stc|statoil|statefarm|statebank|starhub|star|staples|stada|srt|",
  "srl|spreadbetting|spot|sport|spiegel|space|soy|sony|song|",
  "solutions|solar|sohu|software|softbank|social|soccer|sncf|smile|",
  "smart|sling|skype|sky|skin|ski|site|singles|sina|silk|shriram|",
  "showtime|show|shouji|shopping|shop|shoes|shiksha|shia|shell|shaw|",
  "sharp|shangrila|sfr|sexy|sex|sew|seven|ses|services|sener|select|",
  "seek|security|secure|seat|search|scot|scor|scjohnson|science|",
  "schwarz|schule|school|scholarships|schmidt|schaeffler|scb|sca|sbs|",
  "sbi|saxo|save|sas|sarl|sapo|sap|sanofi|sandvikcoromant|sandvik|",
  "samsung|samsclub|salon|sale|sakura|safety|safe|saarland|ryukyu|",
  "rwe|run|ruhr|rugby|rsvp|room|rogers|rodeo|rocks|rocher|rmit|rip|",
  "rio|ril|rightathome|ricoh|richardli|rich|rexroth|reviews|review|",
  "restaurant|rest|republican|report|repair|rentals|rent|ren|",
  "reliance|reit|reisen|reise|rehab|redumbrella|redstone|red|recipes|",
  "realty|realtor|realestate|read|raid|radio|racing|qvc|quest|quebec|",
  "qpon|pwc|pub|prudential|pru|protection|property|properties|promo|",
  "progressive|prof|productions|prod|pro|prime|press|praxi|pramerica|",
  "post|porn|politie|poker|pohl|pnc|plus|plumbing|playstation|play|",
  "place|pizza|pioneer|pink|ping|pin|pid|pictures|pictet|pics|piaget|",
  "physio|photos|photography|photo|phone|philips|phd|pharmacy|pfizer|",
  "pet|pccw|pay|passagens|party|parts|partners|pars|paris|panerai|",
  "panasonic|pamperedchef|page|ovh|ott|otsuka|osaka|origins|",
  "orientexpress|organic|org|orange|oracle|open|ooo|onyourside|",
  "online|onl|ong|one|omega|ollo|oldnavy|olayangroup|olayan|okinawa|",
  "office|off|observer|obi|nyc|ntt|nrw|nra|nowtv|nowruz|now|norton|",
  "northwesternmutual|nokia|nissay|nissan|ninja|nikon|nike|nico|nhk|",
  "ngo|nfl|nexus|nextdirect|next|news|newholland|new|neustar|network|",
  "netflix|netbank|net|nec|nba|navy|natura|nationwide|name|nagoya|",
  "nadex|nab|mutuelle|mutual|museum|mtr|mtpc|mtn|msd|movistar|movie|",
  "mov|motorcycles|moto|moscow|mortgage|mormon|mopar|montblanc|",
  "monster|money|monash|mom|moi|moe|moda|mobily|mobile|mobi|mma|mls|",
  "mlb|mitsubishi|mit|mint|mini|mil|microsoft|miami|metlife|merckmsd|",
  "meo|menu|men|memorial|meme|melbourne|meet|media|med|mckinsey|",
  "mcdonalds|mcd|mba|mattel|maserati|marshalls|marriott|markets|",
  "marketing|market|map|mango|management|man|makeup|maison|maif|",
  "madrid|macys|luxury|luxe|lupin|lundbeck|ltda|ltd|lplfinancial|lpl|",
  "love|lotto|lotte|london|lol|loft|locus|locker|loans|loan|llp|llc|",
  "lixil|living|live|lipsy|link|linde|lincoln|limo|limited|lilly|",
  "like|lighting|lifestyle|lifeinsurance|life|lidl|liaison|lgbt|",
  "lexus|lego|legal|lefrak|leclerc|lease|lds|lawyer|law|latrobe|",
  "latino|lat|lasalle|lanxess|landrover|land|lancome|lancia|",
  "lancaster|lamer|lamborghini|ladbrokes|lacaixa|kyoto|kuokgroup|",
  "kred|krd|kpn|kpmg|kosher|komatsu|koeln|kiwi|kitchen|kindle|kinder|",
  "kim|kia|kfh|kerryproperties|kerrylogistics|kerryhotels|kddi|",
  "kaufen|juniper|juegos|jprs|jpmorgan|joy|jot|joburg|jobs|jnj|jmp|",
  "jll|jlc|jio|jewelry|jetzt|jeep|jcp|jcb|java|jaguar|iwc|iveco|itv|",
  "itau|istanbul|ist|ismaili|iselect|irish|ipiranga|investments|",
  "intuit|international|intel|int|insure|insurance|institute|ink|ing|",
  "info|infiniti|industries|inc|immobilien|immo|imdb|imamat|ikano|",
  "iinet|ifm|ieee|icu|ice|icbc|ibm|hyundai|hyatt|hughes|htc|hsbc|how|",
  "house|hotmail|hotels|hoteles|hot|hosting|host|hospital|horse|",
  "honeywell|honda|homesense|homes|homegoods|homedepot|holiday|",
  "holdings|hockey|hkt|hiv|hitachi|hisamitsu|hiphop|hgtv|hermes|here|",
  "helsinki|help|healthcare|health|hdfcbank|hdfc|hbo|haus|hangout|",
  "hamburg|hair|guru|guitars|guide|guge|gucci|guardian|group|grocery|",
  "gripe|green|gratis|graphics|grainger|gov|got|gop|google|goog|",
  "goodyear|goodhands|goo|golf|goldpoint|gold|godaddy|gmx|gmo|gmbh|",
  "gmail|globo|global|gle|glass|glade|giving|gives|gifts|gift|ggee|",
  "george|genting|gent|gea|gdn|gbiz|gay|garden|gap|games|game|gallup|",
  "gallo|gallery|gal|fyi|futbol|furniture|fund|fun|fujixerox|fujitsu|",
  "ftr|frontier|frontdoor|frogans|frl|fresenius|free|fox|foundation|",
  "forum|forsale|forex|ford|football|foodnetwork|food|foo|fly|",
  "flsmidth|flowers|florist|flir|flights|flickr|fitness|fit|fishing|",
  "fish|firmdale|firestone|fire|financial|finance|final|film|fido|",
  "fidelity|fiat|ferrero|ferrari|feedback|fedex|fast|fashion|farmers|",
  "farm|fans|fan|family|faith|fairwinds|fail|fage|extraspace|express|",
  "exposed|expert|exchange|everbank|events|eus|eurovision|etisalat|",
  "esurance|estate|esq|erni|ericsson|equipment|epson|epost|",
  "enterprises|engineering|engineer|energy|emerck|email|education|",
  "edu|edeka|eco|eat|earth|dvr|dvag|durban|dupont|duns|dunlop|duck|",
  "dubai|dtv|drive|download|dot|doosan|domains|doha|dog|dodge|doctor|",
  "docs|dnp|diy|dish|discover|discount|directory|direct|digital|diet|",
  "diamonds|dhl|dev|design|desi|dentist|dental|democrat|delta|",
  "deloitte|dell|delivery|degree|deals|dealer|deal|dds|dclk|day|",
  "datsun|dating|date|data|dance|dad|dabur|cyou|cymru|cuisinella|csc|",
  "cruises|cruise|crs|crown|cricket|creditunion|creditcard|credit|",
  "cpa|courses|coupons|coupon|country|corsica|coop|cool|",
  "cookingchannel|cooking|contractors|contact|consulting|",
  "construction|condos|comsec|computer|compare|company|community|",
  "commbank|comcast|com|cologne|college|coffee|codes|coach|clubmed|",
  "club|cloud|clothing|clinique|clinic|click|cleaning|claims|",
  "cityeats|city|citic|citi|citadel|cisco|circle|cipriani|church|",
  "chrysler|chrome|christmas|chloe|chintai|cheap|chat|chase|charity|",
  "channel|chanel|cfd|cfa|cern|ceo|center|ceb|cbs|cbre|cbn|cba|",
  "catholic|catering|cat|casino|cash|caseih|case|casa|cartier|cars|",
  "careers|career|care|cards|caravan|car|capitalone|capital|capetown|",
  "canon|cancerresearch|camp|camera|cam|calvinklein|call|cal|cafe|",
  "cab|bzh|buzz|buy|business|builders|build|bugatti|budapest|",
  "brussels|brother|broker|broadway|bridgestone|bradesco|box|",
  "boutique|bot|boston|bostik|bosch|boots|booking|book|boo|bond|bom|",
  "bofa|boehringer|boats|bnpparibas|bnl|bmw|bms|blue|bloomberg|blog|",
  "blockbuster|blanco|blackfriday|black|biz|bio|bingo|bing|bike|bid|",
  "bible|bharti|bet|bestbuy|best|berlin|bentley|beer|beauty|beats|",
  "bcn|bcg|bbva|bbt|bbc|bayern|bauhaus|basketball|baseball|bargains|",
  "barefoot|barclays|barclaycard|barcelona|bar|bank|band|",
  "bananarepublic|banamex|baidu|baby|azure|axa|aws|avianca|autos|",
  "auto|author|auspost|audio|audible|audi|auction|attorney|athleta|",
  "associates|asia|asda|arte|art|arpa|army|archi|aramco|arab|",
  "aquarelle|apple|app|apartments|aol|anz|anquan|android|analytics|",
  "amsterdam|amica|amfam|amex|americanfamily|americanexpress|alstom|",
  "alsace|ally|allstate|allfinanz|alipay|alibaba|alfaromeo|akdn|",
  "airtel|airforce|airbus|aigo|aig|agency|agakhan|africa|afl|",
  "afamilycompany|aetna|aero|aeg|adult|ads|adac|actor|active|aco|",
  "accountants|accountant|accenture|academy|abudhabi|abogado|able|",
  "abc|abbvie|abbott|abb|abarth|aarp|aaa|onion",
].join("");

const countryDomains = [
  "한국|香港|澳門|新加坡|台灣|台湾|中國|中国|გე|ລາວ|ไทย|ලංකා|ഭാരതം|ಭಾರತ|భారత్|",
  "சிங்கப்பூர்|இலங்கை|இந்தியா|ଭାରତ|ભારત|ਭਾਰਤ|ভাৰত|ভারত|বাংলা|भारोत|",
  "भारतम्|भारत|ڀارت|پاکستان|موريتانيا|مليسيا|مصر|قطر|فلسطين|عمان|",
  "عراق|سورية|سودان|تونس|بھارت|بارت|ایران|امارات|المغرب|السعودية|",
  "الجزائر|البحرين|الاردن|հայ|қаз|укр|срб|рф|мон|мкд|ею|бел|бг|ευ|ελ|",
  "zw|zm|za|yt|ye|ws|wf|vu|vn|vi|vg|ve|vc|va|uz|uy|us|um|uk|ug|ua|tz|",
  "tw|tv|tt|tr|tp|to|tn|tm|tl|tk|tj|th|tg|tf|td|tc|sz|sy|sx|sv|su|st|",
  "ss|sr|so|sn|sm|sl|sk|sj|si|sh|sg|se|sd|sc|sb|sa|rw|ru|rs|ro|re|qa|",
  "py|pw|pt|ps|pr|pn|pm|pl|pk|ph|pg|pf|pe|pa|om|nz|nu|nr|np|no|nl|ni|",
  "ng|nf|ne|nc|na|mz|my|mx|mw|mv|mu|mt|ms|mr|mq|mp|mo|mn|mm|ml|mk|mh|",
  "mg|mf|me|md|mc|ma|ly|lv|lu|lt|ls|lr|lk|li|lc|lb|la|kz|ky|kw|kr|kp|",
  "kn|km|ki|kh|kg|ke|jp|jo|jm|je|it|is|ir|iq|io|in|im|il|ie|id|hu|ht|",
  "hr|hn|hm|hk|gy|gw|gu|gt|gs|gr|gq|gp|gn|gm|gl|gi|gh|gg|gf|ge|gd|gb|",
  "ga|fr|fo|fm|fk|fj|fi|eu|et|es|er|eh|eg|ee|ec|dz|do|dm|dk|dj|de|cz|",
  "cy|cx|cw|cv|cu|cr|co|cn|cm|cl|ck|ci|ch|cg|cf|cd|cc|ca|bz|by|bw|bv|",
  "bt|bs|br|bq|bo|bn|bm|bl|bj|bi|bh|bg|bf|be|bd|bb|ba|az|ax|aw|au|at|",
  "as|ar|aq|ao|an|am|al|ai|ag|af|ae|ad|ac",
].join("");

// Builds a pattern's source from the parts it names as `#{name}`.
const supplant = (
  source: string,
  parts: Readonly<Record<string, string>>
): string =>
  source.replaceAll(
    /#\{(?<name>\w+)\}/gu,
    (_, name: string) => parts[name] ?? ""
  );

// A top-level domain ends where no letter, digit, `@`, `+` or `-` follows.
const topLevel = (domains: string) =>
  `(?:(?:${domains})(?=[^0-9a-zA-Z@+\\-]|$))`;

const invalidCharacters = String.raw`￾﻿￿`;

const directionalMarkers = String.raw`‪-‮؜‎‏⁦-⁩`;

const spaces = String.raw`\x09-\x0D\x20\x85\xA0 ᠎ -     　`;

const punctuation = String.raw`!'#%&\(\)*+,\\\-.\/:;<=>?@\[\]\^_\{\|\}~$`;

const latinAccents = String.raw`\xC0-\xD6\xD8-\xF6\xF8-\xFFĀ-ɏɓɔɖɗəɛɣɨɯɲʉʋʻ̀-ͯḀ-ỿ`;

const cyrillic = String.raw`Ѐ-ӿ`;

const parts = {
  cyrillic,
  directionalMarkers,
  invalidCharacters,
  latinAccents,
  punctuation,
  spaces,
};

const domainCharacter = supplant(
  "[^#{punctuation}#{spaces}#{invalidCharacters}#{directionalMarkers}]",
  parts
);

const punycode = "(?:xn--[\\-0-9a-z]+)";

const anyTopLevel = `(?:${topLevel(genericDomains)}|${topLevel(countryDomains)}|${punycode})`;

const domain = supplant(
  "(?:(?:(?:#{c}(?:[_\\-]|#{c})*)?#{c}\\.)*(?:(?:#{c}(?:-|#{c})*)?#{c}\\.)#{tld})",
  { c: domainCharacter, tld: anyTopLevel }
);

const pathCharacter = supplant(
  "[a-z#{cyrillic}0-9!*';:=+,.$\\/%#\\[\\]\\-\\u2013_~@|&#{latinAccents}]",
  parts
);

const balancedParentheses = supplant(
  "\\((?:#{p}+|(?:#{p}*\\(#{p}+\\)#{p}*))\\)",
  { p: pathCharacter }
);

// Left ungrouped, as twitter-text has it: inside the path, its `|` splits
// the path's first form in two.
const pathEnding = supplant(
  "[+\\-a-z#{cyrillic}0-9=_#\\/#{latinAccents}]|(?:#{parens})",
  { ...parts, parens: balancedParentheses }
);

const path = supplant("(?:(?:#{p}*(?:#{parens}#{p}*)*#{end})|(?:@#{p}+\\/))", {
  end: pathEnding,
  p: pathCharacter,
  parens: balancedParentheses,
});

const queryCharacter = "[a-z0-9!?*'@\\(\\);:&=+$\\/%#\\[\\]\\-_.,~|]";

const queryEnding = "[a-z0-9\\-_&=#\\/]";

const preceding = supplant(
  "(?:[^A-Za-z0-9@＠$#＃#{invalidCharacters}]|[#{directionalMarkers}]|^)",
  parts
);

// What precedes the link, then the link: its scheme, domain, port, path
// and query.
const linkPattern = new RegExp(
  supplant(
    "(?<before>#{preceding})(?<url>(?<scheme>https?:\\/\\/)?(?<host>#{domain})(?::[0-9]+)?(?<path>\\/#{path}*)?(?:\\?#{query}*#{queryEnding})?)",
    { domain, path, preceding, query: queryCharacter, queryEnding }
  ),
  "giu"
);

const asciiDomainSource = supplant(
  "(?:(?:[\\-a-z0-9#{latinAccents}]+)\\.)+#{tld}",
  { ...parts, tld: anyTopLevel }
);

const asciiDomains = new RegExp(asciiDomainSource, "giu");

const asciiDomain = new RegExp(asciiDomainSource, "iu");

const shortLink = new RegExp(
  supplant(
    "^https?:\\/\\/t\\.co\\/(?<slug>[a-z0-9]+)(?:\\?#{query}*#{queryEnding})?",
    {
      query: queryCharacter,
      queryEnding,
    }
  ),
  "iu"
);

// A link without a scheme cannot follow these.
const invalidBeforeBareLink = /[-_./]$/u;

const maxLinkLength = 4096;

const maxShortLinkSlug = 40;

const maxLabelLength = 63;

const defaultScheme = "https://";

// Punycode (RFC 3492), as IDNA encodes a label that is not ASCII.
const base = 36;
const tMin = 1;
const tMax = 26;
const skew = 38;
const damp = 700;
const initialBias = 72;
const initialN = 128;

const adapt = (delta: number, points: number, first: boolean): number => {
  let scaled = Math.floor(first ? delta / damp : delta / 2);
  scaled += Math.floor(scaled / points);
  let k = 0;

  while (scaled > Math.floor(((base - tMin) * tMax) / 2)) {
    scaled = Math.floor(scaled / (base - tMin));
    k += base;
  }

  return Math.floor(k + ((base - tMin + 1) * scaled) / (scaled + skew));
};

const digitOf = (digit: number): string =>
  String.fromCodePoint(digit < 26 ? digit + 97 : digit + 22);

const threshold = (k: number, bias: number): number => {
  if (k <= bias) {
    return tMin;
  }

  return k >= bias + tMax ? tMax : k - bias;
};

// A delta as punycode's variable-length digits.
const deltaDigits = (delta: number, bias: number): string => {
  let digits = "";
  let q = delta;
  let k = base;
  let t = threshold(k, bias);

  while (q >= t) {
    digits += digitOf(t + ((q - t) % (base - t)));
    q = Math.floor((q - t) / (base - t));
    k += base;
    t = threshold(k, bias);
  }

  return digits + digitOf(q);
};

const punycodeOf = (label: string): string => {
  const points = Array.from(
    label,
    (character) => character.codePointAt(0) ?? 0
  );

  const basic = points.filter((point) => point < initialN);

  let output = String.fromCodePoint(...basic);
  let handled = basic.length;

  if (handled > 0) {
    output += "-";
  }

  let n = initialN;
  let delta = 0;
  let bias = initialBias;

  while (handled < points.length) {
    let next = Number.POSITIVE_INFINITY;

    for (const point of points) {
      if (point >= n && point < next) {
        next = point;
      }
    }

    delta += (next - n) * (handled + 1);
    n = next;

    for (const point of points) {
      if (point < n) {
        delta += 1;
      } else if (point === n) {
        output += deltaDigits(delta, bias);
        bias = adapt(delta, handled + 1, handled === basic.length);
        delta = 0;
        handled += 1;
      }
    }

    delta += 1;
    n += 1;
  }

  return output;
};

const nonAscii = /[^\u0020-\u007E]/u;

const labelSeparators = /[。．｡]/u;

// A label as IDNA writes it in ASCII, as twitter-text's punycode does: the
// ideographic full stops it also takes for dots split it further.
const asciiLabel = (label: string): string =>
  label
    .split(labelSeparators)
    .map((part) => (nonAscii.test(part) ? `xn--${punycodeOf(part)}` : part))
    .join(".");

// Whether a domain can be written in ASCII, each label 1 to 63 long. The
// patterns read `folded`; the labels are encoded as written.
const isValidDomain = (folded: string, host: string): boolean =>
  (!folded.startsWith("xn--") || asciiDomain.test(folded)) &&
  host.split(".").every((label) => {
    const { length } = asciiLabel(label);

    return length >= 1 && length <= maxLabelLength;
  });

// Unicode-aware patterns ignore case by Unicode's folding, which maps the
// long s and the Kelvin sign onto ASCII letters; twitter-text's patterns
// do not. Each is read as another letter that, like it, folds onto none,
// one UTF-16 unit for one, so offsets stay the same.
const asciiFolding = /[ſK]/gu;

const unfolded = (character: string) => (character === "ſ" ? "ƀ" : "℩");

/** A link X finds, by its UTF-16 offsets in the text. */
export interface XLink {
  readonly end: number;
  readonly start: number;
  readonly url: string;
}

// Where a link the pattern matched lies in the text.
interface Matched {
  readonly end: number;
  // Where its domain ends.
  readonly hostEnd: number;
  readonly start: number;
}

// The ASCII domains a link without a scheme holds, each one a link, the
// last one running to the end of the link when it has a path.
const bareLinks = (
  text: string,
  host: string,
  hasPath: boolean,
  { end, hostEnd, start }: Matched
): readonly XLink[] => {
  const found: XLink[] = [];
  let from = 0;

  for (const [ascii] of host.matchAll(asciiDomains)) {
    const at = host.indexOf(ascii, from);

    from = at + ascii.length;
    found.push({
      end: start + from,
      start: start + at,
      url: text.slice(start + at, start + from),
    });
  }

  const last = found.at(-1);

  if (last === undefined || !hasPath) {
    return found;
  }

  return [
    ...found.slice(0, -1),
    {
      end,
      start: last.start,
      url: last.url + text.slice(hostEnd, end),
    },
  ];
};

// A link with a scheme, a `t.co` one cut after its slug, which may be no
// longer than 40.
const schemedLink = (text: string, url: string, start: number): XLink[] => {
  const short = shortLink.exec(url);

  if (short === null) {
    return [
      {
        end: start + url.length,
        start,
        url: text.slice(start, start + url.length),
      },
    ];
  }

  const { slug = "" } = short.groups ?? {};
  const end = start + short[0].length;

  return slug.length <= maxShortLinkSlug
    ? [{ end, start, url: text.slice(start, end) }]
    : [];
};

// The links one match of the pattern makes in `text`, read in `folded`.
const linksOf = (
  text: string,
  folded: string,
  match: RegExpExecArray
): readonly XLink[] => {
  const {
    before = "",
    host = "",
    path: linkPath = "",
    scheme = "",
    url = "",
  } = match.groups ?? {};

  const start = match.index + before.length;
  const hostStart = start + scheme.length;
  const hostEnd = hostStart + host.length;
  const bare = scheme === "";
  // twitter-text reads UTF-16 units: after a character outside the Basic
  // Multilingual Plane, its domain without a scheme starts with that
  // character's second half.
  const halfBefore = bare && before.length === 2 ? 1 : 0;
  const checkedFrom = hostStart - halfBefore;

  const valid =
    isValidDomain(
      folded.slice(checkedFrom, hostEnd),
      text.slice(checkedFrom, hostEnd)
    ) &&
    (bare ? defaultScheme : scheme).length + url.length + halfBefore <=
      maxLinkLength;

  if (!valid) {
    return [];
  }

  if (!bare) {
    return schemedLink(text, url, start);
  }

  return invalidBeforeBareLink.test(before)
    ? []
    : bareLinks(text, host, linkPath !== "", {
        end: start + url.length,
        hostEnd,
        start,
      });
};

/**
 * The links in `text`, in order, as X finds them: a valid domain with an
 * optional `http://` or `https://`, port, path and query, after a space,
 * punctuation or the start. A link without a scheme must be ASCII and not
 * follow `-`, `_`, `.` or `/`, and keeps its path only; a `t.co` link stops
 * after its slug.
 */
export const xLinksIn = (text: string): readonly XLink[] => {
  if (!text.includes(".")) {
    return [];
  }

  const folded = text.replaceAll(asciiFolding, unfolded);

  return Array.from(folded.matchAll(linkPattern), (match) =>
    linksOf(text, folded, match)
  ).flat();
};
