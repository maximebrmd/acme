<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PaidTotals extends JsonSerializableType
{
    /**
     * @var int $clicks
     */
    #[JsonProperty('clicks')]
    public int $clicks;

    /**
     * @var int $impressions
     */
    #[JsonProperty('impressions')]
    public int $impressions;

    /**
     * @var int $reach
     */
    #[JsonProperty('reach')]
    public int $reach;

    /**
     * @var ?int $results
     */
    #[JsonProperty('results')]
    public ?int $results;

    /**
     * @var int $spend An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('spend')]
    public int $spend;

    /**
     * @param array{
     *   clicks: int,
     *   impressions: int,
     *   reach: int,
     *   spend: int,
     *   results?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clicks = $values['clicks'];
        $this->impressions = $values['impressions'];
        $this->reach = $values['reach'];
        $this->results = $values['results'] ?? null;
        $this->spend = $values['spend'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
