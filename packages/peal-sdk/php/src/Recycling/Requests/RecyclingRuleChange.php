<?php

namespace Peal\Recycling\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\RecyclingVariant;
use Peal\Core\Types\ArrayType;

class RecyclingRuleChange extends JsonSerializableType
{
    /**
     * @var ?int $count
     */
    #[JsonProperty('count')]
    public ?int $count;

    /**
     * @var ?bool $paused
     */
    #[JsonProperty('paused')]
    public ?bool $paused;

    /**
     * @var ?string $until
     */
    #[JsonProperty('until')]
    public ?string $until;

    /**
     * @var ?array<RecyclingVariant> $variants
     */
    #[JsonProperty('variants'), ArrayType([RecyclingVariant::class])]
    public ?array $variants;

    /**
     * @param array{
     *   count?: ?int,
     *   paused?: ?bool,
     *   until?: ?string,
     *   variants?: ?array<RecyclingVariant>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->count = $values['count'] ?? null;
        $this->paused = $values['paused'] ?? null;
        $this->until = $values['until'] ?? null;
        $this->variants = $values['variants'] ?? null;
    }
}
