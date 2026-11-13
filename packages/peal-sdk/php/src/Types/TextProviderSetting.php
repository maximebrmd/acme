<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TextProviderSetting extends JsonSerializableType
{
    /**
     * @var ?TextProvider $provider
     */
    #[JsonProperty('provider')]
    public ?TextProvider $provider;

    /**
     * @param array{
     *   provider?: ?TextProvider,
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
