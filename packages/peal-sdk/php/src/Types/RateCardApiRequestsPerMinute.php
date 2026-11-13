<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class RateCardApiRequestsPerMinute extends JsonSerializableType
{
    /**
     * @var int $onRequest
     */
    #[JsonProperty('onRequest')]
    public int $onRequest;

    /**
     * @var int $withoutPaymentMethod
     */
    #[JsonProperty('withoutPaymentMethod')]
    public int $withoutPaymentMethod;

    /**
     * @param array{
     *   onRequest: int,
     *   withoutPaymentMethod: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->onRequest = $values['onRequest'];
        $this->withoutPaymentMethod = $values['withoutPaymentMethod'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
