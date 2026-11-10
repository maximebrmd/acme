<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ReachableAdAccount extends JsonSerializableType
{
    /**
     * @var bool $connected
     */
    #[JsonProperty('connected')]
    public bool $connected;

    /**
     * @var string $currency An ISO 4217 currency code, in capitals: `EUR`, `USD`.
     */
    #[JsonProperty('currency')]
    public string $currency;

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
     * @var ?int $spendCap An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('spendCap')]
    public ?int $spendCap;

    /**
     * @var value-of<AdAccountStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $timeZone
     */
    #[JsonProperty('timeZone')]
    public ?string $timeZone;

    /**
     * @var ?value-of<AdAccountUnsupported> $unsupported
     */
    #[JsonProperty('unsupported')]
    public ?string $unsupported;

    /**
     * @param array{
     *   connected: bool,
     *   currency: string,
     *   externalId: string,
     *   name: string,
     *   status: value-of<AdAccountStatus>,
     *   spendCap?: ?int,
     *   timeZone?: ?string,
     *   unsupported?: ?value-of<AdAccountUnsupported>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->connected = $values['connected'];
        $this->currency = $values['currency'];
        $this->externalId = $values['externalId'];
        $this->name = $values['name'];
        $this->spendCap = $values['spendCap'] ?? null;
        $this->status = $values['status'];
        $this->timeZone = $values['timeZone'] ?? null;
        $this->unsupported = $values['unsupported'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
