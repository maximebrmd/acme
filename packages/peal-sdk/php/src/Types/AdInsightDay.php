<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdInsightDay extends JsonSerializableType
{
    /**
     * @var string $day
     */
    #[JsonProperty('day')]
    public string $day;

    /**
     * @var PaidTotals $totals
     */
    #[JsonProperty('totals')]
    public PaidTotals $totals;

    /**
     * @param array{
     *   day: string,
     *   totals: PaidTotals,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->day = $values['day'];
        $this->totals = $values['totals'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
