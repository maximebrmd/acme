<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ConnectablePlatforms extends JsonSerializableType
{
    /**
     * @var array<value-of<Platform>> $platforms
     */
    #[JsonProperty('platforms'), ArrayType(['string'])]
    public array $platforms;

    /**
     * @param array{
     *   platforms: array<value-of<Platform>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->platforms = $values['platforms'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
