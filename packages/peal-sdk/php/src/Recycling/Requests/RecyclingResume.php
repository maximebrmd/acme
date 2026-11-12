<?php

namespace Peal\Recycling\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\RecyclingVariant;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class RecyclingResume extends JsonSerializableType
{
    /**
     * @var ?array<RecyclingVariant> $variants
     */
    #[JsonProperty('variants'), ArrayType([RecyclingVariant::class])]
    public ?array $variants;

    /**
     * @param array{
     *   variants?: ?array<RecyclingVariant>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->variants = $values['variants'] ?? null;
    }
}
