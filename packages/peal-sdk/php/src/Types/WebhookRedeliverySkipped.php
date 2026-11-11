<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WebhookRedeliverySkipped extends JsonSerializableType
{
    /**
     * @var string $deliveryId
     */
    #[JsonProperty('deliveryId')]
    public string $deliveryId;

    /**
     * @var value-of<WebhookRedeliverySkip> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   deliveryId: string,
     *   reason: value-of<WebhookRedeliverySkip>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->deliveryId = $values['deliveryId'];
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
