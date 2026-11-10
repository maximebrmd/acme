<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CreatedPartnerKey extends JsonSerializableType
{
    /**
     * @var string $key
     */
    #[JsonProperty('key')]
    public string $key;

    /**
     * @var PartnerKey $partnerKey
     */
    #[JsonProperty('partnerKey')]
    public PartnerKey $partnerKey;

    /**
     * @param array{
     *   key: string,
     *   partnerKey: PartnerKey,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->key = $values['key'];
        $this->partnerKey = $values['partnerKey'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
