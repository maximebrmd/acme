<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImageProviderSetting extends JsonSerializableType
{
    /**
     * @var ?ImageProvider $provider
     */
    #[JsonProperty('provider')]
    public ?ImageProvider $provider;

    /**
     * @param array{
     *   provider?: ?ImageProvider,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->provider = $values['provider'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
