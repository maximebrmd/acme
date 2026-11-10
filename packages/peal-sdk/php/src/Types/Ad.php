<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Ad extends JsonSerializableType
{
    /**
     * @var string $adSetExternalId
     */
    #[JsonProperty('adSetExternalId')]
    public string $adSetExternalId;

    /**
     * @var string $campaignExternalId
     */
    #[JsonProperty('campaignExternalId')]
    public string $campaignExternalId;

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
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @var string $rawStatus
     */
    #[JsonProperty('rawStatus')]
    public string $rawStatus;

    /**
     * @var value-of<AdObjectStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var PaidTotals $totals
     */
    #[JsonProperty('totals')]
    public PaidTotals $totals;

    /**
     * @param array{
     *   adSetExternalId: string,
     *   campaignExternalId: string,
     *   externalId: string,
     *   name: string,
     *   rawStatus: string,
     *   status: value-of<AdObjectStatus>,
     *   totals: PaidTotals,
     *   postId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->adSetExternalId = $values['adSetExternalId'];
        $this->campaignExternalId = $values['campaignExternalId'];
        $this->externalId = $values['externalId'];
        $this->name = $values['name'];
        $this->postId = $values['postId'] ?? null;
        $this->rawStatus = $values['rawStatus'];
        $this->status = $values['status'];
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
