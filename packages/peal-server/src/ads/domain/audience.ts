import { Schema } from "effect";

import { euCountries } from "./eu-countries.ts";

/** An ISO 3166-1 alpha-2 country code, in capitals. */
export const CountryCodeSchema = Schema.String.check(
  Schema.isPattern(/^[A-Z]{2}$/u)
);

/** The most countries one boost targets. */
export const maxCountries = 25;

/**
 * The youngest and oldest ages a boost may name. Meta takes 13 to 65, 65
 * meaning "65 and over"; Peal starts at 18, as targeting minors has rules
 * of its own that this slice does not handle.
 */
export const minAge = 18;
export const maxAge = 65;

const AgeSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxAge, minimum: minAge })
);

/**
 * Who a boost is shown to: people in some countries, between two ages
 * (`ageMax` 65 is "65 and over"). Nothing finer: no interest, behaviour,
 * gender or custom audience, which carry rules this slice does not handle.
 */
export class Audience extends Schema.Class<Audience>(
  "peal-server/ads/domain/Audience"
)({
  ageMax: AgeSchema,
  ageMin: AgeSchema,
  countries: Schema.Array(CountryCodeSchema).check(
    Schema.isBetweenLength(1, maxCountries),
    Schema.isUnique()
  ),
}) {}

/** Whether the audience includes people in the European Union. */
export const reachesEu = (audience: Audience): boolean =>
  audience.countries.some((country) => euCountries.has(country));
