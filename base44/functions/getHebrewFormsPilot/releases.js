// BEGIN GENERATED ENGLISH SERIES 02 PINS
const ENGLISH_SERIES02_RELEASES = Object.freeze({
  "catalog-en-series-02-mood": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "mood",
    "sha256": "1a37a35d7fb849b1a1bbb69b3132e64147cfdce0fe457eae6b97c6320a40a62a"
  },
  "catalog-en-series-02-self": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "self",
    "sha256": "d70a790c016e24bf7322ddb6f6c01c70d7921a8c97f3bd65105c0f6cc66c51d0"
  },
  "catalog-en-series-02-perf": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "perf",
    "sha256": "1fc7615f49c3e855dd29c5b179e899db96a512fdb0d45fd6bc9aee39ce32bcf0"
  },
  "catalog-en-series-02-reg": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "reg",
    "sha256": "080383f98975e297829cce97e88df4a443a43df73331a80a7d28737314cc6ed7"
  },
  "catalog-en-series-02-exec": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "exec",
    "sha256": "80fd999f4a76e647e729f7dea19d88d19fea9338cc8a9db5b688d9530b0145dc"
  },
  "catalog-en-series-02-soc": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "soc",
    "sha256": "e265d4c55b2724760f45acda716f49e40ca93eaa5fc885b525028dba397337c3"
  },
  "catalog-en-series-02-sleep": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "sleep",
    "sha256": "164f9c794b9015e5743371880d589f6b5ee494b5e81e3ef5aaa16df1138be8a8"
  },
  "catalog-en-series-02-change": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "change",
    "sha256": "05fa94d04799dc2392f53106f3dc089dddae686aa208b77cdf8f88c6dc9c568e"
  },
  "catalog-en-series-02-family": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "family",
    "sha256": "7a3202d400c6dd357ef6034165182517301f0cef48089580a21b0764010ac1a5"
  },
  "catalog-en-series-02-screen": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "screen",
    "sha256": "be1361bf54c542afc1a28992ba565a501251b065aa3a752bc99150836ee3655d"
  },
  "catalog-en-series-02-shame": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "shame",
    "sha256": "8eca09d820a95013fc8e85f7cd9d6a902f0f0e4390edd352d9d92f7a5321d45f"
  },
  "catalog-en-series-02-meaning": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 54,
    "track": "meaning",
    "sha256": "1fb75e0d73725a7d4037ed5b48ee26f65e92888ea38eb53f440a4c0b256a8300"
  },
  "catalog-en-series-02": {
    "language": "en",
    "version": "0.3-en-series-02",
    "count": 648,
    "kind": "index",
    "sha256": "e1b513bb57810717fef54bd3ebeae745be55618d2eda47802cb6986013988722"
  }
});
// END GENERATED ENGLISH SERIES 02 PINS
// Shared by Workers, Railway and the browser. Only reviewed, pinned catalogs
// are accepted; the original endpoint stays on 0.2 for older deployed clients.
export const ENGLISH_SERIES02_CATALOG_PATH = 'catalog-en-series-02';
export const ENGLISH_SERIES02_TRACKS = Object.freeze(['mood', 'self', 'perf', 'reg', 'exec', 'soc', 'sleep', 'change', 'family', 'screen', 'shame', 'meaning']);
export const ENGLISH_SERIES02_FORM_IDS = Object.freeze(ENGLISH_SERIES02_TRACKS.flatMap(track =>
  Array.from({ length: 6 }, (_, index) => [`MP-${track.toUpperCase()}-${String(index + 1).padStart(2, '0')}-G-ALL-EN`,
    ...['W', 'P'].flatMap(kind => ['CH', 'TE', 'AD', 'OA'].map(age => `MP-${track.toUpperCase()}-${String(index + 1).padStart(2, '0')}-${kind}-${age}-EN`))]).flat()));
