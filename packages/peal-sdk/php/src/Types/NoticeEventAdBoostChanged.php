<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventAdBoostChanged extends JsonSerializableType
{
    /**
     * @var string $boostId
     */
    #[JsonProperty('boostId')]
    public string $boostId;

    /**
     * @var Money $budget
     */
    #[JsonProperty('budget')]
    public Money $budget;

    /**
     * @var float $budgetDigits
     */
    #[JsonProperty('budgetDigits')]
    public float $budgetDigits;

    /**
     * @var value-of<NoticeEventAdBoostChangedChange> $change
     */
    #[JsonProperty('change')]
    public string $change;

    /**
     * @var string $endsAt
     */
    #[JsonProperty('endsAt')]
    public string $endsAt;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var ?string $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @param array{
     *   boostId: string,
     *   budget: Money,
     *   budgetDigits: float,
     *   change: value-of<NoticeEventAdBoostChangedChange>,
     *   endsAt: string,
     *   postId: string,
     *   reason?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->boostId = $values['boostId'];
        $this->budget = $values['budget'];
        $this->budgetDigits = $values['budgetDigits'];
        $this->change = $values['change'];
        $this->endsAt = $values['endsAt'];
        $this->postId = $values['postId'];
        $this->reason = $values['reason'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
