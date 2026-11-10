<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerOverview extends JsonSerializableType
{
    /**
     * @var Partner $partner
     */
    #[JsonProperty('partner')]
    public Partner $partner;

    /**
     * @var PartnerUsage $usage
     */
    #[JsonProperty('usage')]
    public PartnerUsage $usage;

    /**
     * @param array{
     *   partner: Partner,
     *   usage: PartnerUsage,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->partner = $values['partner'];
        $this->usage = $values['usage'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
