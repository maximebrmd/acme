<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaCapabilitiesAltText extends JsonSerializableType
{
    /**
     * @var int $maxLength
     */
    #[JsonProperty('maxLength')]
    public int $maxLength;

    /**
     * @var ?bool $shown
     */
    #[JsonProperty('shown')]
    public ?bool $shown;

    /**
     * @param array{
     *   maxLength: int,
     *   shown?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->maxLength = $values['maxLength'];
        $this->shown = $values['shown'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