// BEGIN GENERATED ENGLISH SERIES 03 PINS
const ENGLISH_SERIES03_RELEASES = Object.freeze({
  "catalog-en-series-03-shared": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 36,
    "track": "shared",
    "sha256": "a74723d6d0ee41dd71b7d75f3d94a266803bbc6694030c1c0f8e6acd140f1f58"
  },
  "catalog-en-series-03-core": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 64,
    "track": "core",
    "sha256": "152cb79bbd6714a4869b6a46beeaae01e9117fddc900286849051c89926497c5"
  },
  "catalog-en-series-03-anxiety": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "anxiety",
    "sha256": "dec54a478edd3e9e7a9e4435aa2b44675b04d03eb0c6d48d1e9f0227c9476688"
  },
  "catalog-en-series-03-mood": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "mood",
    "sha256": "17b2cb806a476ba8112267addadffa68bcd37d54d2dc438439994a150c519cdd"
  },
  "catalog-en-series-03-self": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "self",
    "sha256": "a68cbf67c5b82c82f01911dfa98eb8d8f822314af820f5edfef5be9afadd892d"
  },
  "catalog-en-series-03-perf": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "perf",
    "sha256": "e49217341b8429f9312dfa75a875b87699d4fbc3ac0764ef0f1c69f6c78c99c8"
  },
  "catalog-en-series-03-reg": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "reg",
    "sha256": "a6df98fdf8a2282970ea919473af5e196d39101156c304c48561bbbb1a760c72"
  },
  "catalog-en-series-03-exec": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "exec",
    "sha256": "3848ef7322e9bd50ff41dd906f770b8c7b0070ae2f06699dd1092c7d12d6bbca"
  },
  "catalog-en-series-03-soc": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "soc",
    "sha256": "9ebd3ed619558068a62e7d266b0c8d73a685ce6c28ff6bf09669a849a65ba5e7"
  },
  "catalog-en-series-03-sleep": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "sleep",
    "sha256": "9ba512ecad81da87d141e04af02d1fe44b44e3866ea1df9a2368502a0283838c"
  },
  "catalog-en-series-03-change": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "change",
    "sha256": "a07b68596ca8f1b790c7e2a48c8c9ebffed0faaeec25cff2cbd6184426c65227"
  },
  "catalog-en-series-03-family": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "family",
    "sha256": "e424f304d70c60b0cc27495d1e07b065716f95d3015d1a6bcb027dfe2ac0dd92"
  },
  "catalog-en-series-03-screen": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "screen",
    "sha256": "2ce8e79f8a372c29e4f46b1a4c78deec13d37c6c7d92474321f25a5e63777b5d"
  },
  "catalog-en-series-03-shame": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "shame",
    "sha256": "03a5f7c2e5f1afde30d7c0efa8fc86837cfb158148d91eabd73d61e5d5ecc514"
  },
  "catalog-en-series-03-meaning": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 54,
    "track": "meaning",
    "sha256": "a4f09900f9f708ce21c8e7a54795e43f0034f40088f045adde0e6623b7d198b3"
  },
  "catalog-en-series-03-ocd": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 96,
    "track": "ocd",
    "sha256": "13d7e4780fcda43df9fd085eac2e35e330de3f709c46536470400f65e6a3fe0a"
  },
  "catalog-en-series-03-trauma": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 72,
    "track": "trauma",
    "sha256": "9c97ab05fffc0a8cf121adf7d4e1c383ae2cc62271ab8ced71bef7135e29bc61"
  },
  "catalog-en-series-03": {
    "language": "en",
    "version": "0.4-en-series-03",
    "count": 970,
    "kind": "index",
    "sha256": "7ece9877bf2ad86ab4e1221742b4ecb67e0c22dbafd0e33158c0db15dc9bca97"
  }
});
// END GENERATED ENGLISH SERIES 03 PINS
export const ENGLISH_SERIES03_CATALOG_PATH = 'catalog-en-series-03';
export const ENGLISH_SERIES03_TRACKS = Object.freeze(["shared", "core", "anxiety", "mood", "self", "perf", "reg", "exec", "soc", "sleep", "change", "family", "screen", "shame", "meaning", "ocd", "trauma"]);
export const ENGLISH_FINAL_FORM_IDS = Object.freeze([
  "MP-BASE-B00-ALL-EN",
  "MP-INT-I01-CH-EN",
  "MP-INT-I01-TE-EN",
  "MP-INT-I01-AD-EN",
  "MP-INT-I01-OA-EN",
  "MP-INT-I02-ALL-EN",
  "MP-INT-I03-ALL-EN",
  "MP-INT-I04-CH-EN",
  "MP-INT-I04-TE-EN",
  "MP-INT-I04-AD-EN",
  "MP-INT-I04-OA-EN",
  "MP-ASM-A01-CH-EN",
  "MP-ASM-A01-TE-EN",
  "MP-ASM-A01-AD-EN",
  "MP-ASM-A01-OA-EN",
  "MP-ASM-A02-CH-EN",
  "MP-ASM-A02-TE-EN",
  "MP-ASM-A02-AD-EN",
  "MP-ASM-A02-OA-EN",
  "MP-ASM-A03-CH-EN",
  "MP-ASM-A03-TE-EN",
  "MP-ASM-A03-AD-EN",
  "MP-ASM-A03-OA-EN",
  "MP-ASM-A04-ALL-EN",
  "MP-SES-S01-CH-EN",
  "MP-SES-S01-TE-EN",
  "MP-SES-S01-AD-EN",
  "MP-SES-S01-OA-EN",
  "MP-SES-S02-CH-EN",
  "MP-SES-S02-TE-EN",
  "MP-SES-S02-AD-EN",
  "MP-SES-S02-OA-EN",
  "MP-SES-S03-CH-EN",
  "MP-SES-S03-TE-EN",
  "MP-SES-S03-AD-EN",
  "MP-SES-S03-OA-EN",
  "MP-CORE-01-G-ALL-EN",
  "MP-CORE-01-P-CH-EN",
  "MP-CORE-01-P-TE-EN",
  "MP-CORE-01-P-AD-EN",
  "MP-CORE-01-P-OA-EN",
  "MP-CORE-02-G-ALL-EN",
  "MP-CORE-02-W-CH-EN",
  "MP-CORE-02-W-TE-EN",
  "MP-CORE-02-W-AD-EN",
  "MP-CORE-02-W-OA-EN",
  "MP-CORE-02-P-CH-EN",
  "MP-CORE-02-P-TE-EN",
  "MP-CORE-02-P-AD-EN",
  "MP-CORE-02-P-OA-EN",
  "MP-CORE-03-G-ALL-EN",
  "MP-CORE-03-W-CH-EN",
  "MP-CORE-03-W-TE-EN",
  "MP-CORE-03-W-AD-EN",
  "MP-CORE-03-W-OA-EN",
  "MP-CORE-03-P-CH-EN",
  "MP-CORE-03-P-TE-EN",
  "MP-CORE-03-P-AD-EN",
  "MP-CORE-03-P-OA-EN",
  "MP-CORE-04-G-ALL-EN",
  "MP-CORE-04-W-CH-EN",
  "MP-CORE-04-W-TE-EN",
  "MP-CORE-04-W-AD-EN",
  "MP-CORE-04-W-OA-EN",
  "MP-CORE-04-P-CH-EN",
  "MP-CORE-04-P-TE-EN",
  "MP-CORE-04-P-AD-EN",
  "MP-CORE-04-P-OA-EN",
  "MP-CORE-05-G-ALL-EN",
  "MP-CORE-05-W-CH-EN",
  "MP-CORE-05-W-TE-EN",
  "MP-CORE-05-W-AD-EN",
  "MP-CORE-05-W-OA-EN",
  "MP-CORE-05-P-CH-EN",
  "MP-CORE-05-P-TE-EN",
  "MP-CORE-05-P-AD-EN",
  "MP-CORE-05-P-OA-EN",
  "MP-CORE-06-G-ALL-EN",
  "MP-CORE-06-W-CH-EN",
  "MP-CORE-06-W-TE-EN",
  "MP-CORE-06-W-AD-EN",
  "MP-CORE-06-W-OA-EN",
  "MP-CORE-06-P-CH-EN",
  "MP-CORE-06-P-TE-EN",
  "MP-CORE-06-P-AD-EN",
  "MP-CORE-06-P-OA-EN",
  "MP-CORE-07-G-ALL-EN",
  "MP-CORE-07-W-CH-EN",
  "MP-CORE-07-W-TE-EN",
  "MP-CORE-07-W-AD-EN",
  "MP-CORE-07-W-OA-EN",
  "MP-CORE-07-P-CH-EN",
  "MP-CORE-07-P-TE-EN",
  "MP-CORE-07-P-AD-EN",
  "MP-CORE-07-P-OA-EN",
  "MP-CORE-08-G-ALL-EN",
  "MP-CORE-08-P-CH-EN",
  "MP-CORE-08-P-TE-EN",
  "MP-CORE-08-P-AD-EN",
  "MP-CORE-08-P-OA-EN",
  "MP-ANX-01-G-ALL-EN",
  "MP-ANX-01-W-CH-EN",
  "MP-ANX-01-W-TE-EN",
  "MP-ANX-01-W-AD-EN",
  "MP-ANX-01-W-OA-EN",
  "MP-ANX-01-P-CH-EN",
  "MP-ANX-01-P-TE-EN",
  "MP-ANX-01-P-AD-EN",
  "MP-ANX-01-P-OA-EN",
  "MP-ANX-02-G-ALL-EN",
  "MP-ANX-02-W-CH-EN",
  "MP-ANX-02-W-TE-EN",
  "MP-ANX-02-W-AD-EN",
  "MP-ANX-02-W-OA-EN",
  "MP-ANX-02-P-CH-EN",
  "MP-ANX-02-P-TE-EN",
  "MP-ANX-02-P-AD-EN",
  "MP-ANX-02-P-OA-EN",
  "MP-ANX-03-G-ALL-EN",
  "MP-ANX-03-W-CH-EN",
  "MP-ANX-03-W-TE-EN",
  "MP-ANX-03-W-AD-EN",
  "MP-ANX-03-W-OA-EN",
  "MP-ANX-03-P-CH-EN",
  "MP-ANX-03-P-TE-EN",
  "MP-ANX-03-P-AD-EN",
  "MP-ANX-03-P-OA-EN",
  "MP-ANX-04-G-ALL-EN",
  "MP-ANX-04-W-CH-EN",
  "MP-ANX-04-W-TE-EN",
  "MP-ANX-04-W-AD-EN",
  "MP-ANX-04-W-OA-EN",
  "MP-ANX-04-P-CH-EN",
  "MP-ANX-04-P-TE-EN",
  "MP-ANX-04-P-AD-EN",
  "MP-ANX-04-P-OA-EN",
  "MP-ANX-05-G-ALL-EN",
  "MP-ANX-05-W-CH-EN",
  "MP-ANX-05-W-TE-EN",
  "MP-ANX-05-W-AD-EN",
  "MP-ANX-05-W-OA-EN",
  "MP-ANX-05-P-CH-EN",
  "MP-ANX-05-P-TE-EN",
  "MP-ANX-05-P-AD-EN",
  "MP-ANX-05-P-OA-EN",
  "MP-ANX-06-G-ALL-EN",
  "MP-ANX-06-W-CH-EN",
  "MP-ANX-06-W-TE-EN",
  "MP-ANX-06-W-AD-EN",
  "MP-ANX-06-W-OA-EN",
  "MP-ANX-06-P-CH-EN",
  "MP-ANX-06-P-TE-EN",
  "MP-ANX-06-P-AD-EN",
  "MP-ANX-06-P-OA-EN",
  "MP-OCD-01-G-ALL-EN",
  "MP-OCD-01-W-CH-EN",
  "MP-OCD-01-W-TE-EN",
  "MP-OCD-01-W-AD-EN",
  "MP-OCD-01-W-OA-EN",
  "MP-OCD-01-P-CH-EN",
  "MP-OCD-01-P-TE-EN",
  "MP-OCD-01-P-AD-EN",
  "MP-OCD-01-P-OA-EN",
  "MP-TRAUMA-01-G-ALL-EN",
  "MP-TRAUMA-01-W-CH-EN",
  "MP-TRAUMA-01-W-TE-EN",
  "MP-TRAUMA-01-W-AD-EN",
  "MP-TRAUMA-01-W-OA-EN",
  "MP-TRAUMA-01-P-CH-EN",
  "MP-TRAUMA-01-P-TE-EN",
  "MP-TRAUMA-01-P-AD-EN",
  "MP-TRAUMA-01-P-OA-EN",
  "MP-OCD-02-G-ALL-EN",
  "MP-OCD-02-W-CH-EN",
  "MP-OCD-02-W-TE-EN",
  "MP-OCD-02-W-AD-EN",
  "MP-OCD-02-W-OA-EN",
  "MP-OCD-02-P-CH-EN",
  "MP-OCD-02-P-TE-EN",
  "MP-OCD-02-P-AD-EN",
  "MP-OCD-02-P-OA-EN",
  "MP-OCD-03-G-ALL-EN",
  "MP-OCD-03-W-CH-EN",
  "MP-OCD-03-W-TE-EN",
  "MP-OCD-03-W-AD-EN",
  "MP-OCD-03-W-OA-EN",
  "MP-OCD-03-P-CH-EN",
  "MP-OCD-03-P-TE-EN",
  "MP-OCD-03-P-AD-EN",
  "MP-OCD-03-P-OA-EN",
  "MP-OCD-04-G-ALL-EN",
  "MP-OCD-04-W-CH-EN",
  "MP-OCD-04-W-TE-EN",
  "MP-OCD-04-W-AD-EN",
  "MP-OCD-04-W-OA-EN",
  "MP-OCD-04-P-CH-EN",
  "MP-OCD-04-P-TE-EN",
  "MP-OCD-04-P-AD-EN",
  "MP-OCD-04-P-OA-EN",
  "MP-OCD-05-G-ALL-EN",
  "MP-OCD-05-W-CH-EN",
  "MP-OCD-05-W-TE-EN",
  "MP-OCD-05-W-AD-EN",
  "MP-OCD-05-W-OA-EN",
  "MP-OCD-05-P-CH-EN",
  "MP-OCD-05-P-TE-EN",
  "MP-OCD-05-P-AD-EN",
  "MP-OCD-05-P-OA-EN",
  "MP-OCD-06-G-ALL-EN",
  "MP-OCD-06-W-CH-EN",
  "MP-OCD-06-W-TE-EN",
  "MP-OCD-06-W-AD-EN",
  "MP-OCD-06-W-OA-EN",
  "MP-OCD-06-P-CH-EN",
  "MP-OCD-06-P-TE-EN",
  "MP-OCD-06-P-AD-EN",
  "MP-OCD-06-P-OA-EN",
  "MP-OCD-07-G-ALL-EN",
  "MP-OCD-07-W-CH-EN",
  "MP-OCD-07-W-TE-EN",
  "MP-OCD-07-W-AD-EN",
  "MP-OCD-07-W-OA-EN",
  "MP-OCD-07-P-CH-EN",
  "MP-OCD-07-P-TE-EN",
  "MP-OCD-07-P-AD-EN",
  "MP-OCD-07-P-OA-EN",
  "MP-OCD-08-G-ALL-EN",
  "MP-OCD-08-W-CH-EN",
  "MP-OCD-08-W-TE-EN",
  "MP-OCD-08-W-AD-EN",
  "MP-OCD-08-W-OA-EN",
  "MP-OCD-08-P-CH-EN",
  "MP-OCD-08-P-TE-EN",
  "MP-OCD-08-P-AD-EN",
  "MP-OCD-08-P-OA-EN",
  "MP-OCDYC-01-G-CH-EN",
  "MP-OCDYC-01-W-CH-EN",
  "MP-OCDYC-01-P-CH-EN",
  "MP-OCDYC-02-G-CH-EN",
  "MP-OCDYC-02-W-CH-EN",
  "MP-OCDYC-02-P-CH-EN",
  "MP-OCDYC-03-G-CH-EN",
  "MP-OCDYC-03-W-CH-EN",
  "MP-OCDYC-03-P-CH-EN",
  "MP-OCDYC-04-G-CH-EN",
  "MP-OCDYC-04-W-CH-EN",
  "MP-OCDYC-04-P-CH-EN",
  "MP-OCDYC-05-G-CH-EN",
  "MP-OCDYC-05-W-CH-EN",
  "MP-OCDYC-05-P-CH-EN",
  "MP-OCDYC-06-G-CH-EN",
  "MP-OCDYC-06-W-CH-EN",
  "MP-OCDYC-06-P-CH-EN",
  "MP-OCDYC-07-G-CH-EN",
  "MP-OCDYC-07-W-CH-EN",
  "MP-OCDYC-07-P-CH-EN",
  "MP-OCDYC-08-G-CH-EN",
  "MP-OCDYC-08-W-CH-EN",
  "MP-OCDYC-08-P-CH-EN",
  "MP-TRAUMA-02-G-ALL-EN",
  "MP-TRAUMA-02-W-CH-EN",
  "MP-TRAUMA-02-W-TE-EN",
  "MP-TRAUMA-02-W-AD-EN",
  "MP-TRAUMA-02-W-OA-EN",
  "MP-TRAUMA-02-P-CH-EN",
  "MP-TRAUMA-02-P-TE-EN",
  "MP-TRAUMA-02-P-AD-EN",
  "MP-TRAUMA-02-P-OA-EN",
  "MP-TRAUMA-03-G-ALL-EN",
  "MP-TRAUMA-03-W-CH-EN",
  "MP-TRAUMA-03-W-TE-EN",
  "MP-TRAUMA-03-W-AD-EN",
  "MP-TRAUMA-03-W-OA-EN",
  "MP-TRAUMA-03-P-CH-EN",
  "MP-TRAUMA-03-P-TE-EN",
  "MP-TRAUMA-03-P-AD-EN",
  "MP-TRAUMA-03-P-OA-EN",
  "MP-TRAUMA-04-G-ALL-EN",
  "MP-TRAUMA-04-W-CH-EN",
  "MP-TRAUMA-04-W-TE-EN",
  "MP-TRAUMA-04-W-AD-EN",
  "MP-TRAUMA-04-W-OA-EN",
  "MP-TRAUMA-04-P-CH-EN",
  "MP-TRAUMA-04-P-TE-EN",
  "MP-TRAUMA-04-P-AD-EN",
  "MP-TRAUMA-04-P-OA-EN",
  "MP-TRAUMA-05-G-ALL-EN",
  "MP-TRAUMA-05-W-CH-EN",
  "MP-TRAUMA-05-W-TE-EN",
  "MP-TRAUMA-05-W-AD-EN",
  "MP-TRAUMA-05-W-OA-EN",
  "MP-TRAUMA-05-P-CH-EN",
  "MP-TRAUMA-05-P-TE-EN",
  "MP-TRAUMA-05-P-AD-EN",
  "MP-TRAUMA-05-P-OA-EN",
  "MP-TRAUMA-06-G-ALL-EN",
  "MP-TRAUMA-06-W-CH-EN",
  "MP-TRAUMA-06-W-TE-EN",
  "MP-TRAUMA-06-W-AD-EN",
  "MP-TRAUMA-06-W-OA-EN",
  "MP-TRAUMA-06-P-CH-EN",
  "MP-TRAUMA-06-P-TE-EN",
  "MP-TRAUMA-06-P-AD-EN",
  "MP-TRAUMA-06-P-OA-EN",
  "MP-TRAUMA-07-G-ALL-EN",
  "MP-TRAUMA-07-W-CH-EN",
  "MP-TRAUMA-07-W-TE-EN",
  "MP-TRAUMA-07-W-AD-EN",
  "MP-TRAUMA-07-W-OA-EN",
  "MP-TRAUMA-07-P-CH-EN",
  "MP-TRAUMA-07-P-TE-EN",
  "MP-TRAUMA-07-P-AD-EN",
  "MP-TRAUMA-07-P-OA-EN",
  "MP-TRAUMA-08-G-ALL-EN",
  "MP-TRAUMA-08-W-CH-EN",
  "MP-TRAUMA-08-W-TE-EN",
  "MP-TRAUMA-08-W-AD-EN",
  "MP-TRAUMA-08-W-OA-EN",
  "MP-TRAUMA-08-P-CH-EN",
  "MP-TRAUMA-08-P-TE-EN",
  "MP-TRAUMA-08-P-AD-EN",
  "MP-TRAUMA-08-P-OA-EN"
]);
export const ENGLISH_CURRENT_FORM_IDS = Object.freeze([...ENGLISH_SERIES02_FORM_IDS, ...ENGLISH_FINAL_FORM_IDS]);
export const ENGLISH_SERIES01_CATALOG_PATH = 'catalog-en-series-01';
export const ENGLISH_SERIES01_FORM_IDS = Object.freeze(
  ['MOOD', 'SELF', 'PERF', 'REG', 'EXEC'].flatMap(track => Array.from({ length: 6 }, (_, index) =>
    [`MP-${track}-${String(index + 1).padStart(2, '0')}-G-ALL-EN`,
      ...['W', 'P'].flatMap(kind => ['CH', 'TE', 'AD', 'OA'].map(age => `MP-${track}-${String(index + 1).padStart(2, '0')}-${kind}-${age}-EN`))]).flat()),
);
export const ENGLISH_CATALOG_PATH = 'catalog-en-mood-03';
export const ENGLISH_FORM_IDS = Object.freeze([
  'MP-MOOD-03-G-ALL-EN',
  ...['W', 'P'].flatMap(kind => ['CH', 'TE', 'AD', 'OA'].map(age => `MP-MOOD-03-${kind}-${age}-EN`)),
]);

