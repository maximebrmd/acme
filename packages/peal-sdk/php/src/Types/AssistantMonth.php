<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantMonth extends JsonSerializableType
{
    /**
     * @var int $allowance
     */
    #[JsonProperty('allowance')]
    public int $allowance;

    /**
     * @var Money $ceiling
     */
    #[JsonProperty('ceiling')]
    public Money $ceiling;

    /**
     * @var int $most
     */
    #[JsonProperty('most')]
    public int $most;

    /**
     * @var UnitPrice $price
     */
    #[JsonProperty('price')]
    public UnitPrice $price;

    /**
     * @var bool $priceConfirmed
     */
    #[JsonProperty('priceConfirmed')]
    public bool $priceConfirmed;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @var int $used
     */
    #[JsonProperty('used')]
    public int $used;

    /**
     * @param array{
     *   allowance: int,
     *   ceiling: Money,
     *   most: int,
     *   price: UnitPrice,
     *   priceConfirmed: bool,
     *   resetsAt: string,
     *   used: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowance = $values['allowance'];
        $this->ceiling = $values['ceiling'];
        $this->most = $values['most'];
        $this->price = $values['price'];
        $this->priceConfirmed = $values['priceConfirmed'];
        $this->resetsAt = $values['resetsAt'];
        $this->used = $values['used'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
