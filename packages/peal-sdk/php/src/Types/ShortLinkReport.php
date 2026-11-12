<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ShortLinkReport extends JsonSerializableType
{
    /**
     * @var array<ShortLinkDay> $days
     */
    #[JsonProperty('days'), ArrayType([ShortLinkDay::class])]
    public array $days;

    /**
     * @var ShortLink $link
     */
    #[JsonProperty('link')]
    public ShortLink $link;

    /**
     * @var ShortLinkPeriod $period
     */
    #[JsonProperty('period')]
    public ShortLinkPeriod $period;

    /**
     * @param array{
     *   days: array<ShortLinkDay>,
     *   link: ShortLink,
     *   period: ShortLinkPeriod,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->days = $values['days'];
        $this->link = $values['link'];
        $this->period = $values['period'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
