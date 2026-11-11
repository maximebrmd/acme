<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventWebhookDeliveriesFailing extends JsonSerializableType
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
     * @param array{
     *   endpointId: string,
     *   host: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->endpointId = $values['endpointId'];
        $this->host = $values['host'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
