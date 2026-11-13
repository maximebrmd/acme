<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCard extends JsonSerializableType
{
    /**
     * @var RateCardApiRequestsPerMinute $apiRequestsPerMinute
     */
    #[JsonProperty('apiRequestsPerMinute')]
    public RateCardApiRequestsPerMinute $apiRequestsPerMinute;

    /**
     * @var RateCardAssistant $assistant
     */
    #[JsonProperty('assistant')]
    public RateCardAssistant $assistant;

    /**
     * @var int $daysPerMonth
     */
    #[JsonProperty('daysPerMonth')]
    public int $daysPerMonth;

    /**
     * @var int $displayVatRate
     */
    #[JsonProperty('displayVatRate')]
    public int $displayVatRate;

    /**
     * @var RateCardMeters $meters
     */
    #[JsonProperty('meters')]
    public RateCardMeters $meters;

    /**
     * @var RateCardPrices $prices
     */
    #[JsonProperty('prices')]
    public RateCardPrices $prices;

    /**
     * @var RateCardStorage $storage
     */
    #[JsonProperty('storage')]
    public RateCardStorage $storage;

    /**
     * @var int $unverifiedCeiling
     */
    #[JsonProperty('unverifiedCeiling')]
    public int $unverifiedCeiling;

    /**
     * @var RateCardX $x
     */
    #[JsonProperty('x')]
    public RateCardX $x;

    /**
     * @param array{
     *   apiRequestsPerMinute: RateCardApiRequestsPerMinute,
     *   assistant: RateCardAssistant,
     *   daysPerMonth: int,
     *   displayVatRate: int,
     *   meters: RateCardMeters,
     *   prices: RateCardPrices,
     *   storage: RateCardStorage,
     *   unverifiedCeiling: int,
     *   x: RateCardX,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->apiRequestsPerMinute = $values['apiRequestsPerMinute'];
        $this->assistant = $values['assistant'];
        $this->daysPerMonth = $values['daysPerMonth'];
        $this->displayVatRate = $values['displayVatRate'];
        $this->meters = $values['meters'];
        $this->prices = $values['prices'];
        $this->storage = $values['storage'];
        $this->unverifiedCeiling = $values['unverifiedCeiling'];
        $this->x = $values['x'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
