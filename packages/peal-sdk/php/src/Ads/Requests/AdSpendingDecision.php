<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Types\AdMoney;

class AdSpendingDecision extends JsonSerializableType
{
    /**
     * @var bool $enabled
     */
    #[JsonProperty('enabled')]
    public bool $enabled;

    /**
     * @var ?AdMoney $monthlyCeiling
     */
    #[JsonProperty('monthlyCeiling')]
    public ?AdMoney $monthlyCeiling;

    /**
     * @param array{
     *   enabled: bool,
     *   monthlyCeiling?: ?AdMoney,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->enabled = $values['enabled'];
        $this->monthlyCeiling = $values['monthlyCeiling'] ?? null;
    }
}
