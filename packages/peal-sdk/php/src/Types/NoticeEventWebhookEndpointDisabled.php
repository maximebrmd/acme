<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventWebhookEndpointDisabled extends JsonSerializableType
{
    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpointId')]
    public string $endpointId;

    /**
     * @var string $host
     */
    #[JsonProperty('host')]
    public string $host;

    /**
     * @var value-of<WebhookTurnOffReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   endpointId: string,
     *   host: string,
     *   reason: value-of<WebhookTurnOffReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->endpointId = $values['endpointId'];
        $this->host = $values['host'];
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
