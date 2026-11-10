<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AccountRestrictionMediaTypesRefused extends JsonSerializableType
{
    /**
     * @var array<value-of<MediaContentType>> $contentTypes
     */
    #[JsonProperty('contentTypes'), ArrayType(['string'])]
    public array $contentTypes;

    /**
     * @param array{
     *   contentTypes: array<value-of<MediaContentType>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->contentTypes = $values['contentTypes'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