export function isPilotFileId(id) {
  return typeof id === 'string' && (/^MP-[A-Z0-9-]{1,80}-HE$/.test(id) || ENGLISH_CURRENT_FORM_IDS.includes(id));
}

export const EXPANDED_CATALOG_PATH = 'catalog-mood-01';
export const P3_CATALOG_PATH = 'catalog-p3-01';
export const P4A_CATALOG_PATH = 'catalog-p4-01';
export const P4B_CATALOG_PATH = 'catalog-p4-02';
export const SERIES01_CATALOG_PATH = 'catalog-series-01';
export const SERIES02_CATALOG_PATH = 'catalog-series-02';
export const SERIES03_CATALOG_PATH = 'catalog-series-03';
export const SERIES04_CATALOG_PATH = 'catalog-series-04';
export const SERIES05_CATALOG_PATH = 'catalog-series-05';
export const SERIES06_CATALOG_PATH = 'catalog-series-06';
export const SERIES07_CATALOG_PATH = 'catalog-series-07';
export const SERIES08_CATALOG_PATH = 'catalog-series-08';
export const SERIES09_CATALOG_PATH = 'catalog-series-09';
export const SERIES10_CATALOG_PATH = 'catalog-series-10';
export const SERIES11_CATALOG_PATH = 'catalog-series-11';
export const SERIES12_CATALOG_PATH = 'catalog-series-12';
export const PILOT_RELEASES = Object.freeze({
  ...ENGLISH_SERIES03_RELEASES,
  ...ENGLISH_SERIES02_RELEASES,
  [ENGLISH_SERIES01_CATALOG_PATH]: Object.freeze({ language: 'en', version: '0.2-en-series-01', count: 270, sha256: '5adacbbaa325c24f7c4b2da1d63c5bd3c6b1e1c90507815a526ac298baf84737' }),
  [ENGLISH_CATALOG_PATH]: Object.freeze({ language: 'en', version: '0.1-en-mood-03', count: 9, sha256: '7212b2a928b8c04e5e8da94b06f97cd99e4fb667150cbae535ccf2e311a8b795' }),
  catalog: Object.freeze({ version: '0.2', count: 154, sha256: '2c1df7644d778508b37d2a5076d902906b241166e09f93d388295a8a9983d90b' }),
  [EXPANDED_CATALOG_PATH]: Object.freeze({ version: '0.3-mood-01', count: 163, sha256: 'a9da2978a3d29b8c62a50e3ce9219d4b214d3bfd881ba6eb872e6bacab9885cf' }),
  [P3_CATALOG_PATH]: Object.freeze({ version: '0.4-p3-01', count: 217, sha256: '10f62544559448b462f06b0b0dbea342306bc5af85daa4f2ce9fc022531b3c4f' }),
  [P4A_CATALOG_PATH]: Object.freeze({ version: '0.5-p4-01', count: 253, sha256: 'cd5ea0cba02bb8e3f896bfadaecfa439be65bdcc3ef1c6c72fe0c5b6b3a3d104' }),
  [P4B_CATALOG_PATH]: Object.freeze({ version: '0.6-p4-02', count: 289, sha256: '459f0727b598e2e8a5ef7eb31b9b6d5d636f63d223586e4b9029890e0c7652a6' }),
  [SERIES01_CATALOG_PATH]: Object.freeze({ version: '0.7-series-01', count: 370, sha256: '27f8f3255049aaa5a3fe50e6ca4e4c9f0dad45392683c59247d3cb086a29a009' }),
  [SERIES02_CATALOG_PATH]: Object.freeze({ version: '0.8-series-02', count: 460, sha256: 'f3323fdd4ff058bfbc98db5857481383a2bb84b6bc5d99eae5a1313af9f92f1f' }),
  [SERIES03_CATALOG_PATH]: Object.freeze({ version: '0.9-series-03', count: 550, sha256: '2161a1405dcf80f1c844542fd29e7f054711df8db6d3ad04b49a904f7d850d91' }),
  [SERIES04_CATALOG_PATH]: Object.freeze({ version: '0.10-series-04', count: 640, sha256: 'f2363efdb1485e965eeb1d73a8d845657d6cfc354b4b0353e4ba8bea392a9dcf' }),
  [SERIES05_CATALOG_PATH]: Object.freeze({ version: '0.11-series-05', count: 730, sha256: '773c342232fb7a58f26da2fd6046f8296cc0b41c1dbd758dc5de4e9ea05866b7' }),
  [SERIES06_CATALOG_PATH]: Object.freeze({ version: '0.12-series-06', count: 820, sha256: 'c465f21602d142ea0b96105f71275a68a3a5260f0da2dc6d6dad3c896dc1740e' }),
  [SERIES07_CATALOG_PATH]: Object.freeze({ version: '0.13-series-07', count: 847, sha256: '428b2f6dea3b9772b04f1fe378bd8811f2c483ad1b61a9b80ad27d9f8d37af9f' }),
  [SERIES08_CATALOG_PATH]: Object.freeze({ version: '0.14-series-08', count: 883, sha256: 'a21d7edf7143b66bf1b1cf4d1492a7244b8d726d009831ed56b43001bf848fb7' }),
  [SERIES09_CATALOG_PATH]: Object.freeze({ version: '0.15-series-09', count: 895, sha256: '70647a87e574ece0979e08d0ed162c14c373f142c5dac47046077751b6d24814' }),
  [SERIES10_CATALOG_PATH]: Object.freeze({ version: '0.16-series-10', count: 907, sha256: 'e4f495edbe5b639f83f610ee18779f1ec7be388ce5c935bc660a9f508772b2bc' }),
  [SERIES11_CATALOG_PATH]: Object.freeze({ version: '0.17-series-11', count: 934, sha256: '9d99d240cd502ed924b0b31bc8a6242a6220191461a10545db12c269acfb9adb' }),
  [SERIES12_CATALOG_PATH]: Object.freeze({ version: '0.18-series-12', count: 970, sha256: '372f57f6667b01c524f1e6f9dbb7e9ac86a50ab683b340681f4c109b297d3230' }),
});

