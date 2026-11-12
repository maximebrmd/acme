<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ShortLinkPage extends JsonSerializableType
{
    /**
     * @var array<ShortLink> $items
     */
    #[JsonProperty('items'), ArrayType([ShortLink::class])]
    public array $items;

    /**
     * @var ?string $nextCursor
     */
    #[JsonProperty('nextCursor')]
    public ?string $nextCursor;

    /**
     * @var ShortLinkPeriod $period
     */
    #[JsonProperty('period')]
    public ShortLinkPeriod $period;

    /**
     * @param array{
     *   items: array<ShortLink>,
     *   period: ShortLinkPeriod,
     *   nextCursor?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->items = $values['items'];
        $this->nextCursor = $values['nextCursor'] ?? null;
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
