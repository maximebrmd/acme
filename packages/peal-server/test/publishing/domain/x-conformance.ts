// Cases from twitter-text's conformance suite (Apache-2.0,
// https://github.com/twitter/twitter-text, conformance/extract.yml and
// validate.yml), which X's counting is checked against: the links it
// finds, and the weighted length of a text. Long cases are left out.

/** A text and the links twitter-text finds in it. */
export interface LinkCase {
  readonly description: string;
  readonly expected: readonly string[];
  readonly text: string;
}

/** A text and where twitter-text finds each link, in UTF-16 units. */
export interface IndexedLinkCase {
  readonly description: string;
  readonly expected: readonly {
    readonly indices: readonly [number, number];
    readonly url: string;
  }[];
  readonly text: string;
}

/** A text and its weighted length. */
export interface WeightedCase {
  readonly description: string;
  readonly text: string;
  readonly weightedLength: number;
}

export const linkCases: readonly LinkCase[] = [
  {
    description: "Extract a lone URL",
    expected: ["http://example.com"],
    text: "http://example.com",
  },
  {
    description: "Extract a lone unicode url",
    expected: ["http://ああ.com"],
    text: "http://ああ.com",
  },
  {
    description: "Extract a lone unicode url with -",
    expected: ["http://あ-あ.com"],
    text: "http://あ-あ.com",
  },
  {
    description: "Extract valid URL: http://google.com",
    expected: ["http://google.com"],
    text: "text http://google.com",
  },
  {
    description: "Extract valid URL: http://foobar.com/#",
    expected: ["http://foobar.com/#"],
    text: "text http://foobar.com/#",
  },
  {
    description: "Extract valid URL: http://google.com/#foo",
    expected: ["http://google.com/#foo"],
    text: "text http://google.com/#foo",
  },
  {
    description:
      "Extract valid URL: http://google.com/#search?q=iphone%20-filter%3Alinks",
    expected: ["http://google.com/#search?q=iphone%20-filter%3Alinks"],
    text: "text http://google.com/#search?q=iphone%20-filter%3Alinks",
  },
  {
    description:
      "Extract valid URL: http://twitter.com/#search?q=iphone%20-filter%3Alinks",
    expected: ["http://twitter.com/#search?q=iphone%20-filter%3Alinks"],
    text: "text http://twitter.com/#search?q=iphone%20-filter%3Alinks",
  },
  {
    description:
      "Extract valid URL: http://somedomain.com/index.php?path=/abc/def/",
    expected: ["http://somedomain.com/index.php?path=/abc/def/"],
    text: "text http://somedomain.com/index.php?path=/abc/def/",
  },
  {
    description:
      "Extract valid URL: http://www.boingboing.net/2007/02/14/katamari_damacy_phon.html",
    expected: [
      "http://www.boingboing.net/2007/02/14/katamari_damacy_phon.html",
    ],
    text: "text http://www.boingboing.net/2007/02/14/katamari_damacy_phon.html",
  },
  {
    description: "Extract valid URL: http://somehost.com:3000",
    expected: ["http://somehost.com:3000"],
    text: "text http://somehost.com:3000",
  },
  {
    description: "Extract valid URL: http://xo.com/~matthew+%ff-x",
    expected: ["http://xo.com/~matthew+%ff-x"],
    text: "text http://xo.com/~matthew+%ff-x",
  },
  {
    description: "Extract valid URL: http://xo.com/~matthew+%ff-,.;x",
    expected: ["http://xo.com/~matthew+%ff-,.;x"],
    text: "text http://xo.com/~matthew+%ff-,.;x",
  },
  {
    description: "Extract valid URL: http://xo.com/,.;x",
    expected: ["http://xo.com/,.;x"],
    text: "text http://xo.com/,.;x",
  },
  {
    description:
      "Extract valid URL: http://en.wikipedia.org/wiki/Primer_(film)",
    expected: ["http://en.wikipedia.org/wiki/Primer_(film)"],
    text: "text http://en.wikipedia.org/wiki/Primer_(film)",
  },
  {
    description:
      "Extract valid URL: http://www.ams.org/bookstore-getitem/item=mbk-59",
    expected: ["http://www.ams.org/bookstore-getitem/item=mbk-59"],
    text: "text http://www.ams.org/bookstore-getitem/item=mbk-59",
  },
  {
    description: "Extract valid URL: http://✪df.ws/ejp",
    expected: ["http://✪df.ws/ejp"],
    text: "text http://✪df.ws/ejp",
  },
  {
    description: "Extract valid URL: http://example.com/",
    expected: ["http://example.com"],
    text: "test http://example.comだよね.comtest/hogehoge",
  },
  {
    description: "Extract valid URL: http://chilp.it/?77e8fd",
    expected: ["http://chilp.it/?77e8fd"],
    text: "text http://chilp.it/?77e8fd",
  },
  {
    description: "Extract valid URL: http://x.com/oneletterdomain",
    expected: ["http://x.com/oneletterdomain"],
    text: "text http://x.com/oneletterdomain",
  },
  {
    description:
      "Extract valid URL: http://msdn.microsoft.com/ja-jp/library/system.net.httpwebrequest(v=VS.100).aspx",
    expected: [
      "http://msdn.microsoft.com/ja-jp/library/system.net.httpwebrequest(v=VS.100).aspx",
    ],
    text: "text http://msdn.microsoft.com/ja-jp/library/system.net.httpwebrequest(v=VS.100).aspx",
  },
  {
    description:
      "Extract valid URL with hyphen as query ending char: https://www.youtube.com/watch?v=LOxOAuDHzaw&list=PLPoq910Q9jXhuH6pit_KwIsck9fEz_9U-",
    expected: [
      "https://www.youtube.com/watch?v=LOxOAuDHzaw&list=PLPoq910Q9jXhuH6pit_KwIsck9fEz_9U-",
    ],
    text: "text https://www.youtube.com/watch?v=LOxOAuDHzaw&list=PLPoq910Q9jXhuH6pit_KwIsck9fEz_9U-",
  },
  {
    description: "DO NOT extract invalid URL: http://no-tld",
    expected: [],
    text: "text http://no-tld",
  },
  {
    description: "DO NOT extract invalid URL: http://tld-too-short.x",
    expected: [],
    text: "text http://tld-too-short.x",
  },
  {
    description:
      "DO NOT extract invalid URL with invalid preceding character: (http://twitter.com",
    expected: ["http://twitter.com"],
    text: "(http://twitter.com",
  },
  {
    description:
      "Extract a very long hyphenated sub-domain URL (single letter hyphens)",
    expected: ["http://word-and-a-number-8-ftw.domain.com/"],
    text: "text http://word-and-a-number-8-ftw.domain.com/",
  },
  {
    description:
      "DO NOT Extract a hyphenated TLD (even though it's usually a typo)",
    expected: [],
    text: "text http://domain.com-that-you-should-have-put-a-space-after",
  },
  {
    description: "Extract URL ending with # value",
    expected: ["http://foo.com?#foo"],
    text: "text http://foo.com?#foo text",
  },
  {
    description:
      "Extract URLs without protocol on (com|org|edu|gov|net) domains",
    expected: ["foo.com", "foo.net", "foo.org", "foo.edu", "foo.gov"],
    text: "foo.com foo.net foo.org foo.edu foo.gov",
  },
  {
    description:
      "Extract URLs without protocol not on (com|org|edu|gov|net) domains",
    expected: ["foo.co.jp", "www.foo.co.uk", "foo.jp"],
    text: "foo.baz foo.co.jp www.xxxxxxx.baz www.foo.co.uk wwwww.xxxxxxx foo.comm foo.somecom foo.govedu foo.jp",
  },
  {
    description: "Extract URLs without protocol on ccTLD with slash",
    expected: ["t.co/abcde", "bit.ly/abcde"],
    text: "t.co/abcde bit.ly/abcde",
  },
  {
    description: "Extract URLs with protocol on ccTLD domains",
    expected: ["http://foo.jp", "http://fooooo.jp"],
    text: "http://foo.jp http://fooooo.jp",
  },
  {
    description: "Extract URLs with a - or + at the end of the path",
    expected: ["http://example.com/a+", "http://example.com/a-"],
    text: "Go to http://example.com/a+ or http://example.com/a-",
  },
  {
    description: "Extract URLs with longer paths ending in -",
    expected: ["http://example.com/view/slug-url-?foo=bar"],
    text: "Go to http://example.com/view/slug-url-?foo=bar",
  },
  {
    description: "Extract URLs with an en dash in the path",
    expected: ["https://en.m.wikipedia.org/wiki/Hatfield–McCoy_feud"],
    text: "Go to https://en.m.wikipedia.org/wiki/Hatfield–McCoy_feud please",
  },
  {
    description: "Extract URLs beginning with a space",
    expected: ["example.com/path"],
    text: "@user Try http:// example.com/path",
  },
  {
    description:
      "Extract long URL without protocol surrounded by CJK characters",
    expected: ["example.com/path/index.html", "example.com/path"],
    text: "これは日本語です。example.com/path/index.html中国語example.com/path한국",
  },
  {
    description:
      "Extract short URL without protocol surrounded by CJK characters",
    expected: [
      "twitter.com",
      "example.com",
      "t.co/abcde",
      "twitter.com",
      "example2.com",
      "twitter.com/abcde",
    ],
    text: "twitter.comこれは日本語です。example.com中国語t.co/abcde한국twitter.com example2.comテストtwitter.com/abcde",
  },
  {
    description:
      "Extract URLs with and without protocol surrounded by CJK characters",
    expected: [
      "http://twitter.com/",
      "example.com",
      "http://t.co/abcde",
      "twitter.com",
      "example2.com",
      "http://twitter.com/abcde",
    ],
    text: "http://twitter.com/これは日本語です。example.com中国語http://t.co/abcde한국twitter.comテストexample2.comテストhttp://twitter.com/abcde",
  },
  {
    description:
      "Extract URLs with protocol and path containing Cyrillic characters",
    expected: ["http://twitter.com/Русские_слова"],
    text: "Go to http://twitter.com/Русские_слова",
  },
  {
    description:
      "Extract non-ASCII host name URLs with protocol, but ignore host names bigger than 63 characters. Also handle exceptions for non-ASCII hostnames longer than 256 characters",
    expected: ["http://exampleこれは日本語です.com/path/index.html"],
    text: "http://exampleこれは日本語です.com/path/index.html http://あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ.com/path/index.html",
  },
  {
    description:
      "Extract short URLs without protocol on ccTLD domains without path",
    expected: ["twitter.jp", "it.so", "foo.jp", "it.so", "foo.jp"],
    text: "twitter.jp日本語it.so中国語foo.jp it.so foo.jp",
  },
  {
    description: "DO NOT extract invalid URL",
    expected: [],
    text: "Hello http://xn--はじめよう.com/index.html",
  },
  {
    description:
      "DO NOT Extract URL with domain preceeded by underscore: http://domain-begin_dash_2314352345_dfasd.foo-cow_4352.com",
    expected: [],
    text: "text http://domain-dash_2314352345_dfasd.foo-cow_4352.com",
  },
  {
    description:
      "DO NOT Extract URLs with a - or + in the middle of an email address",
    expected: [],
    text: "Email me at name.al-lastname@foo.com or name.al+lastname@foo.com",
  },
  {
    description: "Extract URLs with a - in the middle",
    expected: ["name.al-lastname.com"],
    text: "Find my page at name.al-lastname.com",
  },
  {
    description:
      "Extract some (tv|co) short URLs without protocol on ccTLD domains without path",
    expected: ["MLB.tv", "vine.co", "twitch.tv", "t.co"],
    text: "MLB.tv vine.co twitch.tv t.co",
  },
  {
    description: "Extract URLs beginning with a non-breaking space (U+00A0)",
    expected: ["example.com/path"],
    text: "@user Try http://\u00A0example.com/path",
  },
  {
    description: "Extract URLs with underscores and dashes in the subdomain",
    expected: ["http://sub_domain-dash.twitter.com"],
    text: "test http://sub_domain-dash.twitter.com",
  },
  {
    description: "Extract URL with minimum number of valid characters",
    expected: ["http://a.b.cd"],
    text: "test http://a.b.cd",
  },
  {
    description: "Extract URLs containing underscores and dashes",
    expected: ["http://a_b.c-d.com"],
    text: "test http://a_b.c-d.com",
  },
  {
    description: "Extract URLs containing dashes in the subdomain",
    expected: ["http://a-b.c.com"],
    text: "test http://a-b.c.com",
  },
  {
    description: "Extract URLs with dashes in the domain name",
    expected: ["http://twitter-dash.com"],
    text: "test http://twitter-dash.com",
  },
  {
    description: "Extract URLs with lots of symbols then a period",
    expected: [
      "http://www.bestbuy.com/site/Currie+Technologies+-+Ezip+400+Scooter/9885188.p?id=1218189013070&skuId=9885188",
    ],
    text: "http://www.bestbuy.com/site/Currie+Technologies+-+Ezip+400+Scooter/9885188.p?id=1218189013070&skuId=9885188",
  },
  {
    description:
      "DO NOT extract URLs containing leading dashes in the subdomain",
    expected: [],
    text: "test http://-leadingdash.twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing leading dashes in the domain with a subdomain",
    expected: [],
    text: "test http://leadingdash.-twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing trailing dashes in the subdomain",
    expected: [],
    text: "test http://trailingdash-.twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing trailing dashes in the domain with a subdomain",
    expected: [],
    text: "test http://trailingdash.twitter-.com",
  },
  {
    description:
      "DO NOT extract URLs containing leading underscores in the subdomain",
    expected: [],
    text: "test http://_leadingunderscore.twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing leading underscores in the domain with a subdomain",
    expected: [],
    text: "test http://leadingunderscore._twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing trailing underscores in the subdomain",
    expected: [],
    text: "test http://trailingunderscore_.twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing trailing underscores in the domain with a subdomain",
    expected: [],
    text: "test http://trailingunderscore.twitter_.com",
  },
  {
    description:
      "DO NOT extract URLs containing leading dashes in the domain name",
    expected: [],
    text: "test http://-twitter.com",
  },
  {
    description:
      "DO NOT extract URLs containing trailing dashes in the domain name",
    expected: [],
    text: "test http://twitter-.com",
  },
  {
    description:
      "DO NOT extract URLs containing underscores in the domain name",
    expected: [],
    text: "test http://twitter_underscore.com",
  },
  {
    description: "DO NOT extract URLs containing underscores in the tld",
    expected: [],
    text: "test http://twitter.c_o_m",
  },
  {
    description: "Extract valid URL http://www.foo.com/foo/path-with-period./",
    expected: ["http://www.foo.com/foo/path-with-period./"],
    text: "test http://www.foo.com/foo/path-with-period./",
  },
  {
    description: "Extract valid URL http://www.foo.org.za/foo/bar/688.1",
    expected: ["http://www.foo.org.za/foo/bar/688.1"],
    text: "test http://www.foo.org.za/foo/bar/688.1",
  },
  {
    description:
      "Extract valid URL http://www.foo.com/bar-path/some.stm?param1=foo;param2=P1|0||P2|0",
    expected: [
      "http://www.foo.com/bar-path/some.stm?param1=foo;param2=P1|0||P2|0",
    ],
    text: "test http://www.foo.com/bar-path/some.stm?param1=foo;param2=P1|0||P2|0",
  },
  {
    description: "Extract valid URL http://foo.com/bar/123/foo_&_bar/",
    expected: ["http://foo.com/bar/123/foo_&_bar/"],
    text: "test http://foo.com/bar/123/foo_&_bar/",
  },
  {
    description: "Extract valid URL http://www.cp.sc.edu/events/65",
    expected: ["http://www.cp.sc.edu/events/65"],
    text: "test http://www.cp.sc.edu/events/65 test",
  },
  {
    description:
      "Extract valid URL http://www.andersondaradio.no.comunidades.net/",
    expected: ["http://www.andersondaradio.no.comunidades.net/"],
    text: "http://www.andersondaradio.no.comunidades.net/ test test",
  },
  {
    description: "Extract valid URL ELPAÍS.com",
    expected: ["ELPAÍS.com"],
    text: "test ELPAÍS.com",
  },
  {
    description: "DO NOT include period at the end of URL",
    expected: ["http://twitter.com/"],
    text: "test http://twitter.com/.",
  },
  {
    description: "Extract a URL with '?' in fragment",
    expected: [
      "http://tn.com.ar/show/00056158/la-estrella-del-certamen-el-turno-de-pamela-anderson?fb_xd_fragment#?=&cb=fe17523f223b7&relation=parent.parent&transport=fragment&type=resize&height=20&ackdata",
    ],
    text: "http://tn.com.ar/show/00056158/la-estrella-del-certamen-el-turno-de-pamela-anderson?fb_xd_fragment#?=&cb=fe17523f223b7&relation=parent.parent&transport=fragment&type=resize&height=20&ackdata",
  },
  {
    description: "Extract a URL with '?' in fragment in a text",
    expected: [
      "http://tn.com.ar/show/00056158/la-estrella-del-certamen-el-turno-de-pamela-anderson?fb_xd_fragment#?=&cb=fe17523f223b7&relation=parent.parent&transport=fragment&type=resize&height=20&ackdata",
    ],
    text: "text http://tn.com.ar/show/00056158/la-estrella-del-certamen-el-turno-de-pamela-anderson?fb_xd_fragment#?=&cb=fe17523f223b7&relation=parent.parent&transport=fragment&type=resize&height=20&ackdata text",
  },
  {
    description: "Extract a URL with a ton of trailing periods",
    expected: ["http://example.com/path"],
    text: "Test a ton of periods http://example.com/path..........................................",
  },
  {
    description: "Extract a URL with a ton of trailing commas",
    expected: ["http://example.com/"],
    text: "Test a ton of periods http://example.com/,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  },
  {
    description: "Extract a URL with a ton of trailing '!'",
    expected: ["http://example.com/path/"],
    text: "Test a ton of periods http://example.com/path/!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  },
  {
    description: "DO NOT extract URLs in hashtag or @mention",
    expected: [],
    text: "#test.com @test.com #http://test.com @http://test.com #t.co/abcde @t.co/abcde",
  },
  {
    description: "Extract a t.co URL with a trailing apostrophe",
    expected: ["http://t.co/pbY2NfTZ"],
    text: "I really like http://t.co/pbY2NfTZ's website",
  },
  {
    description: "Extract a t.co URL with a trailing hyphen",
    expected: ["http://t.co/FNkPfmii"],
    text: "Check this site out http://t.co/FNkPfmii- it's great",
  },
  {
    description: "Extract a t.co URL with a trailing colon",
    expected: ["http://t.co/ulYGBYSo"],
    text: "According to http://t.co/ulYGBYSo: the internet is cool",
  },
  {
    description: "Extract a t.co URL with a long path",
    expected: ["http://t.co/abcdefghijklmnopqrstuvwxyz0123456789"],
    text: "I really like http://t.co/abcdefghijklmnopqrstuvwxyz0123456789",
  },
  {
    description: "DO NOT extract URLs with > 40 characters in a t.co slug",
    expected: [],
    text: "I really like http://t.co/abcdefghijklmnopqrstuvwxyz012345678901234",
  },
  {
    description: "Extract domain followed by Japanese characters",
    expected: ["example.com", "twitter.みんな"],
    text: "example.comてすとですtwitter.みんなです",
  },
  {
    description: "Extract URL before newline",
    expected: [
      "http://twitter.com",
      "http://example.com",
      "http://example.com/path",
      "example.com/path",
      "it.so",
      "it.so/abcde",
    ],
    text: "http://twitter.com\u000Ahttp://example.com\u000Ahttp://example.com/path\u000Aexample.com/path\u000Ait.so\u000Ait.so/abcde",
  },
  {
    description: "DO NOT extract URL if preceded by $",
    expected: [],
    text: "$http://twitter.com $twitter.com $http://t.co/abcde $t.co/abcde $t.co $TVI.CA $RBS.CA",
  },
  {
    description: "DO NOT extract .bz2 file name as URL",
    expected: [],
    text: "long.test.tar.bz2 test.tar.bz2 tar.bz2",
  },
  {
    description: "DO NOT extract URL with gTLD followed by @ sign",
    expected: [],
    text: "john.doe.gov@mail.com",
  },
  {
    description: "DO NOT extract URL with ccTLD followed by @ sign",
    expected: [],
    text: "john.doe.jp@mail.com",
  },
  {
    description: "Extract valid URL with params: https://t.co/UqIyJAJTfo?amp=1",
    expected: ["https://t.co/UqIyJAJTfo?amp=1"],
    text: "text https://t.co/UqIyJAJTfo?amp=1",
  },
  {
    description:
      "Extract valid URL with params: https://t.co/UqIyJAJTfo?type=js",
    expected: ["https://t.co/UqIyJAJTfo?type=js"],
    text: "text https://t.co/UqIyJAJTfo?type=js",
  },
  {
    description:
      "Extract valid URL with params: https://t.co/UqIyJAJTfo?ssr=true",
    expected: ["https://t.co/UqIyJAJTfo?ssr=true"],
    text: "text https://t.co/UqIyJAJTfo?ssr=true",
  },
  {
    description: "Extract a valid URL with params: https://t.co/asdfdf?a=b#123",
    expected: ["https://t.co/asdfdf?a=b#123"],
    text: "text https://t.co/asdfdf?a=b#123",
  },
  {
    description:
      "Extract a valid URL with params: https://t.co/sadfasdf?a=b&c=d",
    expected: ["https://t.co/sadfasdf?a=b&c=d"],
    text: "text https://t.co/sadfasdf?a=b&c=d",
  },
];

export const indexedLinkCases: readonly IndexedLinkCase[] = [
  {
    description: "Extract URLs from RTL text",
    expected: [
      { indices: [7, 17], url: "abcdef.com" },
      { indices: [26, 45], url: "http://twitter.com/" },
    ],
    text: "\u2066\u202Atest abcdef.com پاکستان http://twitter.com/\u202C\u2069",
  },
  {
    description: "Extract URLs from RTL text with embedded directional marks",
    expected: [
      { indices: [17, 28], url: "twitter.com" },
      { indices: [33, 55], url: "http://foobar.پاکستان/" },
    ],
    text: "This is a test \u2066\u202Atwitter.com\u202C\u2069 \u2066\u202Ahttp://foobar.پاکستان/\u202C\u2069\u2069 قطر فلسطين عمان",
  },
  {
    description: "Extract a URL",
    expected: [{ indices: [5, 22], url: "http://google.com" }],
    text: "text http://google.com",
  },
  {
    description: "Extract a URL from a Japanese tweet",
    expected: [{ indices: [11, 28], url: "http://google.com" }],
    text: "皆さん見てください！ http://google.com",
  },
  {
    description: "Extract URLs without protocol on ccTLD with slash",
    expected: [
      { indices: [0, 10], url: "t.co/abcde" },
      { indices: [11, 23], url: "bit.ly/abcde" },
    ],
    text: "t.co/abcde bit.ly/abcde",
  },
  {
    description: "Extract URLs without protocol surrounded by CJK characters",
    expected: [
      { indices: [0, 11], url: "twitter.com" },
      { indices: [20, 31], url: "example.com" },
      { indices: [34, 44], url: "t.co/abcde" },
      { indices: [46, 57], url: "twitter.com" },
      { indices: [58, 70], url: "example2.com" },
      { indices: [73, 90], url: "twitter.com/abcde" },
    ],
    text: "twitter.comこれは日本語です。example.com中国語t.co/abcde한국twitter.com example2.comテストtwitter.com/abcde",
  },
  {
    description:
      "Extract URLs with and without protocol surrounded by CJK characters",
    expected: [
      { indices: [0, 19], url: "http://twitter.com/" },
      { indices: [28, 39], url: "example.com" },
      { indices: [42, 59], url: "http://t.co/abcde" },
      { indices: [61, 72], url: "twitter.com" },
      { indices: [75, 87], url: "example2.com" },
      { indices: [90, 114], url: "http://twitter.com/abcde" },
    ],
    text: "http://twitter.com/これは日本語です。example.com中国語http://t.co/abcde한국twitter.comテストexample2.comテストhttp://twitter.com/abcde",
  },
  {
    description:
      "Extract t.co URLs skipping trailing characters and adjusting indices correctly",
    expected: [
      { indices: [0, 20], url: "http://t.co/pbY2NfTZ" },
      { indices: [23, 43], url: "http://t.co/2vYHpAc5" },
      { indices: [45, 65], url: "http://t.co/ulYGBYSo" },
      { indices: [67, 87], url: "http://t.co/8MkmHU0k" },
      { indices: [90, 110], url: "http://t.co/TKLp64dY" },
      { indices: [113, 133], url: "http://t.co/8t7G3ddS" },
      { indices: [136, 156], url: "http://t.co/FNkPfmii" },
    ],
    text: "http://t.co/pbY2NfTZ's http://t.co/2vYHpAc5; http://t.co/ulYGBYSo: http://t.co/8MkmHU0k+c http://t.co/TKLp64dY.x http://t.co/8t7G3ddS#a http://t.co/FNkPfmii-",
  },
  {
    description: "Properly extract URL that contains t.co in referer",
    expected: [
      {
        indices: [0, 45],
        url: "http://www.foo.com?referer=https://t.co/abcde",
      },
      { indices: [46, 63], url: "http://t.co/xyzzy" },
    ],
    text: "http://www.foo.com?referer=https://t.co/abcde http://t.co/xyzzy",
  },
  {
    description:
      "Extract correct indices for duplicate instances of the same URL",
    expected: [
      { indices: [0, 11], url: "http://t.co" },
      { indices: [12, 23], url: "http://t.co" },
    ],
    text: "http://t.co http://t.co",
  },
  {
    description: "Extract I18N URL",
    expected: [{ indices: [5, 33], url: "http://xn--ls8h.XN--ls8h.la/" }],
    text: "test http://xn--ls8h.XN--ls8h.la/",
  },
  {
    description: "Extract URLs with IDN(not encoded)",
    expected: [
      { indices: [5, 23], url: "http://foobar.みんな/" },
      { indices: [24, 41], url: "http://foobar.中国/" },
      { indices: [42, 64], url: "http://foobar.پاکستان/" },
    ],
    text: "test http://foobar.みんな/ http://foobar.中国/ http://foobar.پاکستان/ ",
  },
];

export const weightedCases: readonly WeightedCase[] = [
  {
    description: "Regular Tweet with url",
    text: "Hi http://test.co",
    weightedLength: 26,
  },
  { description: "Just url", text: "http://test.co", weightedLength: 23 },
  {
    description: "Long tweet, overflow at char index 280",
    text: "285 chars-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-",
    weightedLength: 285,
  },
  {
    description:
      "Long tweet with url in the middle, overflow at char index 284",
    text: "285 chars- http://www.twitter.com/jack xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-",
    weightedLength: 299,
  },
  {
    description: "Long tweet with url at the end, overflow at char index 265",
    text: "xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx- http://www.twitter.com/jack ",
    weightedLength: 289,
  },
  {
    description: "10 url string, no overflow",
    text: "https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha https://www.twitter.com/aloha ",
    weightedLength: 240,
  },
  {
    description: "160 CJK char, overflow at char index 140",
    text: "故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。泪湿罗巾梦不成，夜深前殿按歌声。红颜未老恩先断，斜倚薰笼坐到明。独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。",
    weightedLength: 320,
  },
  {
    description: "160 emoji char, overflow at char index 140",
    text: "😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷😷",
    weightedLength: 320,
  },
  {
    description: "3 latin char + 160 CJK char, overflow at char index 141",
    text: "the故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。朱雀桥边野草花，乌衣巷口夕阳斜。旧时王谢堂前燕，飞入寻常百姓家。朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。泪湿罗巾梦不成，夜深前殿按歌声。红颜未老恩先断，斜倚薰笼坐到明。独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。",
    weightedLength: 323,
  },
  {
    description:
      "282 chars with a normalized character within valid range but outside 280",
    text: "282 chars-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxA\u0301x",
    weightedLength: 281,
  },
  {
    description:
      "Count a mix of single byte single word, and double word unicode characters",
    text: "H🐱☺👨\u200D👩\u200D👧\u200D👦",
    weightedLength: 7,
  },
  {
    description:
      "Count unicode emoji chars inside the basic multilingual plane",
    text: "😷👾😡🔥💩",
    weightedLength: 10,
  },
  {
    description:
      "Count unicode emoji chars outside the basic multilingual plane with skin tone modifiers",
    text: "🙋🏽👨\u200D🎤",
    weightedLength: 4,
  },
  {
    description:
      "Handle General Punctuation Characters with visible spaces(u2000-200A), no ZWJ/ZWNJ",
    text: "This is a tweet with general punctuation characters: \u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B ‐ ‑ ‒ – — ― ‖  ‗ ‘ ’ ‚ ‛ “ ” „ ‟ ′ ″ ‴ ‵ ‶ ‷",
    weightedLength: 110,
  },
  {
    description: "Handle a 64 character domain without protocol",
    text: "randomurlrandomurlrandomurlrandomurlrandomurlrandomurlrandomurls.com",
    weightedLength: 68,
  },
  {
    description:
      "Do not allow > 140 CJK characters by virtue of CJK chars greater than 63 punycode encoded chars in the host",
    text: "あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこ http://あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいう.com",
    weightedLength: 358,
  },
  {
    description:
      "Allow > 140 CJK characters by virtue of CJK chars less than 63 punycode encoded chars in the host",
    text: "あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこ http://あいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあいうえおかきくけこあい.com",
    weightedLength: 264,
  },
  {
    description: "140 family emoji",
    text: "👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦👨\u200D👩\u200D👧\u200D👦",
    weightedLength: 280,
  },
  {
    description:
      "Emoji with a leading character in the latin range is counted as 2",
    text: "1⃣",
    weightedLength: 2,
  },
  {
    description: "Unicode 10.0 emoji",
    text: "Unicode 10.0 emoji: 🤪; 🧕; 🧕🏾; 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    weightedLength: 34,
  },
  {
    description: "Unicode 9.0 emoji",
    text: "Unicode 9.0 emoji: 🤠; 💃; 💃🏾",
    weightedLength: 29,
  },
];
