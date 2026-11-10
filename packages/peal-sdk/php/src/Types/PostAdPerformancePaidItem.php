<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostAdPerformancePaidItem extends JsonSerializableType
{
    /**
     * @var AdAccount $account
     */
    #[JsonProperty('account')]
    public AdAccount $account;

    /**
     * @var int $ads
     */
    #[JsonProperty('ads')]
    public int $ads;

    /**
     * @var PaidTotals $totals
     */
    #[JsonProperty('totals')]
    public PaidTotals $totals;

    /**
     * @param array{
     *   account: AdAccount,
     *   ads: int,
     *   totals: PaidTotals,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'];
        $this->ads = $values['ads'];
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
