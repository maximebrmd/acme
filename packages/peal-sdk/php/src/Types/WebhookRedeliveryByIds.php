<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class WebhookRedeliveryByIds extends JsonSerializableType
{
    /**
     * @var array<string> $deliveryIds
     */
    #[JsonProperty('deliveryIds'), ArrayType(['string'])]
    public array $deliveryIds;

    /**
     * @param array{
     *   deliveryIds: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->deliveryIds = $values['deliveryIds'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
