<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class UnknownMediaEncoded extends JsonSerializableType
{
    /**
     * @var array<string> $mediaIds
     */
    #[JsonProperty('mediaIds'), ArrayType(['string'])]
    public array $mediaIds;

    /**
     * @param array{
     *   mediaIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->mediaIds = $values['mediaIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
