<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BillingMeter extends JsonSerializableType
{
    /**
     * @var int $allowance
     */
    #[JsonProperty('allowance')]
    public int $allowance;

    /**
     * @var int $billable
     */
    #[JsonProperty('billable')]
    public int $billable;

    /**
     * @var ?Money $ceiling
     */
    #[JsonProperty('ceiling')]
    public ?Money $ceiling;

    /**
     * @var ?Money $estimate
     */
    #[JsonProperty('estimate')]
    public ?Money $estimate;

    /**
     * @var ?value-of<SpendGroup> $group
     */
    #[JsonProperty('group')]
    public ?string $group;

    /**
     * @var value-of<Meter> $meter
     */
    #[JsonProperty('meter')]
    public string $meter;

    /**
     * @var ?int $most
     */
    #[JsonProperty('most')]
    public ?int $most;

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
     *   billable: int,
     *   meter: value-of<Meter>,
     *   price: UnitPrice,
     *   priceConfirmed: bool,
     *   resetsAt: string,
     *   used: int,
     *   ceiling?: ?Money,
     *   estimate?: ?Money,
     *   group?: ?value-of<SpendGroup>,
     *   most?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowance = $values['allowance'];
        $this->billable = $values['billable'];
        $this->ceiling = $values['ceiling'] ?? null;
        $this->estimate = $values['estimate'] ?? null;
        $this->group = $values['group'] ?? null;
        $this->meter = $values['meter'];
        $this->most = $values['most'] ?? null;
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
