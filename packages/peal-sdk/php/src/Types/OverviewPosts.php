<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class OverviewPosts extends JsonSerializableType
{
    /**
     * @var int $awaitingApproval
     */
    #[JsonProperty('awaitingApproval')]
    public int $awaitingApproval;

    /**
     * @var int $failedLast7Days
     */
    #[JsonProperty('failedLast7Days')]
    public int $failedLast7Days;

    /**
     * @var bool $mayApprove
     */
    #[JsonProperty('mayApprove')]
    public bool $mayApprove;

    /**
     * @var int $scheduledNext7Days
     */
    #[JsonProperty('scheduledNext7Days')]
    public int $scheduledNext7Days;

    /**
     * @var int $unconfirmedLast7Days
     */
    #[JsonProperty('unconfirmedLast7Days')]
    public int $unconfirmedLast7Days;

    /**
     * @param array{
     *   awaitingApproval: int,
     *   failedLast7Days: int,
     *   mayApprove: bool,
     *   scheduledNext7Days: int,
     *   unconfirmedLast7Days: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->awaitingApproval = $values['awaitingApproval'];
        $this->failedLast7Days = $values['failedLast7Days'];
        $this->mayApprove = $values['mayApprove'];
        $this->scheduledNext7Days = $values['scheduledNext7Days'];
        $this->unconfirmedLast7Days = $values['unconfirmedLast7Days'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
