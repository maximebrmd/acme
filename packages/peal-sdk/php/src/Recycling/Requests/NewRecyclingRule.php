<?php

namespace Peal\Recycling\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\RecyclingInterval;
use Peal\Types\RecyclingVariant;
use Peal\Core\Types\ArrayType;

class NewRecyclingRule extends JsonSerializableType
{
    /**
     * @var ?int $count
     */
    #[JsonProperty('count')]
    public ?int $count;

    /**
     * @var RecyclingInterval $every
     */
    #[JsonProperty('every')]
    public RecyclingInterval $every;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

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
     *   every: RecyclingInterval,
     *   postId: string,
     *   count?: ?int,
     *   queueId?: ?string,
     *   until?: ?string,
     *   variants?: ?array<RecyclingVariant>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'] ?? null;
        $this->every = $values['every'];
        $this->postId = $values['postId'];
        $this->queueId = $values['queueId'] ?? null;
        $this->until = $values['until'] ?? null;
        $this->variants = $values['variants'] ?? null;
    }
}
