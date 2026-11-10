<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BoostQuote extends JsonSerializableType
{
    /**
     * @var ?int $capRoom An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('capRoom')]
    public ?int $capRoom;

    /**
     * @var int $ceiling An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('ceiling')]
    public int $ceiling;

    /**
     * @var int $commitment An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('commitment')]
    public int $commitment;

    /**
     * @var int $committed An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('committed')]
    public int $committed;

    /**
     * @var string $currency An ISO 4217 currency code, in capitals: `EUR`, `USD`.
     */
    #[JsonProperty('currency')]
    public string $currency;

    /**
     * @var int $days
     */
    #[JsonProperty('days')]
    public int $days;

    /**
     * @var string $endsAt
     */
    #[JsonProperty('endsAt')]
    public string $endsAt;

    /**
     * @var float $minorUnitDigits
     */
    #[JsonProperty('minorUnitDigits')]
    public float $minorUnitDigits;

    /**
     * @var string $startsAt
     */
    #[JsonProperty('startsAt')]
    public string $startsAt;

    /**
     * @param array{
     *   ceiling: int,
     *   commitment: int,
     *   committed: int,
     *   currency: string,
     *   days: int,
     *   endsAt: string,
     *   minorUnitDigits: float,
     *   startsAt: string,
     *   capRoom?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->capRoom = $values['capRoom'] ?? null;
        $this->ceiling = $values['ceiling'];
        $this->commitment = $values['commitment'];
        $this->committed = $values['committed'];
        $this->currency = $values['currency'];
        $this->days = $values['days'];
        $this->endsAt = $values['endsAt'];
        $this->minorUnitDigits = $values['minorUnitDigits'];
        $this->startsAt = $values['startsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
