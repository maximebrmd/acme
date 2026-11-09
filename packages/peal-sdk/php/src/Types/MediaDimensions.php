<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaDimensions extends JsonSerializableType
{
    /**
     * @var int $height
     */
    #[JsonProperty('height')]
    public int $height;

    /**
     * @var int $width
     */
    #[JsonProperty('width')]
    public int $width;

    /**
     * @param array{
     *   height: int,
     *   width: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->height = $values['height'];
        $this->width = $values['width'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
