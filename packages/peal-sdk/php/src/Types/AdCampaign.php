<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdCampaign extends JsonSerializableType
{
    /**
     * @var ?int $dailyBudget An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('dailyBudget')]
    public ?int $dailyBudget;

    /**
     * @var ?string $endsAt
     */
    #[JsonProperty('endsAt')]
    public ?string $endsAt;

    /**
     * @var string $externalId
     */
    #[JsonProperty('externalId')]
    public string $externalId;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var value-of<CampaignObjective> $objective
     */
    #[JsonProperty('objective')]
    public string $objective;

    /**
     * @var string $rawStatus
     */
    #[JsonProperty('rawStatus')]
    public string $rawStatus;

    /**
     * @var ?string $startsAt
     */
    #[JsonProperty('startsAt')]
    public ?string $startsAt;

    /**
     * @var value-of<AdObjectStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $syncedAt
     */
    #[JsonProperty('syncedAt')]
    public string $syncedAt;

    /**
     * @var ?int $totalBudget An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('totalBudget')]
    public ?int $totalBudget;

    /**
     * @var PaidTotals $totals
     */
    #[JsonProperty('totals')]
    public PaidTotals $totals;

    /**
     * @param array{
     *   externalId: string,
     *   name: string,
     *   objective: value-of<CampaignObjective>,
     *   rawStatus: string,
     *   status: value-of<AdObjectStatus>,
     *   syncedAt: string,
     *   totals: PaidTotals,
     *   dailyBudget?: ?int,
     *   endsAt?: ?string,
     *   startsAt?: ?string,
     *   totalBudget?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->dailyBudget = $values['dailyBudget'] ?? null;
        $this->endsAt = $values['endsAt'] ?? null;
        $this->externalId = $values['externalId'];
        $this->name = $values['name'];
        $this->objective = $values['objective'];
        $this->rawStatus = $values['rawStatus'];
        $this->startsAt = $values['startsAt'] ?? null;
        $this->status = $values['status'];
        $this->syncedAt = $values['syncedAt'];
        $this->totalBudget = $values['totalBudget'] ?? null;
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
