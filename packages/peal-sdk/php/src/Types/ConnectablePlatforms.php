<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ConnectablePlatforms extends JsonSerializableType
{
    /**
     * @var array<value-of<InstagramConnection>> $instagramConnections
     */
    #[JsonProperty('instagramConnections'), ArrayType(['string'])]
    public array $instagramConnections;

    /**
     * @var array<value-of<Platform>> $platforms
     */
    #[JsonProperty('platforms'), ArrayType(['string'])]
    public array $platforms;

    /**
     * @param array{
     *   instagramConnections: array<value-of<InstagramConnection>>,
     *   platforms: array<value-of<Platform>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->instagramConnections = $values['instagramConnections'];
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
