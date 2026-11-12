<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class RecyclingVariant extends JsonSerializableType
{
    /**
     * @var ?array<TextOverride> $overrides
     */
    #[JsonProperty('overrides'), ArrayType([TextOverride::class])]
    public ?array $overrides;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   text: string,
     *   overrides?: ?array<TextOverride>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->overrides = $values['overrides'] ?? null;
        $this->text = $values['text'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
