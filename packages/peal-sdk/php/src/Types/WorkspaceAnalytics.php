<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WorkspaceAnalytics extends JsonSerializableType
{
    /**
     * @var FollowerChange $followers
     */
    #[JsonProperty('followers')]
    public FollowerChange $followers;

    /**
     * @var FollowerChange $previousFollowers
     */
    #[JsonProperty('previousFollowers')]
    public FollowerChange $previousFollowers;

    /**
     * @var bool $previousKept
     */
    #[JsonProperty('previousKept')]
    public bool $previousKept;

    /**
     * @var DashboardTotals $previousTotals
     */
    #[JsonProperty('previousTotals')]
    public DashboardTotals $previousTotals;

    /**
     * @var DashboardTotals $totals
     */
    #[JsonProperty('totals')]
    public DashboardTotals $totals;

    /**
     * @param array{
     *   followers: FollowerChange,
     *   previousFollowers: FollowerChange,
     *   previousKept: bool,
     *   previousTotals: DashboardTotals,
     *   totals: DashboardTotals,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->followers = $values['followers'];
        $this->previousFollowers = $values['previousFollowers'];
        $this->previousKept = $values['previousKept'];
        $this->previousTotals = $values['previousTotals'];
        $this->totals = $values['totals'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
