<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventAdConnectionReconnectRequired extends JsonSerializableType
{
    /**
     * @var string $network
     */
    #[JsonProperty('network')]
    public string $network;

    /**
     * @param array{
     *   network: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->network = $values['network'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
