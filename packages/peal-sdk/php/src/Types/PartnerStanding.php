<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerStanding extends JsonSerializableType
{
    /**
     * @var bool $canOpen
     */
    #[JsonProperty('canOpen')]
    public bool $canOpen;

    /**
     * @var ?Partner $partner
     */
    #[JsonProperty('partner')]
    public ?Partner $partner;

    /**
     * @var ?PartnerUsage $usage
     */
    #[JsonProperty('usage')]
    public ?PartnerUsage $usage;

    /**
     * @param array{
     *   canOpen: bool,
     *   partner?: ?Partner,
     *   usage?: ?PartnerUsage,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->canOpen = $values['canOpen'];
        $this->partner = $values['partner'] ?? null;
        $this->usage = $values['usage'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