export function isPilotCatalogPath(path) {
  return typeof path === 'string' && Object.hasOwn(PILOT_RELEASES, path);
}

// Key order is not part of the transport contract; array order is intentional.
export function canonicalCatalog(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalCatalog).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalCatalog(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function validatePilotCatalog(catalog, path) {
  if (!isPilotCatalogPath(path)) return false;
  const release = PILOT_RELEASES[path];
  if (catalog?.language !== (release.language || 'he') || catalog.version !== release.version ||
      (release.kind === 'index' ? catalog.kind !== 'index' || catalog.coverage?.available !== release.count || !Array.isArray(catalog.parts)
        : !Array.isArray(catalog.forms) || catalog.forms.length !== release.count) ||
      (release.track && catalog.track !== release.track)) return false;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalCatalog(catalog)));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex === release.sha256;
}

// Assemble only a complete, independently verified release. No partially loaded library.
export function assembleEnglishCatalog(index, parts) {
  const current = index?.version === PILOT_RELEASES[ENGLISH_SERIES03_CATALOG_PATH]?.version;
  const path = current ? ENGLISH_SERIES03_CATALOG_PATH : ENGLISH_SERIES02_CATALOG_PATH;
  const tracks = current ? ENGLISH_SERIES03_TRACKS : ENGLISH_SERIES02_TRACKS;
  const expectedIds = current ? ENGLISH_CURRENT_FORM_IDS : ENGLISH_SERIES02_FORM_IDS;
  const release = PILOT_RELEASES[path];
  if (!release || index?.kind !== 'index' || index.language !== 'en' || index.version !== release.version ||
      !Array.isArray(index.parts) || !Array.isArray(parts) || index.parts.length !== tracks.length || parts.length !== index.parts.length) throw new Error('PILOT_INVALID');
  const ids = new Set(), sourceIds = new Set();
  const forms = [];
  for (let i = 0; i < index.parts.length; i++) {
    const spec = index.parts[i], part = parts[i], pin = PILOT_RELEASES[spec?.path];
    if (!pin || !part || !Array.isArray(part.forms) || spec.track !== tracks[i] || spec.path !== `${path}-${spec.track}` ||
        spec.sha256 !== pin.sha256 || spec.count !== pin.count || spec.bytes < 1 || spec.bytes >= 512 * 1024 ||
        part.language !== 'en' || part.version !== index.version || part.track !== spec.track ||
        part.sourceCatalogVersion !== index.sourceCatalogVersion || part.forms?.length !== spec.count ||
        new TextEncoder().encode(JSON.stringify(part)).length !== spec.bytes) throw new Error('PILOT_INVALID');
    for (const form of part.forms) {
      if (!form || form.language !== 'en' || form.track !== spec.track || !expectedIds.includes(form.id) ||
          form.sourceId !== `${form.id.slice(0, -2)}HE` || ids.has(form.id) || sourceIds.has(form.sourceId)) throw new Error('PILOT_INVALID');
      ids.add(form.id); sourceIds.add(form.sourceId); forms.push(form);
    }
  }
  if (forms.length !== release.count || forms.length !== expectedIds.length ||
      index.coverage?.available !== forms.length || index.coverage?.total !== 970 || index.coverage.unavailable !== 970 - forms.length) throw new Error('PILOT_INVALID');
  return { version: index.version, language: 'en', sourceCatalogVersion: index.sourceCatalogVersion,
    coverage: index.coverage, ageGroups: index.ageGroups, forms };
}
