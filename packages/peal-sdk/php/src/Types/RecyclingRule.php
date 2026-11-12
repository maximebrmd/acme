<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class RecyclingRule extends JsonSerializableType
{
    /**
     * @var string $anchorAt
     */
    #[JsonProperty('anchorAt')]
    public string $anchorAt;

    /**
     * @var array<RecyclingComing> $coming
     */
    #[JsonProperty('coming'), ArrayType([RecyclingComing::class])]
    public array $coming;

    /**
     * @var ?int $count
     */
    #[JsonProperty('count')]
    public ?int $count;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?value-of<RecyclingEndReason> $endedReason
     */
    #[JsonProperty('endedReason')]
    public ?string $endedReason;

    /**
     * @var RecyclingInterval $every
     */
    #[JsonProperty('every')]
    public RecyclingInterval $every;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var string $lastDueAt
     */
    #[JsonProperty('lastDueAt')]
    public string $lastDueAt;

    /**
     * @var int $made
     */
    #[JsonProperty('made')]
    public int $made;

    /**
     * @var ?string $nextDueAt
     */
    #[JsonProperty('nextDueAt')]
    public ?string $nextDueAt;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @var string $sourcePostId
     */
    #[JsonProperty('sourcePostId')]
    public string $sourcePostId;

    /**
     * @var ?string $startedBy
     */
    #[JsonProperty('startedBy')]
    public ?string $startedBy;

    /**
     * @var PostOrigin $startedVia
     */
    #[JsonProperty('startedVia')]
    public PostOrigin $startedVia;

    /**
     * @var value-of<RecyclingStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var ?string $until
     */
    #[JsonProperty('until')]
    public ?string $until;

    /**
     * @var array<RecyclingRuleVariantsItem> $variants
     */
    #[JsonProperty('variants'), ArrayType([RecyclingRuleVariantsItem::class])]
    public array $variants;

    /**
     * @param array{
     *   anchorAt: string,
     *   coming: array<RecyclingComing>,
     *   createdAt: string,
     *   every: RecyclingInterval,
     *   id: string,
     *   lastDueAt: string,
     *   made: int,
     *   sourcePostId: string,
     *   startedVia: PostOrigin,
     *   status: value-of<RecyclingStatus>,
     *   timeZone: string,
     *   variants: array<RecyclingRuleVariantsItem>,
     *   count?: ?int,
     *   endedReason?: ?value-of<RecyclingEndReason>,
     *   nextDueAt?: ?string,
     *   queueId?: ?string,
     *   startedBy?: ?string,
     *   until?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->anchorAt = $values['anchorAt'];
        $this->coming = $values['coming'];
        $this->count = $values['count'] ?? null;
        $this->createdAt = $values['createdAt'];
        $this->endedReason = $values['endedReason'] ?? null;
        $this->every = $values['every'];
        $this->id = $values['id'];
        $this->lastDueAt = $values['lastDueAt'];
        $this->made = $values['made'];
        $this->nextDueAt = $values['nextDueAt'] ?? null;
        $this->queueId = $values['queueId'] ?? null;
        $this->sourcePostId = $values['sourcePostId'];
        $this->startedBy = $values['startedBy'] ?? null;
        $this->startedVia = $values['startedVia'];
        $this->status = $values['status'];
        $this->timeZone = $values['timeZone'];
        $this->until = $values['until'] ?? null;
        $this->variants = $values['variants'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
