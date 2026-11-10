<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdAccount extends JsonSerializableType
{
    /**
     * @var value-of<AdAccess> $access
     */
    #[JsonProperty('access')]
    public string $access;

    /**
     * @var ?int $amountSpent An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('amountSpent')]
    public ?int $amountSpent;

    /**
     * @var string $connectedAt
     */
    #[JsonProperty('connectedAt')]
    public string $connectedAt;

    /**
     * @var string $connectionId
     */
    #[JsonProperty('connectionId')]
    public string $connectionId;

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
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var float $minorUnitDigits
     */
    #[JsonProperty('minorUnitDigits')]
    public float $minorUnitDigits;

    /**
     * @var ?int $monthlyCeiling An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('monthlyCeiling')]
    public ?int $monthlyCeiling;

    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var value-of<AdNetwork> $network
     */
    #[JsonProperty('network')]
    public string $network;

    /**
     * @var ?int $spendCap An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
     */
    #[JsonProperty('spendCap')]
    public ?int $spendCap;

    /**
     * @var bool $spendingEnabled
     */
    #[JsonProperty('spendingEnabled')]
    public bool $spendingEnabled;

    /**
     * @var value-of<AdAccountStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var ?string $syncedAt
     */
    #[JsonProperty('syncedAt')]
    public ?string $syncedAt;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @param array{
     *   access: value-of<AdAccess>,
     *   connectedAt: string,
     *   connectionId: string,
     *   currency: string,
     *   externalId: string,
     *   id: string,
     *   minorUnitDigits: float,
     *   name: string,
     *   network: value-of<AdNetwork>,
     *   spendingEnabled: bool,
     *   status: value-of<AdAccountStatus>,
     *   timeZone: string,
     *   amountSpent?: ?int,
     *   monthlyCeiling?: ?int,
     *   spendCap?: ?int,
     *   syncedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->access = $values['access'];
        $this->amountSpent = $values['amountSpent'] ?? null;
        $this->connectedAt = $values['connectedAt'];
        $this->connectionId = $values['connectionId'];
        $this->currency = $values['currency'];
        $this->externalId = $values['externalId'];
        $this->id = $values['id'];
        $this->minorUnitDigits = $values['minorUnitDigits'];
        $this->monthlyCeiling = $values['monthlyCeiling'] ?? null;
        $this->name = $values['name'];
        $this->network = $values['network'];
        $this->spendCap = $values['spendCap'] ?? null;
        $this->spendingEnabled = $values['spendingEnabled'];
        $this->status = $values['status'];
        $this->syncedAt = $values['syncedAt'] ?? null;
        $this->timeZone = $values['timeZone'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
