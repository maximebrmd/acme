<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class SignatureScopePlatform extends JsonSerializableType
{
    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @param array{
     *   platform: value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->platform = $values['platform'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
