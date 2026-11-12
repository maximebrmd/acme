<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ShortLinkStatus extends JsonSerializableType
{
    /**
     * @var bool $available
     */
    #[JsonProperty('available')]
    public bool $available;

    /**
     * @var ?string $base
     */
    #[JsonProperty('base')]
    public ?string $base;

    /**
     * @var bool $byDefault
     */
    #[JsonProperty('byDefault')]
    public bool $byDefault;

    /**
     * @var ?int $shortLength
     */
    #[JsonProperty('shortLength')]
    public ?int $shortLength;

    /**
     * @param array{
     *   available: bool,
     *   byDefault: bool,
     *   base?: ?string,
     *   shortLength?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->available = $values['available'];
        $this->base = $values['base'] ?? null;
        $this->byDefault = $values['byDefault'];
        $this->shortLength = $values['shortLength'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
