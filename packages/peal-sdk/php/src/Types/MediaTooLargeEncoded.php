<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class MediaTooLargeEncoded extends JsonSerializableType
{
    /**
     * @var int $byteSize
     */
    #[JsonProperty('byteSize')]
    public int $byteSize;

    /**
     * @var value-of<MediaTooLargeEncodedKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var int $maxByteSize
     */
    #[JsonProperty('maxByteSize')]
    public int $maxByteSize;

    /**
     * @param array{
     *   byteSize: int,
     *   kind: value-of<MediaTooLargeEncodedKind>,
     *   maxByteSize: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->byteSize = $values['byteSize'];
        $this->kind = $values['kind'];
        $this->maxByteSize = $values['maxByteSize'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
