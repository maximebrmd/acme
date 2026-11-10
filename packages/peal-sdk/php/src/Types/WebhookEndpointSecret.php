<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WebhookEndpointSecret extends JsonSerializableType
{
    /**
     * @var WebhookEndpoint $endpoint
     */
    #[JsonProperty('endpoint')]
    public WebhookEndpoint $endpoint;

    /**
     * @var string $secret
     */
    #[JsonProperty('secret')]
    public string $secret;

    /**
     * @param array{
     *   endpoint: WebhookEndpoint,
     *   secret: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->endpoint = $values['endpoint'];
        $this->secret = $values['secret'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
